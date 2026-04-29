import { AppLayout } from "@/components/AppLayout";
import { useLeads, useDeals, useProperties } from "@/hooks/useData";
import { useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText } from "lucide-react";
import { exportToCsv } from "@/lib/csv";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--warning))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
];

const Reports = () => {
  const { data: leads = [], isLoading: lLoad } = useLeads();
  const { data: deals = [], isLoading: dLoad } = useDeals();
  const { data: properties = [], isLoading: pLoad } = useProperties();
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const isLoading = lLoad || dLoad || pLoad;

  // Deals closed per month (last 12 months)
  const dealsByMonth = useMemo(() => {
    const buckets: Record<string, { month: string; closed: number; revenue: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = startOfMonth(subMonths(new Date(), i));
      const key = format(d, "yyyy-MM");
      buckets[key] = { month: format(d, "MMM yy"), closed: 0, revenue: 0 };
    }
    deals.filter((d) => d.status === "Won").forEach((d) => {
      const key = format(new Date(d.updated_at), "yyyy-MM");
      if (buckets[key]) {
        buckets[key].closed += 1;
        buckets[key].revenue += Number(d.value ?? 0);
      }
    });
    return Object.values(buckets);
  }, [deals]);

  // Conversion funnel
  const funnel = useMemo(() => {
    const stages = ["New", "Contacted", "Site Visit Scheduled", "Negotiation", "Closed"];
    return stages.map((s) => ({ stage: s, count: leads.filter((l) => l.stage === s).length }));
  }, [leads]);

  // Lead source breakdown
  const sources = useMemo(() => {
    const map: Record<string, number> = {};
    leads.forEach((l) => {
      const k = l.source || "Unknown";
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [leads]);

  // Property status mix
  const propertyMix = useMemo(() => {
    const map: Record<string, number> = {};
    properties.forEach((p) => {
      map[p.status] = (map[p.status] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [properties]);

  const totalRevenue = deals.filter((d) => d.status === "Won").reduce((s, d) => s + Number(d.value ?? 0), 0);
  const wonCount = deals.filter((d) => d.status === "Won").length;
  const conversionRate = leads.length > 0 ? ((funnel[funnel.length - 1].count / leads.length) * 100).toFixed(1) : "0";

  const handleExportCsv = () => {
    exportToCsv("monthly-revenue", dealsByMonth.map((m) => ({
      Month: m.month, "Deals Closed": m.closed, Revenue: m.revenue,
    })));
  };

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background")
          ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--background")})`
          : "#ffffff",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      pdf.save(`estateflow-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Report exported");
    } catch (e: any) {
      toast.error(e.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Performance overview across the business</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
          <Button onClick={handleExportPdf} disabled={exporting}>
            <FileText className="w-4 h-4 mr-2" />{exporting ? "Generating…" : "Export PDF"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[600px] w-full rounded-xl" />
      ) : (
        <div ref={reportRef} className="space-y-6 bg-background p-2">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="text-xs text-muted-foreground mb-1">Total Revenue (Won)</div>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="text-xs text-muted-foreground mb-1">Deals Won</div>
              <div className="text-2xl font-bold">{wonCount}</div>
            </div>
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="text-xs text-muted-foreground mb-1">Lead → Closed</div>
              <div className="text-2xl font-bold">{conversionRate}%</div>
            </div>
          </div>

          {/* Revenue trend */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-semibold mb-4">Revenue — last 12 months</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dealsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Funnel */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="text-sm font-semibold mb-4">Conversion Funnel</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnel} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <YAxis dataKey="stage" type="category" width={140} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Two donuts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-sm font-semibold mb-4">Lead Sources</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={sources} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {sources.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-sm font-semibold mb-4">Property Status</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={propertyMix} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {propertyMix.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Reports;
