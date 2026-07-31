import { Link, useLocation } from "react-router-dom";
import { Navbar } from "@/components/mk/Navbar";
import { Footer } from "@/components/mk/Footer";
import { Button } from "@/components/ui/button";

const ComingSoon = () => {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl tracking-[0.08em] text-primary">Coming next</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          The page <code className="rounded bg-card px-1.5 py-0.5 text-foreground">{pathname}</code> is part of the
          next build phase: cart, checkout, dashboards, admin and email templates.
          The storefront is live — browse services and add them to cart, persistence is already wired.
        </p>
        <Link to="/"><Button className="mt-8 bg-gradient-gold text-primary-foreground">Back to storefront</Button></Link>
      </main>
      <Footer />
    </div>
  );
};

export default ComingSoon;