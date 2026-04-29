import { AppLayout } from "@/components/AppLayout";
import { useLeads, useDeleteLead, useUpdateLead, useCreateDeal } from "@/hooks/useData";
import { formatCurrency } from "@/lib/format";
import { exportToCsv } from "@/lib/csv";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Mail, DollarSign, Download, Pencil, Trash2, Sparkles, Flame, FileText, ArrowRightCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadFormDialog } from "@/components/LeadFormDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { NoteDialog } from "@/components/NoteDialog";
import { useState } from "react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRealtimeLeads } from "@/hooks/useRealtimeLeads";
import { useAuth } from "@/hooks/useAuth";

const stages = ["New", "Contacted", "Site Visit Scheduled", "Negotiation", "Closed"] as const;

const stageColors: Record<string, string> = {
  New: "bg-info/10 text-info border-info/20",
  Contacted: "bg-primary/10 text-primary border-primary/20",
  "Site Visit Scheduled": "bg-warning/10 text-warning border-warning/20",
  Negotiation: "bg-destructive/10 text-destructive border-destructive/20",
  Closed: "bg-success/10 text-success border-success/20",
};

const scoreColors: Record<string, string> = {
  hot: "bg-destructive/15 text-destructive border-destructive/30",
  warm: "bg-warning/15 text-warning border-warning/30",
  cold: "bg-info/15 text-info border-info/30",
};

const Leads = () => {
  useRealtimeLeads();
  const { user } = useAuth();
  const { data: leads = [], isLoading } = useLeads();
  const deleteLead = useDeleteLead();
  const updateLead = useUpdateLead();
  const createDeal = useCreateDeal();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editLead, setEditLead] = useState<Tables<"leads"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tables<"leads"> | null>(null);
  const [noteTarget, setNoteTarget] = useState<Tables<"leads"> | null>(null);
  const [hotOnly, setHotOnly] = useState(false);
  const [scoringId, setScoringId] = useState<string | null>(null);

  const visibleLeads = hotOnly ? leads.filter((l) => (l as any).score_label === "hot") : leads;
  const leadsByStage = stages.map((stage) => ({
    stage,
    leads: visibleLeads.filter((l) => l.stage === stage),
  }));

  const handleExport = () => {
    exportToCsv("leads", leads.map((l) => ({
      Name: l.name, Email: l.email ?? "", Phone: l.phone ?? "", Stage: l.stage,
      Source: l.source ?? "", Budget: l.budget ?? "", "Property Interest": l.property_interest ?? "", Created: l.created_at,
    })));
  };

  const handleEdit = (lead: Tables<"leads">) => {
    setEditLead(lead);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditLead(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLead.mutateAsync(deleteTarget.id);
      toast.success("Lead deleted!");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleScore = async (lead: Tables<"leads">) => {
    setScoringId(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("score-lead", {
        body: { lead_id: lead.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Scored: ${(data as any).label.toUpperCase()} (${(data as any).score})`);
      qc.invalidateQueries({ queryKey: ["leads"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to score lead");
    } finally {
      setScoringId(null);
    }
  };

  const handleConvertToDeal = async (lead: Tables<"leads">) => {
    try {
      await createDeal.mutateAsync({
        lead_name: lead.name,
        property_title: lead.property_interest || "TBD",
        value: lead.budget ?? 0,
        status: "In Progress",
        expected_close: null,
        lead_id: lead.id,
        agent_id: user!.id,
      });
      toast.success(`Deal created from lead "${lead.name}"`);
      qc.invalidateQueries({ queryKey: ["deals"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination } = result;
    if (!destination) return;

    const newStage = destination.droppableId;
    const lead = leads.find((l) => l.id === draggableId);
    if (!lead || lead.stage === newStage) return;

    try {
      await updateLead.mutateAsync({ id: lead.id, stage: newStage });
      toast.success(`Moved "${lead.name}" to ${newStage}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads Pipeline</h1>
          <p className="page-subtitle">{leads.length} leads across all stages</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={hotOnly ? "default" : "outline"}
            onClick={() => setHotOnly((v) => !v)}
          >
            <Flame className="w-4 h-4 mr-2" />Hot only
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={leads.length === 0}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
          <Button onClick={() => { setEditLead(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />Add Lead
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-96 min-w-[280px] flex-1 rounded-xl" />)}
        </div>
      ) : (
        <TooltipProvider>
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {leadsByStage.map(({ stage, leads: stageLeads }) => (
              <Droppable key={stage} droppableId={stage}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "kanban-column min-w-[280px] flex-1 transition-colors",
                      snapshot.isDraggingOver && "bg-primary/5 border-2 border-dashed border-primary/30"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{stage}</h3>
                        <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {stageLeads.map((lead, index) => {
                        const score = (lead as any).score as number | null;
                        const label = (lead as any).score_label as string | null;
                        const reason = (lead as any).score_reason as string | null;
                        const next = (lead as any).next_action as string | null;
                        return (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "kanban-card group",
                                snapshot.isDragging && "shadow-lg ring-2 ring-primary/20 rotate-1"
                              )}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm text-foreground">{lead.name}</h4>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Score with AI"
                                    disabled={scoringId === lead.id}
                                    onClick={() => handleScore(lead)}
                                  >
                                    <Sparkles className={cn("w-3 h-3", scoringId === lead.id && "animate-pulse")} />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Convert to Deal"
                                    onClick={() => handleConvertToDeal(lead)}
                                  >
                                    <ArrowRightCircle className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" title="Notes" onClick={() => setNoteTarget(lead)}>
                                    <FileText className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEdit(lead)}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive" onClick={() => setDeleteTarget(lead)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              {lead.property_interest && <p className="text-xs text-muted-foreground mb-2">{lead.property_interest}</p>}
                              <div className="space-y-1.5">
                                {lead.email && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Mail className="w-3 h-3" /> {lead.email}
                                  </div>
                                )}
                                {lead.budget && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <DollarSign className="w-3 h-3" /> Budget: {formatCurrency(lead.budget)}
                                  </div>
                                )}
                              </div>
                              {label && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="mt-2">
                                      <Badge className={cn("text-[10px] border", scoreColors[label])}>
                                        {label.toUpperCase()} · {score}
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-xs font-medium mb-1">{reason}</p>
                                    {next && <p className="text-xs text-muted-foreground">→ {next}</p>}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground">{lead.source ?? "—"}</span>
                                <Badge className={cn("text-[10px] border", stageColors[lead.stage])}>{lead.stage}</Badge>
                              </div>
                            </div>
                          )}
                        </Draggable>
                        );
                      })}
                      {provided.placeholder}
                      {stageLeads.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-8">No leads</p>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
        </TooltipProvider>
      )}

      <LeadFormDialog open={formOpen} onOpenChange={handleFormClose} lead={editLead} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Lead"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleteLead.isPending}
      />
      <NoteDialog
        open={!!noteTarget}
        onOpenChange={(open) => !open && setNoteTarget(null)}
        entityType="lead"
        entityId={noteTarget?.id ?? ""}
        entityLabel={noteTarget?.name ?? ""}
      />
    </AppLayout>
  );
};

export default Leads;
