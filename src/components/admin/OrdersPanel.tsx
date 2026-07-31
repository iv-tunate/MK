import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, Save, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { STATUS_META, type OrderStatus } from "@/lib/orderStatus";
import { ScheduleList } from "@/pages/Dashboard";
import type { ScheduleEntry } from "@/contexts/CartContext";
import { toast } from "sonner";
import { buildReceiptPdf, type PdfOrderInput } from "@/lib/pdfDocs";
import { sendMail } from "@/lib/mail";
import { NAIRA } from "@/lib/pricing";

interface OrderRow {
  id: string; order_number: string; status: OrderStatus; created_at: string;
  user_id: string; service_date: string | null;
  notes: string | null; admin_note: string | null;
  cancellation_reasons: string[] | null; cancellation_note: string | null;
  confirmed_at: string | null; completed_at: string | null;
  cancelled_at: string | null; refunded_at: string | null;
  subtotal_naira?: number | null; total_naira?: number | null;
  receipt_storage_path?: string | null; receipt_sent_at?: string | null;
}
interface ItemRow {
  id: string; order_id: string; category: string; service_name: string;
  quantity: number; location: string | null; duration: string | null;
  service_schedule: ScheduleEntry[] | null; schedule_mode: string | null;
  config: Record<string, any>;
  unit_price_naira?: number | null; line_total_naira?: number | null;
}
interface ProfileRow {
  id: string; first_name: string; last_name: string; email: string; phone: string;
}

const STATUSES: OrderStatus[] = ["pending","confirmed","in_progress","completed","cancelled","refunded"];

export const OrdersPanel = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<Record<string, ItemRow[]>>({});
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [openOrder, setOpenOrder] = useState<OrderRow | null>(null);

  const load = async () => {
    setBusy(true);
    const { data: ords } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((ords ?? []) as any);
    if (ords && ords.length) {
      const oids = ords.map((o: any) => o.id);
      const uids = Array.from(new Set(ords.map((o: any) => o.user_id)));
      const [{ data: its }, { data: profs }] = await Promise.all([
        supabase.from("order_items").select("*").in("order_id", oids),
        supabase.from("profiles").select("*").in("id", uids),
      ]);
      const itMap: Record<string, ItemRow[]> = {};
      for (const r of (its ?? []) as any[]) (itMap[r.order_id] ||= []).push(r);
      setItems(itMap);
      const pMap: Record<string, ProfileRow> = {};
      for (const p of (profs ?? []) as any[]) pMap[p.id] = p;
      setProfiles(pMap);
    }
    setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = orders;
    if (filter !== "all") list = list.filter((o) => o.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((o) => {
        const p = profiles[o.user_id];
        return o.order_number.toLowerCase().includes(q)
          || (p && (p.email.toLowerCase().includes(q) || `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)));
      });
    }
    return list;
  }, [orders, filter, search, profiles]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search by order #, name, email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {busy ? (
        <div className="grid gap-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No orders match.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Items</th>
                <th className="px-3 py-3">Earliest date</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const meta = STATUS_META[o.status];
                const p = profiles[o.user_id];
                const its = items[o.id] ?? [];
                return (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-3 py-3">
                      <div className="font-mono text-xs">{o.order_number}</div>
                      <div className="text-[11px] text-muted-foreground">{format(parseISO(o.created_at), "d MMM yyyy")}</div>
                    </td>
                    <td className="px-3 py-3">
                      {p ? (
                        <>
                          <div className="font-medium">{p.first_name} {p.last_name}</div>
                          <div className="text-[11px] text-muted-foreground">{p.email}</div>
                        </>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {its.length} line{its.length === 1 ? "" : "s"}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {o.service_date ? format(parseISO(o.service_date), "EEE d MMM") : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge style={{ backgroundColor: `hsl(var(${meta.varName}) / 0.15)`, color: `hsl(var(${meta.varName}))`, borderColor: `hsl(var(${meta.varName}) / 0.4)` }} variant="outline">
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => setOpenOrder(o)}>Open</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <OrderSheet
        order={openOrder}
        items={openOrder ? items[openOrder.id] ?? [] : []}
        profile={openOrder ? profiles[openOrder.user_id] : undefined}
        onClose={() => setOpenOrder(null)}
        onSaved={() => { setOpenOrder(null); load(); }}
      />
    </div>
  );
};

const OrderSheet = ({
  order, items, profile, onClose, onSaved,
}: {
  order: OrderRow | null;
  items: ItemRow[];
  profile?: ProfileRow;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) { setStatus(order.status); setAdminNote(order.admin_note ?? ""); }
  }, [order]);

  const save = async () => {
    if (!order) return;
    setSaving(true);
    const now = new Date().toISOString();
    const patch = {
      status,
      admin_note: adminNote.trim() || null,
      confirmed_at: status === "confirmed" && !order.confirmed_at ? now : order.confirmed_at,
      completed_at: status === "completed" && !order.completed_at ? now : order.completed_at,
      cancelled_at: status === "cancelled" && !order.cancelled_at ? now : order.cancelled_at,
      refunded_at:  status === "refunded"  && !order.refunded_at  ? now : order.refunded_at,
    };
    const { error } = await supabase.from("orders").update(patch).eq("id", order.id);
    if (error) { setSaving(false); toast.error(error.message); return; }

    // If newly completed, generate + email a receipt (best-effort).
    if (status === "completed" && !order.completed_at) {
      try {
        const total = order.total_naira ?? items.reduce((s, it) => s + (it.line_total_naira ?? 0), 0);
        const subtotal = order.subtotal_naira ?? total;
        const pdfInput: PdfOrderInput = {
          orderNumber: order.order_number,
          createdAt: order.created_at,
          customerName: profile ? `${profile.first_name} ${profile.last_name}`.trim() : "",
          customerEmail: profile?.email ?? "",
          customerPhone: profile?.phone ?? "",
          items: items.map((it) => ({
            serviceName: it.service_name,
            category: it.category,
            quantity: it.quantity,
            unitPrice: it.unit_price_naira ?? 0,
            days: 1,
            lineTotal: it.line_total_naira ?? 0,
            summary: [
              ...(it.location ? [`Location: ${it.location}`] : []),
              ...(it.duration ? [`Duration: ${it.duration}`] : []),
            ],
          })),
          subtotal, total,
          notes: order.notes ?? undefined,
        };
        const blob = buildReceiptPdf(pdfInput);
        const path = `${order.user_id}/${order.id}/receipt.pdf`;
        const { error: upErr } = await supabase.storage
          .from("invoices")
          .upload(path, blob, { contentType: "application/pdf", upsert: true });
        if (!upErr) {
          await supabase.from("orders").update({ receipt_storage_path: path }).eq("id", order.id);
        }
        if (profile?.email) {
          const bytes = new Uint8Array(await blob.arrayBuffer());
          const result = await sendMail({
            to: profile.email,
            template: "order-receipt",
            idempotencyKey: `receipt-${order.id}`,
            data: {
              firstName: profile.first_name,
              orderNumber: order.order_number,
              totalLabel: NAIRA(total),
            },
            attachment: { filename: `receipt-${order.order_number}.pdf`, mimeType: "application/pdf", bytes },
          });
          if (result.ok) {
            await supabase.from("orders").update({ receipt_sent_at: new Date().toISOString() }).eq("id", order.id);
            toast.success("Receipt emailed to customer");
          } else {
            toast.message("Receipt PDF saved", { description: "Email not sent — configure Mailtrap." });
          }
        }
      } catch (e: any) {
        console.warn("Receipt flow failed", e);
      }
    }

    setSaving(false);
    toast.success("Order updated");
    onSaved();
  };

  return (
    <Sheet open={!!order} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto bg-background sm:max-w-2xl">
        {order && (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono text-base">{order.order_number}</SheetTitle>
              <SheetDescription>
                Created {format(parseISO(order.created_at), "PPpp")}
              </SheetDescription>
            </SheetHeader>

            <section className="mt-6 grid gap-1 rounded-md border border-border bg-card p-4 text-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Customer</h3>
              {profile ? (
                <>
                  <p>{profile.first_name} {profile.last_name}</p>
                  <p className="text-muted-foreground">{profile.email}</p>
                  <p className="text-muted-foreground">{profile.phone}</p>
                </>
              ) : <p className="text-muted-foreground">No profile data</p>}
            </section>

            <section className="mt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Items</h3>
              <ul className="grid gap-3">
                {items.map((it) => (
                  <li key={it.id} className="rounded-md border border-border bg-card p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-medium">{it.service_name}</span>
                        <span className="text-muted-foreground"> × {it.quantity}</span>
                      </div>
                      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{it.category}</span>
                    </div>
                    {it.location && <p className="mt-1 text-xs text-muted-foreground">📍 {it.location}</p>}
                    {it.service_schedule && it.service_schedule.length > 0 && (
                      <div className="mt-2 flex items-start gap-2 rounded-md bg-input/40 p-2 text-xs text-muted-foreground">
                        <CalendarDays className="mt-0.5 h-3.5 w-3.5 text-primary" />
                        <ScheduleList entries={it.service_schedule} mode={it.schedule_mode} />
                      </div>
                    )}
                    {it.duration && <p className="mt-1 text-xs text-muted-foreground">Duration: {it.duration}</p>}
                    {Object.keys(it.config ?? {}).length > 0 && (
                      <details className="mt-2 text-[11px]">
                        <summary className="cursor-pointer text-muted-foreground">Raw config</summary>
                        <pre className="mt-1 overflow-auto rounded bg-input/40 p-2">{JSON.stringify(it.config, null, 2)}</pre>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {order.notes && (
              <section className="mt-4 rounded-md border border-border bg-card p-3 text-sm">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Customer note</h3>
                <p className="mt-1 text-muted-foreground">{order.notes}</p>
              </section>
            )}

            {order.cancellation_reasons && order.cancellation_reasons.length > 0 && (
              <section className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">Cancellation requested</h3>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {order.cancellation_reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
                {order.cancellation_note && <p className="mt-1 text-muted-foreground">{order.cancellation_note}</p>}
              </section>
            )}

            <section className="mt-6 grid gap-3 rounded-md border border-primary/30 bg-card p-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Note for customer (visible on their dashboard)</Label>
                <Textarea rows={3} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>Close</Button>
                <Button onClick={save} disabled={saving} className="bg-gradient-gold text-primary-foreground">
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
              </div>
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};