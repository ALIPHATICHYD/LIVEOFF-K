import type { IconName } from "@/components/Icons";
import { supabaseUrl } from "./supabase/config";

export const MARKET_CATEGORIES = {
  room: { label: "Room setup", icon: "bed", tint: "#FCE3D2" },
  kitchen: { label: "Kitchen", icon: "pot", tint: "#DDEBF7" },
  power: { label: "Power", icon: "bolt", tint: "#FFF0BF" },
  study: { label: "Books & study", icon: "book", tint: "#E6E0F5" },
  gadgets: { label: "Gadgets", icon: "laptop", tint: "#DCE8E0" },
  other: { label: "Other", icon: "bike", tint: "#F3DDE6" },
} as const satisfies Record<string, { label: string; icon: IconName; tint: string }>;
export type MarketCategory = keyof typeof MARKET_CATEGORIES;

export const MARKET_CONDITIONS = { like_new: "Like new", good: "Good", fair: "Fair" } as const;
export type MarketCondition = keyof typeof MARKET_CONDITIONS;

/** Buyer protection fee: keep in sync with public.market_fee_kobo(). 3%, at least ₦200, at most ₦2,000. */
export const marketFeeKobo = (price: number) => Math.min(Math.max(Math.floor((price * 3) / 100), 20_000), 200_000);

export const marketPhotoUrl = (path: string) => `${supabaseUrl}/storage/v1/object/public/market-photos/${path}`;

export type MarketItem = {
  id: string;
  seller_id: string;
  university_id: string;
  area_id: string;
  category: MarketCategory;
  title: string;
  description: string;
  price_kobo: number;
  condition: MarketCondition;
  is_bundle: boolean;
  bundle_contents: string[];
  original_value_kobo: number | null;
  status: "active" | "reserved" | "sold" | "removed";
  created_at: string;
  area_name: string;
  area_slug: string;
  university_slug: string;
  seller_name: string;
  seller_verified: boolean;
  cover_path: string | null;
};

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
