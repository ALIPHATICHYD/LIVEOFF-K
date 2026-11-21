import type { PropertyType } from "./format";

export type UserRole = "student" | "landlord" | "agent" | "admin";

export type PublicListing = {
  id: string;
  university_id: string;
  area_id: string;
  title: string;
  description: string;
  property_type: PropertyType;
  bedrooms: number;
  furnished: boolean;
  rent_per_year_kobo: number;
  agent_fee_kobo: number;
  caution_fee_kobo: number;
  other_fees_kobo: number;
  other_fees_note: string | null;
  min_rental_months: number;
  available_from: string | null;
  facilities: string[];
  minutes_to_gate: number | null;
  verified_at: string | null;
  is_featured: boolean;
  created_at: string;
  area_name: string;
  area_slug: string;
  university_slug: string;
  university_name: string;
};

export type Area = { id: string; slug: string; name: string; university_id: string };
