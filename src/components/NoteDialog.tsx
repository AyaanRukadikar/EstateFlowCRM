import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "lead" | "property" | "deal";
  entityId: string;
  entityLabel: string;
}

export function NoteDialog({ open, onOpenChange, entityType, entityId, entityLabel }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["notes", entityType, entityId],
    enabled: open && !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Tables<"notes">[];
    },
  });

  const createNote = useMutation({
    mutationFn: async () => {
      if (!content.trim()) throw new Error("Note cannot be empty");
      const { error } = await supabase.from("notes").insert({
        content: content.trim(),
        entity_type: entityType,
        entity_id: entityId,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["notes", entityType, entityId] });
      toast.success("Note added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", entityType, entityId] });
      toast.success("Note deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Notes — {entityLabel}
          </DialogTitle>
        </DialogHeader>

        {/* Add note */}
        <div className="space-y-2">
          <Label htmlFor="note-content">New Note</Label>
          <Textarea
            id="note-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your note here…"
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => createNote.mutate()}
              disabled={createNote.isPending || !content.trim()}
            >
              {createNote.isPending ? "Saving…" : "Add Note"}
            </Button>
          </div>
        </div>

        {/* Notes timeline */}
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="relative bg-muted/50 rounded-lg p-3 group"
              >
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                <span className="text-[11px] text-muted-foreground mt-1.5 block">
                  {new Date(note.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                  onClick={() => deleteNote.mutate(note.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
