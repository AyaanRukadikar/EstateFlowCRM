import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "sales_manager" | "agent";

export function useUserRole() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      const roles = (data ?? []).map((r) => r.role as AppRole);
      // Highest privilege wins
      if (roles.includes("admin")) return "admin" as AppRole;
      if (roles.includes("sales_manager")) return "sales_manager" as AppRole;
      return "agent" as AppRole;
    },
  });

  return {
    role: query.data,
    isAdmin: query.data === "admin",
    isManager: query.data === "sales_manager" || query.data === "admin",
    loading: query.isLoading,
  };
}
