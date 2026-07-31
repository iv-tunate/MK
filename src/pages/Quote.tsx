import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquareQuote, Send } from "lucide-react";
import { Navbar } from "@/components/mk/Navbar";
import { Footer } from "@/components/mk/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { waLink } from "@/lib/config";
import { BUSINESS } from "@/lib/config";
import { toast } from "sonner";
import { sendMail } from "@/lib/mail";

const Quote = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation]   = useState("");
  const [budget, setBudget]       = useState("");
  const [details, setDetails]     = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { state: { redirectTo: "/quote" }, replace: true }); return; }
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) setProfile({ first_name: data.first_name, last_name: data.last_name, email: data.email, phone: data.phone });
    })();
  }, [user, loading, navigate]);

  const submit = async () => {
    if (!user) return;
    if (!details.trim() || !eventType.trim()) {
      toast.error("Please tell us what type of event and a few details.");
      return;
    }
    setBusy(true);
    try {
      const orderNumber = `MK-Q-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      const noteBlob = [
        `[QUOTE REQUEST]`,
        `Event type: ${eventType}`,
        eventDate ? `Event date: ${eventDate}` : null,
        location  ? `Location: ${location}`    : null,
        budget    ? `Budget: ${budget}`        : null,
        ``,
        details.trim(),
      ].filter(Boolean).join("\n");

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: "pending",
          is_quote_request: true,
          notes: noteBlob,
        })
        .select("*")
        .single();
      if (error) throw error;

      // Best-effort acknowledgement email — no-ops if no provider is configured.
      await sendMail({
        to: profile.email,
        template: "quote-request",
        idempotencyKey: `quote-${order.id}`,
        data: { firstName: profile.first_name, orderNumber: order.order_number },
      });

      const waMessage = [
        `*New quote request — ${order.order_number}*`,
        ``,
        `Name: ${profile.first_name} ${profile.last_name}`.trim(),
        `Email: ${profile.email}`,
        `Phone: ${profile.phone}`,
        ``,
        noteBlob,
      ].join("\n");

      toast.success("Quote sent — opening WhatsApp");
      window.open(waLink(waMessage), "_blank");
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      toast.error(e.message ?? "Could not submit quote");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to storefront
        </Link>

        <header className="mb-8 flex items-center gap-3">
          <MessageSquareQuote className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-3xl tracking-[0.08em] md:text-4xl">Request a custom quote</h1>
            <p className="text-xs text-muted-foreground">
              Don't see your exact need in the catalog? Tell us what you have in mind and {BUSINESS.name} will get back with pricing.
            </p>
          </div>
        </header>

        <section className="grid gap-4 rounded-lg border border-border bg-card p-5">
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={profile.email} disabled />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+234..." />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Event / service type *</Label>
              <Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="Wedding, birthday, corporate, transport, security…" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Event date (optional)</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City / venue" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Approximate budget (₦)</Label>
              <Input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Optional — helps us tailor options" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Tell us more *</Label>
            <Textarea rows={6} value={details} onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what you need: how many guests, which services, special requirements…" />
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={busy} className="bg-gradient-gold text-primary-foreground shadow-gold">
              <Send className="mr-2 h-4 w-4" />{busy ? "Submitting…" : "Send quote request"}
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Quote;