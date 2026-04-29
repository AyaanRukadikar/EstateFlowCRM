import { AppLayout } from "@/components/AppLayout";
import { KpiCard } from "@/components/KpiCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Building2, Users, Handshake, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { useDashboardStats } from "@/hooks/useData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your real estate business</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <KpiCard title="Total Properties" value={String(stats?.totalProperties ?? 0)} icon={<Building2 className="w-5 h-5" />} />
            <KpiCard title="Total Leads" value={String(stats?.totalLeads ?? 0)} icon={<Users className="w-5 h-5" />} />
            <KpiCard title="Active Deals" value={String(stats?.activeDeals ?? 0)} icon={<Handshake className="w-5 h-5" />} />
            <KpiCard title="Revenue" value={formatCurrency(stats?.totalRevenue ?? 0)} icon={<DollarSign className="w-5 h-5" />} />
          </>
        )}
      </div>

      {/* Chart */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="text-sm font-semibold text-foreground mb-4">Lead Pipeline</h3>
        {isLoading ? (
          <Skeleton className="h-60 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats?.pipelineData ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="stage" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Activity */}
      <div className="bg-card rounded-xl border border-border p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ActivityFeed activities={stats?.activities ?? []} />
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
