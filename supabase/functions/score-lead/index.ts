import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lead_id } = await req.json();
    if (!lead_id || typeof lead_id !== "string") {
      return new Response(JSON.stringify({ error: "lead_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load lead via user-scoped client (RLS enforces ownership)
    const { data: lead, error: leadErr } = await userClient
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .maybeSingle();
    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: leadErr?.message ?? "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull a bit of context: deals + recent activities
    const [{ data: deals }, { data: activities }] = await Promise.all([
      userClient.from("deals").select("status, value, expected_close").eq("lead_id", lead_id),
      userClient.from("activities").select("type, message, created_at")
        .eq("related_entity_id", lead_id).order("created_at", { ascending: false }).limit(10),
    ]);

    // Use OpenAI-compatible endpoint or fall back to a simple heuristic
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    let args: { score: number; label: string; reason: string; next_action: string };

    if (OPENAI_API_KEY) {
      const systemPrompt = `You are a real estate sales analyst. Score the lead 0-100 based on signals like budget, stage progression, source quality, engagement (deals/activities), and recency. Provide a concise reason and a single concrete next action the agent should take. Be honest — most leads are not "hot".`;

      const userPrompt = JSON.stringify({
        lead: {
          name: lead.name,
          stage: lead.stage,
          source: lead.source,
          budget: lead.budget,
          property_interest: lead.property_interest,
          created_at: lead.created_at,
        },
        deals: deals ?? [],
        recent_activities: activities ?? [],
      });

      const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "set_lead_score",
                description: "Return the scored result for the lead.",
                parameters: {
                  type: "object",
                  properties: {
                    score: { type: "integer", minimum: 0, maximum: 100 },
                    label: { type: "string", enum: ["hot", "warm", "cold"] },
                    reason: { type: "string", description: "1-2 sentences." },
                    next_action: { type: "string", description: "Single concrete action." },
                  },
                  required: ["score", "label", "reason", "next_action"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "set_lead_score" } },
        }),
      });

      if (!aiRes.ok) {
        const t = await aiRes.text();
        console.error("AI error:", aiRes.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        return new Response(JSON.stringify({ error: "AI returned no structured result" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      args = JSON.parse(toolCall.function.arguments);
    } else {
      // Simple heuristic fallback when no AI key is configured
      let score = 30;
      if (lead.budget && lead.budget > 100000) score += 20;
      if (lead.stage === "Negotiation") score += 25;
      else if (lead.stage === "Site Visit Scheduled") score += 15;
      else if (lead.stage === "Contacted") score += 10;
      if ((deals ?? []).length > 0) score += 15;
      if ((activities ?? []).length > 3) score += 10;
      score = Math.min(100, score);

      const label = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
      args = {
        score,
        label,
        reason: `Heuristic score based on stage (${lead.stage}), budget ($${lead.budget ?? 0}), and engagement.`,
        next_action: score >= 70 ? "Schedule a follow-up call today" : score >= 40 ? "Send a personalized property list" : "Add to nurture email sequence",
      };
    }

    // Persist via service role (bypasses RLS but we already validated ownership above)
    const { error: updErr } = await supabase
      .from("leads")
      .update({
        score: args.score,
        score_label: args.label,
        score_reason: args.reason,
        next_action: args.next_action,
        scored_at: new Date().toISOString(),
      })
      .eq("id", lead_id);

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, ...args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-lead error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
