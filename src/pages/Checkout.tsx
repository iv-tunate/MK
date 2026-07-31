import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, ShoppingBag } from "lucide-react";
import { Navbar } from "@/components/mk/Navbar";
import { Footer } from "@/components/mk/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildOrderMessage } from "@/lib/orderMessage";
import { waLink } from "@/lib/config";
import { toast } from "sonner";
import { summarizeSchedule } from "@/components/mk/DateScheduler";
import { cartGrandTotal, cartLineTotal, NAIRA, scheduleDays } from "@/lib/pricing";
import { buildInvoicePdf, type PdfOrderInput } from "@/lib/pdfDocs";
import { sendMail } from "@/lib/mail";

const Checkout = () => {
  const { items, clear, count } = useCart();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { state: { redirectTo: "/checkout" }, replace: true }); return; }
    if (count === 0) { navigate("/cart", { replace: true }); return; }
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) setProfile({ first_name: data.first_name, last_name: data.last_name, email: data.email, phone: data.phone });
    })();
  }, [user, loading, count, navigate]);

  const fullName = useMemo(() => `${profile.first_name} ${profile.last_name}`.trim(), [profile]);
  const grandTotal = useMemo(() => cartGrandTotal(items), [items]);

  const submit = async () => {
    if (!user) return;
    if (!fullName || !profile.phone) { toast.error("Please fill in your name and phone"); return; }
    setBusy(true);
    try {
      const orderNumber = `MK-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: "pending",
          notes: notes.trim() || null,
          subtotal_naira: grandTotal,
          total_naira: grandTotal,
        })
        .select("*")
        .single();
      if (oErr) throw oErr;

      const rows = items.map((it) => ({
        order_id: order.id,
        category: it.categoryName,
        service_name: it.serviceName,
        quantity: it.quantity,
        location: it.location || null,
        duration: it.duration || null,
        schedule_mode: it.schedule?.mode ?? null,
        service_schedule: (it.schedule?.dates ?? []) as any,
        config: it.config as any,
        unit_price_naira: it.unitPriceNaira ?? 0,
        line_total_naira: cartLineTotal(it),
      }));
      const { error: iErr } = await supabase.from("order_items").insert(rows);
      if (iErr) throw iErr;

      // Build & upload invoice PDF (best-effort: don't block submission on failure).
      let invoicePath: string | null = null;
      let invoiceBytes: Uint8Array | undefined;
      const pdfInput: PdfOrderInput = {
          orderNumber: order.order_number,
          createdAt: order.created_at,
          customerName: fullName,
          customerEmail: profile.email,
          customerPhone: profile.phone,
          items: items.map((it) => ({
            serviceName: it.serviceName,
            category: it.categoryName,
            quantity: it.quantity,
            unitPrice: it.unitPriceNaira ?? 0,
            days: it.pricePerDay ? scheduleDays(it.schedule) : 1,
            lineTotal: cartLineTotal(it),
            summary: [
              ...it.summary,
              ...(it.duration ? [`Duration: ${it.duration}`] : []),
              ...(it.schedule ? summarizeSchedule(it.schedule) : []),
            ],
          })),
          subtotal: grandTotal,
          total: grandTotal,
          notes: notes.trim() || undefined,
      };
      try {
        const blob = buildInvoicePdf(pdfInput);
        invoiceBytes = new Uint8Array(await blob.arrayBuffer());
        invoicePath = `${user.id}/${order.id}/invoice.pdf`;
        const { error: upErr } = await supabase.storage
          .from("invoices")
          .upload(invoicePath, blob, { contentType: "application/pdf", upsert: true });
        if (!upErr) {
          await supabase.from("orders")
            .update({ invoice_storage_path: invoicePath })
            .eq("id", order.id);
        } else {
          invoicePath = null;
        }
      } catch (e) {
        console.warn("Invoice PDF generation failed", e);
      }

      // Send invoice email (no-op until email infra is set up; safe to call).
      try {
        const result = await sendMail({
          to: profile.email,
          template: "order-invoice",
          idempotencyKey: `invoice-${order.id}`,
          data: {
            firstName: profile.first_name,
            orderNumber: order.order_number,
            totalLabel: NAIRA(grandTotal),
          },
          attachment: invoiceBytes
            ? {
                filename: `invoice-${order.order_number}.pdf`,
                mimeType: "application/pdf",
                bytes: invoiceBytes,
              }
            : undefined,
        });
        if (result.ok) {
          await supabase.from("orders")
            .update({ invoice_sent_at: new Date().toISOString() })
            .eq("id", order.id);
        }
      } catch (e) {
        console.info("Invoice email send skipped:", e);
      }

      const message = buildOrderMessage({
        orderNumber: order.order_number,
        customerName: fullName,
        customerEmail: profile.email,
        customerPhone: profile.phone,
        items,
        notes,
      });

      clear();
      toast.success("Order submitted — opening WhatsApp");
      window.open(waLink(message), "_blank");
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit order");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-16">
        <Link to="/cart" className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to cart
        </Link>

        <header className="mb-8 flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-3xl tracking-[0.08em] md:text-4xl">Checkout</h1>
            <p className="text-xs text-muted-foreground">Confirm your contact details. We'll save the order and open WhatsApp.</p>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section className="grid gap-4 rounded-lg border border-border bg-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">First name</Label>
                <Input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Last name</Label>
                <Input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={profile.email} disabled />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+234..." />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notes for our team (optional)</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else we should know?" />
            </div>
          </section>

          <aside className="self-start rounded-lg border border-primary/40 bg-card p-5 shadow-card-elevated">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Order summary</h2>
            <ul className="mt-3 grid gap-3 text-xs">
              {items.map((it) => (
                <li key={it.id} className="grid gap-1 border-b border-border/60 pb-2 last:border-0">
                  <div className="flex justify-between">
                    <span className="font-medium text-foreground">{it.serviceName}</span>
                    <span className="text-muted-foreground">× {it.quantity}</span>
                  </div>
                  <div className="text-muted-foreground">{it.categoryName}</div>
                  {it.schedule && summarizeSchedule(it.schedule).slice(0, 2).map((s, i) => (
                    <div key={i} className="text-muted-foreground">{s}</div>
                  ))}
                  {it.unitPriceNaira > 0 && (
                    <div className="flex justify-between text-foreground">
                      <span className="text-muted-foreground">Line total</span>
                      <span className="font-medium text-primary">{NAIRA(cartLineTotal(it))}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-primary/30 pt-3 text-sm font-semibold">
              <span>Estimated total</span>
              <span className="text-primary">{NAIRA(grandTotal)}</span>
            </div>
            <Button onClick={submit} disabled={busy} className="mt-5 w-full bg-gradient-gold text-primary-foreground shadow-gold">
              <MessageCircle className="mr-2 h-4 w-4" /> {busy ? "Submitting..." : "Submit & open WhatsApp"}
            </Button>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Your order is saved to your account, an invoice is generated and emailed to you, and WhatsApp opens with a copy for our team.
            </p>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;