import { z } from "zod";

export const propertySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be under 200 characters"),
  location: z.string().trim().min(1, "Location is required").max(300, "Location must be under 300 characters"),
  price: z.coerce.number().min(0, "Price must be positive"),
  status: z.enum(["Available", "Sold", "Under Negotiation"]),
  type: z.enum(["Apartment", "Villa", "Commercial"]),
  bedrooms: z.coerce.number().int().min(0).nullable().optional(),
  area: z.coerce.number().min(0).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export type PropertyFormValues = z.infer<typeof propertySchema>;

export const leadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name must be under 200 characters"),
  email: z.string().trim().email("Invalid email").max(255).nullable().optional().or(z.literal("")),
  phone: z.string().trim().max(30).nullable().optional(),
  stage: z.enum(["New", "Contacted", "Site Visit Scheduled", "Negotiation", "Closed"]),
  source: z.string().max(100).nullable().optional(),
  budget: z.coerce.number().min(0).nullable().optional(),
  property_interest: z.string().max(300).nullable().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

export const dealSchema = z.object({
  lead_name: z.string().trim().min(1, "Lead name is required").max(200),
  property_title: z.string().trim().min(1, "Property title is required").max(200),
  value: z.coerce.number().min(0, "Value must be positive"),
  status: z.enum(["In Progress", "Won", "Lost"]),
  expected_close: z.string().nullable().optional(),
  lead_id: z.string().nullable().optional(),
});

export type DealFormValues = z.infer<typeof dealSchema>;
