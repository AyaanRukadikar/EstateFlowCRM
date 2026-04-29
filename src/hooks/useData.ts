import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// ─── Properties ───
export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"properties">[];
    },
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (property: TablesInsert<"properties">) => {
      const { data, error } = await supabase.from("properties").insert(property).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"properties"> & { id: string }) => {
      const { data, error } = await supabase.from("properties").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

// ─── Leads ───
export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"leads">[];
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: TablesInsert<"leads">) => {
      const { data, error } = await supabase.from("leads").insert(lead).select().single();
      if (error) throw error;

      // Fire-and-forget: notify the assigned agent via edge function
      if (data.email || data.assigned_agent_id) {
        supabase.functions.invoke("notify-lead-assignment", {
          body: {
            lead_id: data.id,
            lead_name: data.name,
            agent_email: data.email, // Will be overridden by the edge function if agent profile lookup is implemented
          },
        }).catch(() => {}); // Non-blocking
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"leads"> & { id: string }) => {
      const { data, error } = await supabase.from("leads").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

// ─── Deals ───
export function useDeals() {
  return useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"deals">[];
    },
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (deal: TablesInsert<"deals">) => {
      const { data, error } = await supabase.from("deals").insert(deal).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"deals"> & { id: string }) => {
      const { data, error } = await supabase.from("deals").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

// ─── Activities ───
export function useActivities() {
  return useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"activities">[];
    },
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (activity: TablesInsert<"activities">) => {
      const { data, error } = await supabase.from("activities").insert(activity).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activities"] }),
  });
}

// ─── Profile ───
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (updates: { full_name?: string; phone?: string | null; avatar_url?: string | null }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// ─── Dashboard Stats ───
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [propertiesRes, leadsRes, dealsRes, activitiesRes] = await Promise.all([
        supabase.from("properties").select("id, status, price", { count: "exact" }),
        supabase.from("leads").select("id, stage, budget", { count: "exact" }),
        supabase.from("deals").select("id, status, value", { count: "exact" }),
        supabase.from("activities").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const properties = propertiesRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const deals = dealsRes.data ?? [];
      const activities = activitiesRes.data ?? [];

      const totalRevenue = deals
        .filter((d) => d.status === "Won")
        .reduce((sum, d) => sum + (d.value ?? 0), 0);

      const activeDeals = deals.filter((d) => d.status === "In Progress").length;

      const pipelineData = [
        { stage: "New", count: leads.filter((l) => l.stage === "New").length },
        { stage: "Contacted", count: leads.filter((l) => l.stage === "Contacted").length },
        { stage: "Site Visit", count: leads.filter((l) => l.stage === "Site Visit Scheduled").length },
        { stage: "Negotiation", count: leads.filter((l) => l.stage === "Negotiation").length },
        { stage: "Closed", count: leads.filter((l) => l.stage === "Closed").length },
      ];

      return {
        totalProperties: properties.length,
        totalLeads: leads.length,
        activeDeals,
        totalRevenue,
        pipelineData,
        activities: activities as Tables<"activities">[],
      };
    },
  });
}
