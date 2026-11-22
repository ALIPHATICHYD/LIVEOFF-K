/** Money is stored in kobo (integers). Convert only at the edges. */
export const nairaToKobo = (naira: number) => Math.round(naira * 100);

export function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
}

export const PROPERTY_TYPES = {
  self_contained: "Self-contained",
  single_room: "Single room",
  shared_apartment: "Shared apartment",
  one_bedroom: "One-bedroom",
  two_bedroom: "Two-bedroom",
  student_hostel: "Student hostel",
} as const;
export type PropertyType = keyof typeof PROPERTY_TYPES;

export const FACILITIES = [
  "Own bathroom", "Kitchen", "Prepaid meter", "Borehole water", "Furnished",
  "Fenced compound", "Security", "Parking", "Tiled floor", "Wardrobe",
] as const;

/** Section 9 of the business plan: what "Verified" means. */
export const VERIFICATION_CHECKS = [
  { key: "exists", label: "Property exists at the listed address" },
  { key: "photos", label: "Photos match the property" },
  { key: "identity", label: "Landlord or agent identity confirmed" },
  { key: "authority", label: "Advertiser owns it or has written authority to let" },
  { key: "fees", label: "Rent and every fee confirmed in writing" },
  { key: "utilities", label: "Water, power and security checked" },
] as const;

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", pending_review: "Waiting for review", inspection_scheduled: "Inspection scheduled",
  verified: "Live (verified)", rejected: "Needs changes", suspended: "Suspended", let: "Let",
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: "amber" | "green" | "red" | "grey" }> = {
  pending: { label: "Not paid yet", tone: "grey" },
  held: { label: "Held safely in escrow", tone: "amber" },
  moved_in: { label: "Held: confirm within 48 hours", tone: "amber" },
  release_approved: { label: "Releasing to landlord", tone: "green" },
  released: { label: "Released to landlord", tone: "green" },
  disputed: { label: "On hold: dispute open", tone: "red" },
  refunded: { label: "Refunded", tone: "grey" },
  failed: { label: "Payment failed", tone: "red" },
  cancelled: { label: "Cancelled", tone: "grey" },
};

/** Colour for a room card when there is no photo yet, stable per area. */
// Same OKLCH lightness and chroma, only the hue changes.
const TINTS = ["oklch(55% 0.09 160)", "oklch(55% 0.09 70)", "oklch(55% 0.09 240)", "oklch(55% 0.09 310)", "oklch(55% 0.09 35)", "oklch(55% 0.09 125)"];
export function areaTint(key: string) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}
