// MK — pricing helpers (single source of truth for cart math).

import type { CatalogService } from "./catalog";
import type { CartItem, CartSchedule } from "@/contexts/CartContext";

export const NAIRA = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));

/** Number of days in a schedule (1 if undefined/empty). */
export const scheduleDays = (s?: CartSchedule): number => {
  if (!s || !s.dates.length) return 1;
  if (s.mode === "single") return 1;
  return new Set(s.dates.map((d) => d.date)).size || 1;
};

/**
 * Compute the current per-unit price for a service given the user's selections.
 * = base_price + sum of price modifiers from selected select-field options.
 */
export function unitPriceForSelection(
  service: CatalogService,
  values: Record<string, any>,
): number {
  let unit = service.base_price_naira ?? 0;
  for (const f of service.fields) {
    if (f.kind !== "select" || !f.field_options?.length) continue;
    const picked = values[f.field_key];
    if (!picked) continue;
    const opt = f.field_options.find((o) => o.label === picked);
    if (opt) unit += opt.price_modifier_naira;
  }
  return unit;
}

/** Final line total for an item (snapshotted at order time). */
export function lineTotal(args: {
  unitPriceNaira: number;
  quantity: number;
  pricePerDay: boolean;
  schedule?: CartSchedule;
}): number {
  const days = args.pricePerDay ? scheduleDays(args.schedule) : 1;
  return args.unitPriceNaira * Math.max(1, args.quantity) * days;
}

/** Total an existing cart line — uses snapshotted unitPriceNaira on the item. */
export function cartLineTotal(item: CartItem): number {
  const unit = item.unitPriceNaira ?? 0;
  const days = item.pricePerDay ? scheduleDays(item.schedule) : 1;
  return unit * item.quantity * days;
}

export const cartGrandTotal = (items: CartItem[]) =>
  items.reduce((sum, it) => sum + cartLineTotal(it), 0);