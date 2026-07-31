import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { CalendarDays, ChevronRight, LayoutDashboard, MessageCircle, X } from "lucide-react";
import { Navbar } from "@/components/mk/Navbar";
import { Footer } from "@/components/mk/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CANCELLATION_REASONS } from "@/lib/catalog";
import { canRequestCancellation, STATUS_META, type OrderStatus } from "@/lib/orderStatus";
import { buildCancellationMessage } from "@/lib/orderMessage";
import { waLink } from "@/lib/config";
import { toast } from "sonner";
import type { ScheduleEntry } from "@/contexts/CartContext";

interface OrderRow {
  id: string; order_number: string; status: OrderStatus; created_at: string;
  service_date: string | null; notes: string | null; admin_note: string | null;
  cancellation_reasons: string[] | null; cancellation_note: string | null;
}
interface ItemRow {
  id: string; order_id: string; category: string; service_name: string;
  quantity: number; location: string | null; duration: string | null;
  service_date: string | null; service_schedule: ScheduleEntry[] | null;
  schedule_mode: string | null; config: Record<string, any>;
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ first_name: string; last_name: string; email: string } | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, ItemRow[]>>({});
  const [busy, setBusy] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<OrderRow | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [cancelNote, setCancelNote] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { state: { redirectTo: "/dashboard" }, replace: true }); return; }
    (async () => {
      setBusy(true);
      const [{ data: prof }, { data: ords }] = await Promise.all([
        supabase.from("profiles").select("first_name,last_name,email").eq("id", user.id).maybeSingle(),
        supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setProfile(prof as any);
      setOrders((ords ?? []) as any);
      if (ords && ords.length) {
        const ids = ords.map((o: any) => o.id);
        const { data: its } = await supabase.from("order_items").select("*").in("order_id", ids);
        const map: Record<string, ItemRow[]> = {};
        for (const r of (its ?? []) as any[]) (map[r.order_id] ||= []).push(r);
        setItemsByOrder(map);
      }
      setBusy(false);
    })();
  }, [user, loading, navigate]);

  const openCancel = (o: OrderRow) => {
    setCancelTarget(o); setReasons([]); setCancelNote("");
  };

  const submitCancel = async () => {
    if (!cancelTarget || !user || !profile) return;
    if (reasons.length === 0) { toast.error("Pick at least one reason"); return; }
    // We don't actually cancel — admin does. We send a WhatsApp message and
    // record the requested reasons on the order.
    const { error } = await supabase
      .from("orders")
      .update({ cancellation_reasons: reasons, cancellation_note: cancelNote.trim() || null })
      .eq("id", cancelTarget.id);
    if (error) { toast.error(error.message); return; }
    const message = buildCancellationMessage({
      orderNumber: cancelTarget.order_number,
      customerName: `${profile.first_name} ${profile.last_name}`.trim(),
      customerEmail: profile.email,
      reasons,
      note: cancelNote,
    });
    window.open(waLink(message), "_blank");
    toast.success("Cancellation request sent — admin will confirm");
    setCancelTarget(null);
    // Refresh local copy
    setOrders((p) => p.map((o) => o.id === cancelTarget.id ? { ...o, cancellation_reasons: reasons, cancellation_note: cancelNote || null } : o));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
        <header className="mb-8 flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-3xl tracking-[0.08em] md:text-4xl">My orders</h1>
            <p className="text-xs text-muted-foreground">Track every order, see service dates, request cancellations.</p>
          </div>
        </header>

        {busy ? (
          <div className="grid gap-4">
            {[1,2,3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card/40 p-12 text-center">
            <p className="text-sm text-muted-foreground">You haven't placed any orders yet.</p>
            <Link to="/"><Button className="mt-6 bg-gradient-gold text-primary-foreground">Browse services</Button></Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((o) => {
              const its = itemsByOrder[o.id] ?? [];
              const meta = STATUS_META[o.status];
              const cancellable = canRequestCancellation(o.status, o.service_date);
              return (
                <article key={o.id} className="rounded-lg border border-border bg-card">
                  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted-foreground">{o.order_number}</span>
                      <Badge style={{ backgroundColor: `hsl(var(${meta.varName}) / 0.15)`, color: `hsl(var(${meta.varName}))`, borderColor: `hsl(var(${meta.varName}) / 0.4)` }} variant="outline">
                        {meta.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(parseISO(o.created_at), "d MMM yyyy")}</span>
                  </header>
                  <div className="px-5 py-4">
                    <ul className="grid gap-3">
                      {its.map((it) => (
                        <li key={it.id} className="rounded-md border border-border/50 bg-background/60 p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-medium">{it.service_name}</span>
                              <span className="text-muted-foreground"> × {it.quantity}</span>
                              <span className="ml-2 text-[11px] uppercase tracking-widest text-muted-foreground">{it.category}</span>
                            </div>
                            {it.location && <span className="text-xs text-muted-foreground">📍 {it.location}</span>}
                          </div>
                          {it.service_schedule && it.service_schedule.length > 0 && (
                            <div className="mt-2 flex items-start gap-2 rounded-md bg-input/40 p-2 text-xs text-muted-foreground">
                              <CalendarDays className="mt-0.5 h-3.5 w-3.5 text-primary" />
                              <ScheduleList entries={it.service_schedule} mode={it.schedule_mode} />
                            </div>
                          )}
                          {it.duration && <p className="mt-1 text-xs text-muted-foreground">Duration: {it.duration}</p>}
                        </li>
                      ))}
                    </ul>
                    {o.notes && (
                      <p className="mt-3 rounded-md border border-border bg-input/30 p-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Your note: </span>{o.notes}</p>
                    )}
                    {o.admin_note && (
                      <p className="mt-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs"><span className="font-medium text-primary">Admin update: </span>{o.admin_note}</p>
                    )}
                    {o.cancellation_reasons && o.cancellation_reasons.length > 0 && (
                      <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-muted-foreground">
                        <span className="font-medium text-destructive">Cancellation requested: </span>{o.cancellation_reasons.join(", ")}
                      </p>
                    )}
                  </div>
                  {cancellable && (
                    <footer className="flex justify-end border-t border-border px-5 py-3">
                      <Button size="sm" variant="outline" onClick={() => openCancel(o)}>
                        <X className="mr-2 h-3.5 w-3.5" /> Request cancellation
                      </Button>
                    </footer>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Cancellation dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request cancellation</DialogTitle>
            <DialogDescription>
              Tell us why so our team can process the request faster. We'll open WhatsApp to send the message.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Reason(s)</Label>
              {CANCELLATION_REASONS.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={reasons.includes(r)}
                    onCheckedChange={(c) => setReasons((p) => c ? [...p, r] : p.filter((x) => x !== r))}
                  />
                  {r}
                </label>
              ))}
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Additional notes (optional)</Label>
              <Textarea rows={3} value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Close</Button>
            <Button onClick={submitCancel} className="bg-gradient-gold text-primary-foreground">
              <MessageCircle className="mr-2 h-4 w-4" /> Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export const ScheduleList = ({ entries, mode }: { entries: ScheduleEntry[]; mode: string | null }) => {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (mode === "single") {
    const e = sorted[0];
    return <span>{format(parseISO(e.date), "EEE, d MMM yyyy")} @ {e.time}</span>;
  }
  if (mode === "range") {
    const allSame = sorted.every((e) => e.time === sorted[0].time);
    return (
      <div className="grid gap-0.5">
        <span>{format(parseISO(sorted[0].date), "d MMM")} → {format(parseISO(sorted[sorted.length-1].date), "d MMM yyyy")} ({sorted.length} day{sorted.length===1?"":"s"})</span>
        {allSame ? <span className="opacity-80">{sorted[0].time} each day</span> : sorted.map((e) => (
          <span key={e.date} className="opacity-80">  • {format(parseISO(e.date), "EEE d MMM")} @ {e.time}</span>
        ))}
      </div>
    );
  }
  // multi
  return (
    <div className="grid gap-0.5">
      <span>{sorted.length} day{sorted.length===1?"":"s"}</span>
      {sorted.map((e) => (
        <span key={e.date} className="opacity-80">  • {format(parseISO(e.date), "EEE d MMM yyyy")} @ {e.time}</span>
      ))}
    </div>
  );
};

export default Dashboard;