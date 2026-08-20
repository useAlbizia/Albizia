import { createBrowserClient } from "@supabase/ssr";

// Browser-only client. Used for exactly one thing in this app: uploading
// product photos straight to Supabase Storage from the admin UI, bypassing
// the Server Action body-size limit (see src/lib/db/schema.ts comment on
// product_images for why images live in Storage, not the DB).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
