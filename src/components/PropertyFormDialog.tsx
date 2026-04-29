import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { propertySchema, type PropertyFormValues } from "@/lib/schemas";
import { useCreateProperty, useUpdateProperty } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { uploadPropertyImages } from "@/lib/storage";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Tables<"properties"> | null;
}

export function PropertyFormDialog({ open, onOpenChange, property }: Props) {
  const { user } = useAuth();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const isEdit = !!property;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: { title: "", location: "", price: 0, status: "Available", type: "Apartment", bedrooms: null, area: null, description: "" },
  });

  useEffect(() => {
    if (property) {
      reset({ title: property.title, location: property.location, price: property.price, status: property.status as any, type: property.type as any, bedrooms: property.bedrooms, area: property.area, description: property.description });
      setExistingImages(property.images ?? []);
    } else {
      reset({ title: "", location: "", price: 0, status: "Available", type: "Apartment", bedrooms: null, area: null, description: "" });
      setExistingImages([]);
    }
    setImageFiles([]);
  }, [property, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length + imageFiles.length + existingImages.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }
    setImageFiles((prev) => [...prev, ...files]);
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  };

  const onSubmit = async (values: PropertyFormValues) => {
    try {
      setUploading(true);

      let allImages = [...existingImages];
      if (imageFiles.length > 0) {
        const uploadedUrls = await uploadPropertyImages(imageFiles, user!.id);
        allImages = [...allImages, ...uploadedUrls];
      }

      if (isEdit && property) {
        await updateProperty.mutateAsync({ id: property.id, ...values, images: allImages });
        toast.success("Property updated!");
      } else {
        await createProperty.mutateAsync({
          title: values.title,
          location: values.location,
          price: values.price,
          status: values.status,
          type: values.type,
          bedrooms: values.bedrooms ?? null,
          area: values.area ?? null,
          description: values.description ?? null,
          agent_id: user!.id,
          images: allImages,
        });
        toast.success("Property created!");
      }
      reset();
      setImageFiles([]);
      setExistingImages([]);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Property" : "Add Property"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register("title")} placeholder="Skyline Penthouse" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="location">Location *</Label>
              <Input id="location" {...register("location")} placeholder="Downtown, NYC" />
              {errors.location && <p className="text-xs text-destructive">{errors.location.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="price">Price ($) *</Label>
              <Input id="price" type="number" {...register("price")} placeholder="500000" />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Sold">Sold</SelectItem>
                  <SelectItem value="Under Negotiation">Under Negotiation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apartment">Apartment</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input id="bedrooms" type="number" {...register("bedrooms")} placeholder="3" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="area">Area (sqft)</Label>
              <Input id="area" type="number" {...register("area")} placeholder="2200" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} placeholder="Property details..." rows={3} />
            </div>

            {/* Image Upload */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Images</Label>
              <div className="flex flex-wrap gap-2">
                {existingImages.map((url) => (
                  <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(url)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-destructive-foreground" />
                    </button>
                  </div>
                ))}
                {imageFiles.map((file, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(i)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-destructive-foreground" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-[10px] mt-1">Add</span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-[11px] text-muted-foreground">Up to 10 images. Stored in Supabase Storage.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createProperty.isPending || updateProperty.isPending || uploading}>
              {uploading ? "Uploading..." : createProperty.isPending || updateProperty.isPending ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
