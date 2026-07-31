import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogCategory, CatalogService, CatalogField, CatalogPhoto } from "@/lib/catalog";
import { photoUrl } from "@/lib/catalog";

// ---------- categories ----------

const fetchCategories = async (includeInactive = false): Promise<CatalogCategory[]> => {
  let q = supabase.from("categories").select("*").order("sort_order");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data as CatalogCategory[];
};

export const useCategories = (includeInactive = false) =>
  useQuery({
    queryKey: ["categories", includeInactive],
    queryFn: () => fetchCategories(includeInactive),
  });

// ---------- services (with category, fields, photos) ----------

const hydrateService = (row: any): CatalogService => ({
  id: row.id,
  category_id: row.category_id,
  category_slug: row.categories?.slug ?? "",
  category_name: row.categories?.name ?? "",
  slug: row.slug,
  name: row.name,
  icon: row.icon,
  description: row.description,
  info: row.info,
  sort_order: row.sort_order,
  is_active: row.is_active,
  base_price_naira: row.base_price_naira ?? 0,
  price_per_day: !!row.price_per_day,
  fields: ((row.service_fields as CatalogField[]) ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((f: any) => ({
      ...f,
      field_options: ((f.service_field_options ?? []) as any[])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({
          id: o.id, field_id: o.field_id, label: o.label,
          price_modifier_naira: o.price_modifier_naira ?? 0,
          stock: o.stock, sort_order: o.sort_order, is_active: o.is_active,
        })),
    })),
  photos: ((row.service_photos as any[]) ?? [])
    .slice()
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)
    .map<CatalogPhoto>((p) => ({
      id: p.id,
      service_id: p.service_id,
      storage_path: p.storage_path,
      is_primary: p.is_primary,
      sort_order: p.sort_order,
      caption: p.caption ?? null,
      url: photoUrl(p.storage_path),
    })),
});

const SERVICE_SELECT = `
  *,
  categories ( slug, name ),
  service_fields ( *, service_field_options ( * ) ),
  service_photos ( * )
`;

const fetchServices = async (includeInactive = false): Promise<CatalogService[]> => {
  let q = supabase.from("services").select(SERVICE_SELECT).order("sort_order");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(hydrateService);
};

export const useServices = (includeInactive = false) =>
  useQuery({
    queryKey: ["services", includeInactive],
    queryFn: () => fetchServices(includeInactive),
  });

export const useService = (slug: string | undefined) =>
  useQuery({
    queryKey: ["service", slug],
    enabled: !!slug,
    queryFn: async (): Promise<CatalogService | null> => {
      const { data, error } = await supabase
        .from("services")
        .select(SERVICE_SELECT)
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      return data ? hydrateService(data) : null;
    },
  });