import { createClient } from "@supabase/supabase-js";

let supabaseAdminClient: ReturnType<typeof createClient> | null = null;

/**
 * Create a server-side Supabase client using the service role key.
 */
export function getSupabaseAdminClient() {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminClient;
}

/**
 * Resolve the storage bucket used for private knowledge documents.
 */
export function getKnowledgeBucketName() {
  return process.env.SUPABASE_DOCUMENTS_BUCKET ?? "knowledge-documents";
}
