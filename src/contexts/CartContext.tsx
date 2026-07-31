import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type ScheduleMode = "single" | "multi" | "range";
export interface ScheduleEntry {
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM (24h)
}
export interface CartSchedule {
  mode: ScheduleMode;
  dates: ScheduleEntry[];
}

export interface CartItem {
  id: string;             // local cart line id
  serviceId: string;
  categorySlug: string;        // snapshot — category may be deleted later
  categoryName: string;        // snapshot — display label at time of add
  serviceName: string;
  quantity: number;
  location?: string;
  /** @deprecated kept for older entries — use `schedule` */
  serviceDate?: string;
  schedule?: CartSchedule;
  duration?: string;
  config: Record<string, any>;
  summary: string[];      // pre-computed human readable lines
  /** Snapshot — current unit price at the moment the item was added. */
  unitPriceNaira: number;
  /** True if line total scales by number of scheduled days. */
  pricePerDay: boolean;
  /** Optional uniqueness key — set for fields that must not repeat across cart
   *  (e.g. mascot character). Format: `<serviceId>:<fieldKey>:<value>`. */
  uniqueOptionKey?: string;
}

interface CartCtx {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  count: number;
  byCategory: (slug: string) => CartItem[];
}

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "mkhub.cart.v2";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartCtx>(() => ({
    items,
    addItem: (item) => setItems((prev) => [...prev, { ...item, id: crypto.randomUUID() }]),
    removeItem: (id) => setItems((prev) => prev.filter((i) => i.id !== id)),
    clear: () => setItems([]),
    count: items.length,
    byCategory: (slug) => items.filter((i) => i.categorySlug === slug),
  }), [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useCart = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};