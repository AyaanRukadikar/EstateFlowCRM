import { AppLayout } from "@/components/AppLayout";
import { useDeals, useDeleteDeal } from "@/hooks/useData";
import { formatFullCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, Download, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { DealFormDialog } from "@/components/DealFormDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { NoteDialog } from "@/components/NoteDialog";
import { Pagination } from "@/components/Pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { exportToCsv } from "@/lib/csv";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  "In Progress": "bg-info/10 text-info",
  Won: "bg-success/10 text-success",
  Lost: "bg-destructive/10 text-destructive",
};

const Deals = () => {
  const { data: deals = [], isLoading } = useDeals();
  const deleteDeal = useDeleteDeal();
  const [formOpen, setFormOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<Tables<"deals"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tables<"deals"> | null>(null);
  const [noteTarget, setNoteTarget] = useState<Tables<"deals"> | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      const matchSearch = d.lead_name.toLowerCase().includes(debouncedSearch.toLowerCase()) || d.property_title.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchStatus = statusFilter === "all" || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [deals, debouncedSearch, statusFilter]);

  useMemo(() => setPage(1), [debouncedSearch, statusFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalValue = filtered.reduce((s, d) => s + (d.value ?? 0), 0);

  const handleExport = () => {
    exportToCsv("deals", filtered.map((d) => ({
      Lead: d.lead_name, Property: d.property_title, Value: d.value, Status: d.status,
      "Expected Close": d.expected_close ?? "", Created: d.created_at,
    })));
  };

  const handleEdit = (deal: Tables<"deals">) => {
    setEditDeal(deal);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditDeal(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDeal.mutateAsync(deleteTarget.id);
      toast.success("Deal deleted!");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Deals</h1>
          <p className="page-subtitle">{filtered.length} deals · Total pipeline: {formatFullCurrency(totalValue)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
          <Button onClick={() => { setEditDeal(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search deals..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Won">Won</SelectItem>
            <SelectItem value="Lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No deals found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected Close</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((deal) => (
                <TableRow key={deal.id} className="animate-fade-in group">
                  <TableCell className="font-medium">{deal.lead_name}</TableCell>
                  <TableCell className="text-muted-foreground">{deal.property_title}</TableCell>
                  <TableCell className="font-semibold">{formatFullCurrency(deal.value)}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-xs", statusColors[deal.status])}>{deal.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {deal.expected_close ? new Date(deal.expected_close).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Notes" onClick={() => setNoteTarget(deal)}>
                        <FileText className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(deal)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteTarget(deal)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} totalCount={filtered.length} onPageChange={setPage} />

      <DealFormDialog open={formOpen} onOpenChange={handleFormClose} deal={editDeal} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Deal"
        description={`Are you sure you want to delete the deal for "${deleteTarget?.lead_name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleteDeal.isPending}
      />
      <NoteDialog
        open={!!noteTarget}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        entityType="deal"
        entityId={noteTarget?.id ?? ""}
        entityLabel={noteTarget?.lead_name ?? ""}
      />
    </AppLayout>
  );
};

export default Deals;
