import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dealSchema, type DealFormValues } from "@/lib/schemas";
import { useCreateDeal, useUpdateDeal, useLeads, useProperties } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Tables<"deals"> | null;
}

export function DealFormDialog({ open, onOpenChange, deal }: Props) {
  const { user } = useAuth();
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const { data: leads = [] } = useLeads();
  const { data: properties = [] } = useProperties();
  const isEdit = !!deal;

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: { lead_name: "", property_title: "", value: 0, status: "In Progress", expected_close: "", lead_id: null },
  });

  useEffect(() => {
    if (deal) {
      reset({
        lead_name: deal.lead_name,
        property_title: deal.property_title,
        value: deal.value,
        status: deal.status as any,
        expected_close: deal.expected_close ?? "",
        lead_id: deal.lead_id ?? null,
      });
    } else {
      reset({ lead_name: "", property_title: "", value: 0, status: "In Progress", expected_close: "", lead_id: null });
    }
  }, [deal, reset]);

  const onSubmit = async (values: DealFormValues) => {
    try {
      if (isEdit && deal) {
        await updateDeal.mutateAsync({
          id: deal.id,
          lead_name: values.lead_name,
          property_title: values.property_title,
          value: values.value,
          status: values.status,
          expected_close: values.expected_close || null,
          lead_id: values.lead_id || null,
        });
        toast.success("Deal updated!");
      } else {
        await createDeal.mutateAsync({
          lead_name: values.lead_name,
          property_title: values.property_title,
          value: values.value,
          status: values.status,
          expected_close: values.expected_close || null,
          lead_id: values.lead_id || null,
          agent_id: user!.id,
        });
        toast.success("Deal created!");
      }
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleLeadSelect = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setValue("lead_name", lead.name);
      setValue("lead_id", lead.id);
      if (lead.budget) setValue("value", lead.budget);
    }
  };

  const handlePropertySelect = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId);
    if (property) {
      setValue("property_title", property.title);
      if (!watch("value")) setValue("value", property.price);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Deal" : "New Deal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {leads.length > 0 && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Select Lead (optional)</Label>
                <Select onValueChange={handleLeadSelect}>
                  <SelectTrigger><SelectValue placeholder="Pick a lead..." /></SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="lead_name">Lead Name *</Label>
              <Input id="lead_name" {...register("lead_name")} placeholder="Client name" />
              {errors.lead_name && <p className="text-xs text-destructive">{errors.lead_name.message}</p>}
            </div>
            {properties.length > 0 && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Select Property (optional)</Label>
                <Select onValueChange={handlePropertySelect}>
                  <SelectTrigger><SelectValue placeholder="Pick a property..." /></SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="property_title">Property Title *</Label>
              <Input id="property_title" {...register("property_title")} placeholder="Property name" />
              {errors.property_title && <p className="text-xs text-destructive">{errors.property_title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="value">Deal Value ($) *</Label>
              <Input id="value" type="number" {...register("value")} placeholder="500000" />
              {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Won">Won</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="expected_close">Expected Close Date</Label>
              <Input id="expected_close" type="date" {...register("expected_close")} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createDeal.isPending || updateDeal.isPending}>
              {createDeal.isPending || updateDeal.isPending ? "Saving..." : isEdit ? "Update" : "Create Deal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
