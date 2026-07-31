// MK Hub — DB-driven catalog types & helpers.
// All categories, services, fields and photos now live in Supabase.
// This file only exposes the TypeScript shapes consumed by the UI.

import { supabase } from "@/integrations/supabase/client";

export type FieldKind = "qty" | "text" | "select" | "checkbox" | "datetime";

export interface CatalogCategory {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  accent_hsl: string;        // e.g. "45 65% 52%"
  sort_order: number;
  is_active: boolean;
}

export interface CatalogPhoto {
  id: string;
  service_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
  caption: string | null;
  url: string;               // resolved public URL
}

export interface CatalogField {
  id: string;
  service_id: string;
  kind: FieldKind;
  field_key: string;
  label: string;
  placeholder: string | null;
  info: string | null;
  required: boolean;
  default_num: number | null;
  min_num: number | null;
  max_num: number | null;
  options: string[] | null;
  sort_order: number;
  /**
   * For "select" fields where each option carries a price modifier and stock,
   * use richer `field_options` rows. Falls back to `options` (string list) when empty.
   */
  field_options?: CatalogFieldOption[];
}

export interface CatalogFieldOption {
  id: string;
  field_id: string;
  label: string;
  price_modifier_naira: number;
  stock: number | null;     // null = unlimited
  sort_order: number;
  is_active: boolean;
}

export interface CatalogService {
  id: string;
  category_id: string;
  category_slug: string;     // joined for convenience
  category_name: string;     // snapshot label for cart
  slug: string;
  name: string;
  icon: string;
  description: string;
  info: string;
  sort_order: number;
  is_active: boolean;
  base_price_naira: number;
  price_per_day: boolean;
  fields: CatalogField[];
  photos: CatalogPhoto[];
}

export const PHOTO_BUCKET = "service-photos";

export const photoUrl = (path: string) =>
  supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;

export const CANCELLATION_REASONS = [
  "Event was cancelled / postponed",
  "Changed my mind",
  "Found another provider",
  "Pricing concerns",
  "Date / time no longer works",
  "Service no longer needed",
  "Other",
];