import { AppLayout } from "@/components/AppLayout";
import { useProperties, useDeleteProperty } from "@/hooks/useData";
import { formatFullCurrency } from "@/lib/format";
import { exportToCsv } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Plus, MapPin, BedDouble, Maximize2, Download, Pencil, Trash2, FileText } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyFormDialog } from "@/components/PropertyFormDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { NoteDialog } from "@/components/NoteDialog";
import { Pagination } from "@/components/Pagination";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const PAGE_SIZE = 12;

const statusClasses: Record<string, string> = {
  Available: "status-available",
  Sold: "status-sold",
  "Under Negotiation": "status-negotiation",
};

const Properties = () => {
  const { data: properties = [], isLoading } = useProperties();
  const deleteProperty = useDeleteProperty();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editProperty, setEditProperty] = useState<Tables<"properties"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tables<"properties"> | null>(null);
  const [noteTarget, setNoteTarget] = useState<Tables<"properties"> | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.location.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchType = typeFilter === "all" || p.type === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [properties, debouncedSearch, statusFilter, typeFilter]);

  // Reset page when filters change
  useMemo(() => setPage(1), [debouncedSearch, statusFilter, typeFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleExport = () => {
    exportToCsv("properties", filtered.map((p) => ({
      Title: p.title, Location: p.location, Price: p.price, Status: p.status, Type: p.type,
      Bedrooms: p.bedrooms ?? "", Area: p.area ?? "", Created: p.created_at,
    })));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProperty.mutateAsync(deleteTarget.id);
      toast.success("Property deleted!");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleEdit = (property: Tables<"properties">) => {
    setEditProperty(property);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditProperty(null);
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-subtitle">{filtered.length} properties found</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
          <Button onClick={() => { setEditProperty(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Add Property
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search properties..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Sold">Sold</SelectItem>
            <SelectItem value="Under Negotiation">Under Negotiation</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Apartment">Apartment</SelectItem>
            <SelectItem value="Villa">Villa</SelectItem>
            <SelectItem value="Commercial">Commercial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No properties found. Add your first property!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginated.map((property) => (
              <div key={property.id} className="bg-card rounded-xl border border-border overflow-hidden transition-all duration-200 hover:border-primary/20 animate-fade-in group" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="h-40 bg-muted flex items-center justify-center relative overflow-hidden">
                  {property.images && property.images.length > 0 ? (
                    <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
                  ) : (
                    <Building2Icon type={property.type} />
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setNoteTarget(property)}>
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => handleEdit(property)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="secondary" className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground" onClick={() => setDeleteTarget(property)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground">{property.title}</h3>
                    <Badge className={cn("text-xs font-medium", statusClasses[property.status])}>{property.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-3.5 h-3.5" />{property.location}
                  </div>
                  <p className="text-xl font-bold text-foreground mb-3">{formatFullCurrency(property.price)}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">{property.type}</Badge>
                    {property.bedrooms && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {property.bedrooms} beds</span>}
                    {property.area && <span className="flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5" /> {property.area} sqft</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} totalCount={filtered.length} onPageChange={setPage} />
        </>
      )}

      <PropertyFormDialog open={formOpen} onOpenChange={handleFormClose} property={editProperty} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Property"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleteProperty.isPending}
      />
      <NoteDialog
        open={!!noteTarget}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        entityType="property"
        entityId={noteTarget?.id ?? ""}
        entityLabel={noteTarget?.title ?? ""}
      />
    </AppLayout>
  );
};

function Building2Icon({ type }: { type: string }) {
  const colors: Record<string, string> = { Apartment: "text-info", Villa: "text-success", Commercial: "text-warning" };
  return (
    <div className={cn("flex flex-col items-center gap-2", colors[type] || "text-muted-foreground")}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
      </svg>
      <span className="text-xs font-medium">{type}</span>
    </div>
  );
}

export default Properties;
