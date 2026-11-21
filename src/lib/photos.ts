import { supabaseUrl } from "./supabase/config";

export const photoUrl = (path: string) =>
  `${supabaseUrl}/storage/v1/object/public/listing-photos/${path}`;
