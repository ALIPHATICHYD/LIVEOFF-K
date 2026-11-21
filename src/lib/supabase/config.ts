export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** False until .env.local is filled in, so pages can explain setup instead of crashing. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
