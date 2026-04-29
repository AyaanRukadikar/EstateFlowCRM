import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { leadSchema, type LeadFormValues } from "@/lib/schemas";
import { useCreateLead, useUpdateLead } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useEffect } from "react";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Tables<"leads"> | null;
}

export function LeadFormDialog({ open, onOpenChange, lead }: Props) {
  const { user } = useAuth();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const isEdit = !!lead;

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: "", email: "", phone: "", stage: "New", source: "", budget: null, property_interest: "" },
  });

  useEffect(() => {
    if (lead) {
      reset({ name: lead.name, email: lead.email, phone: lead.phone, stage: lead.stage as any, source: lead.source, budget: lead.budget, property_interest: lead.property_interest });
    } else {
      reset({ name: "", email: "", phone: "", stage: "New", source: "", budget: null, property_interest: "" });
    }
  }, [lead, reset]);

  const onSubmit = async (values: LeadFormValues) => {
    try {
      const cleanValues = {
        ...values,
        email: values.email || null,
        phone: values.phone || null,
        source: values.source || null,
        property_interest: values.property_interest || null,
      };
      if (isEdit && lead) {
        await updateLead.mutateAsync({ id: lead.id, ...cleanValues });
        toast.success("Lead updated!");
      } else {
        await createLead.mutateAsync({ name: values.name, email: cleanValues.email, phone: cleanValues.phone, stage: values.stage, source: cleanValues.source, budget: values.budget ?? null, property_interest: cleanValues.property_interest, assigned_agent_id: user!.id });
        toast.success("Lead created!");
      }
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Lead" : "Add Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name")} placeholder="John Smith" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="john@email.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} placeholder="+1 555-0101" />
            </div>
            <div className="space-y-1.5">
              <Label>Stage</Label>
              <Select value={watch("stage")} onValueChange={(v) => setValue("stage", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Site Visit Scheduled">Site Visit Scheduled</SelectItem>
                  <SelectItem value="Negotiation">Negotiation</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source">Source</Label>
              <Input id="source" {...register("source")} placeholder="Website, Referral..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget ($)</Label>
              <Input id="budget" type="number" {...register("budget")} placeholder="500000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="property_interest">Property Interest</Label>
              <Input id="property_interest" {...register("property_interest")} placeholder="Skyline Penthouse" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createLead.isPending || updateLead.isPending}>
              {createLead.isPending || updateLead.isPending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
