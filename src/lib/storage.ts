import { supabase } from "@/integrations/supabase/client";

/**
 * Upload one or more images to the property-images bucket.
 * Returns an array of public URLs.
 */
export async function uploadPropertyImages(
  files: File[],
  userId: string
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from("property-images")
      .upload(filePath, file, { upsert: false });

    if (error) throw error;

    const { data } = supabase.storage
      .from("property-images")
      .getPublicUrl(filePath);

    urls.push(data.publicUrl);
  }

  return urls;
}

/**
 * Delete an image from the property-images bucket by its public URL.
 */
export async function deletePropertyImage(publicUrl: string): Promise<void> {
  const match = publicUrl.match(/property-images\/(.+)$/);
  if (!match) return;
  const path = decodeURIComponent(match[1]);
  const { error } = await supabase.storage
    .from("property-images")
    .remove([path]);
  if (error) throw error;
}
