import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Trash2 } from "lucide-react";
import { Navbar } from "@/components/mk/Navbar";
import { Footer } from "@/components/mk/Footer";
import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { summarizeSchedule } from "@/components/mk/DateScheduler";
import { cartGrandTotal, cartLineTotal, NAIRA, scheduleDays } from "@/lib/pricing";

const Cart = () => {
  const { items, removeItem, count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: CartItem[] }>();
    for (const it of items) {
      const key = it.categorySlug;
      if (!map.has(key)) map.set(key, { name: it.categoryName, items: [] });
      map.get(key)!.items.push(it);
    }
    return Array.from(map.values());
  }, [items]);

  const grandTotal = useMemo(() => cartGrandTotal(items), [items]);

  const proceed = () => {
    if (!user) navigate("/auth", { state: { redirectTo: "/checkout" } });
    else navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Continue browsing
        </Link>

        <header className="mb-8 flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-3xl tracking-[0.08em] md:text-4xl">Your cart</h1>
            <p className="text-xs text-muted-foreground">
              {count} item{count === 1 ? "" : "s"} • Review & send for confirmation.
            </p>
          </div>
        </header>

        {count === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card/40 p-12 text-center">
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Link to="/"><Button className="mt-6 bg-gradient-gold text-primary-foreground">Browse services</Button></Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div className="grid gap-6">
              {groups.map((g) => (
                <section key={g.name} className="rounded-lg border border-border bg-card">
                  <header className="border-b border-border px-4 py-3">
                    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{g.name}</h2>
                  </header>
                  <ul className="divide-y divide-border">
                    {g.items.map((it) => (
                      <li key={it.id} className="grid gap-2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium">
                              {it.serviceName} <span className="text-muted-foreground">× {it.quantity}</span>
                            </h3>
                            {it.location && (
                              <p className="mt-0.5 text-xs text-muted-foreground">📍 {it.location}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {it.unitPriceNaira > 0 && (
                              <div className="text-right">
                                <div className="text-sm font-semibold text-primary">{NAIRA(cartLineTotal(it))}</div>
                                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                  {NAIRA(it.unitPriceNaira)}{it.pricePerDay ? ` × ${scheduleDays(it.schedule)}d` : ""} × {it.quantity}
                                </div>
                              </div>
                            )}
                            <button
                              onClick={() => removeItem(it.id)}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Remove from cart"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {(it.summary.length > 0 || it.duration || it.schedule) && (
                          <ul className="grid gap-0.5 text-xs text-muted-foreground">
                            {it.summary.map((s, i) => <li key={i}>• {s}</li>)}
                            {it.duration && <li>• Duration: {it.duration}</li>}
                            {it.schedule && summarizeSchedule(it.schedule).map((s, i) => (
                              <li key={`s${i}`}>• {s}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <aside className="self-start rounded-lg border border-primary/40 bg-card p-5 shadow-card-elevated">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Summary</h3>
              <dl className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Items</dt><dd>{count}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Categories</dt><dd>{groups.length}</dd></div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold">
                  <dt>Estimated total</dt>
                  <dd className="text-primary">{NAIRA(grandTotal)}</dd>
                </div>
              </dl>
              <p className="mt-4 rounded-md border border-border bg-input/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                Final pricing (including any custom adjustments) is confirmed by our team after you submit. You'll get an invoice by email and WhatsApp.
              </p>
              <Button onClick={proceed} className="mt-5 w-full bg-gradient-gold text-primary-foreground shadow-gold">
                {user ? "Proceed to checkout" : "Sign in to continue"}
              </Button>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Cart;