import type { Tables } from "@/integrations/supabase/types";
import { Users, Building2, Handshake, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, typeof Users> = {
  lead: Users,
  property: Building2,
  deal: Handshake,
  note: FileText,
};

const typeColors: Record<string, string> = {
  lead: "text-info bg-info/10",
  property: "text-primary bg-primary/10",
  deal: "text-success bg-success/10",
  note: "text-warning bg-warning/10",
};

interface Props {
  activities: Tables<"activities">[];
}

export function ActivityFeed({ activities }: Props) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No activity yet.</p>;
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = typeIcons[activity.type] ?? FileText;
        const color = typeColors[activity.type] ?? "text-muted-foreground bg-muted";
        return (
          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{activity.message}</p>
              <span className="text-xs text-muted-foreground">
                {new Date(activity.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
