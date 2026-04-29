import { AppLayout } from "@/components/AppLayout";
import { ActivityFeed } from "@/components/ActivityFeed";
import { useActivities } from "@/hooks/useData";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/Pagination";
import { useState, useMemo } from "react";

const PAGE_SIZE = 25;

const Activities = () => {
  const { data: activities = [], isLoading } = useActivities();
  const [page, setPage] = useState(1);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return activities.slice(start, start + PAGE_SIZE);
  }, [activities, page]);

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Log</h1>
          <p className="page-subtitle">Track all actions across the CRM · {activities.length} entries</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <ActivityFeed activities={paginated} />
        )}
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} totalCount={activities.length} onPageChange={setPage} />
    </AppLayout>
  );
};

export default Activities;
