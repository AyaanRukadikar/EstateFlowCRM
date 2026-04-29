import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lead_id, agent_email, lead_name } = await req.json();
    if (!lead_id || !agent_email) {
      return new Response(JSON.stringify({ error: "lead_id and agent_email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — skipping email notification");
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "RESEND_API_KEY not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EstateFlow CRM <notifications@estateflow.app>",
        to: [agent_email],
        subject: `New Lead Assigned: ${lead_name || "Unknown"}`,
        html: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f8fafb; border-radius: 12px;">
            <h2 style="margin: 0 0 8px; color: #1a1a2e;">🏠 New Lead Assigned</h2>
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              A new lead <strong>${lead_name || "a client"}</strong> has been assigned to you in EstateFlow CRM.
            </p>
            <p style="color: #555; font-size: 14px;">
              Log in to view details and take action.
            </p>
            <a href="${Deno.env.get("SITE_URL") || "https://estateflow.app"}/leads"
               style="display: inline-block; margin-top: 16px; padding: 10px 24px; background: #2a9d8f; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
              View Lead
            </a>
            <p style="margin-top: 24px; color: #999; font-size: 11px;">
              This is an automated notification from EstateFlow CRM.
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", emailRes.status, errText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-lead-assignment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
