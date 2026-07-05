import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const projectRef = process.env.SUPABASE_PROJECT_REF;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

/** Lazily created so the API can boot without storage credentials; upload endpoints fail with a clear error instead. */
function getSupabase(): SupabaseClient {
  if (!projectRef || !supabaseServiceKey) {
    throw new Error("File storage is not configured (SUPABASE_PROJECT_REF / SUPABASE_SERVICE_ROLE_KEY missing)");
  }
  if (!client) {
    client = createClient(`https://${projectRef}.supabase.co`, supabaseServiceKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export const BUCKETS = {
  AVATARS: "avatars",
  SALON_IMAGES: "salon-images",
  SALON_LOGOS: "salon-logos",
  EMPLOYEE_PHOTOS: "employee-photos",
  CATEGORY_ICONS: "category-icons",
  REVIEW_MEDIA: "review-media",
  COUPON_BANNERS: "coupon-banners",
  DOCUMENTS: "documents",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Upload a buffer to Supabase Storage and return the public URL. */
export async function uploadFile(
  bucket: BucketName,
  path: string,
  buffer: Buffer,
  mimetype: string,
): Promise<string> {
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: mimetype, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Delete a file from Supabase Storage by its full public URL. */
export async function deleteFile(bucket: BucketName, path: string): Promise<void> {
  await getSupabase().storage.from(bucket).remove([path]);
}

/** Extract the storage path from a public URL. */
export function pathFromUrl(publicUrl: string): string {
  // publicUrl looks like: https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const parts = publicUrl.split("/object/public/");
  if (parts.length < 2) return publicUrl;
  const withBucket = parts[1];
  return withBucket.split("/").slice(1).join("/"); // strip bucket name
}
