import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import type { UserRole } from "./types";

export type Profile = { id: string; role: UserRole; full_name: string | null; phone: string | null };

/** Current user's profile, or null when signed out. Identity comes from a verified JWT. */
export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, phone")
    .eq("id", uid)
    .single();
  return (profile as Profile | null) ?? null;
}

export async function requireRole(roles: UserRole[], next: string): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!roles.includes(profile.role)) redirect("/?denied=1");
  return profile;
}
