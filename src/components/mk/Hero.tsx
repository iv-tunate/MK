import { BUSINESS } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const Hero = () => (
  <section className="relative overflow-hidden border-b border-border bg-gradient-hero">
    {/* Decorative animated blobs */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="animate-float absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="animate-float absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/8 blur-3xl [animation-delay:1.5s]" />
    </div>

    <div className="mx-auto max-w-5xl px-6 py-20 text-center md:py-28 relative z-10">
      <div className="animate-fade-up mb-3 text-[11px] uppercase tracking-[0.32em] text-primary">
        {BUSINESS.tagline}
      </div>
      <h1 className="animate-fade-up [animation-delay:0.1s] font-display text-7xl leading-[0.95] tracking-[0.18em] md:text-9xl lg:text-[10rem]">
        <span className="text-primary">MK</span>
      </h1>
      <p className="animate-fade-up [animation-delay:0.2s] mx-auto mt-6 max-w-xl text-sm text-muted-foreground md:text-base">
        Security details, event services, and mascots — all in one place.
        Configure exactly what you need and send your order to our team in a single tap.
      </p>
      <div className="animate-fade-up [animation-delay:0.35s] mt-8 flex flex-wrap items-center justify-center gap-3">
        <a href="#guards">
          <Button size="lg" className="animate-pulse-gold bg-gradient-gold text-primary-foreground shadow-gold transition-transform hover:scale-105 active:scale-95">
            Browse services
          </Button>
        </a>
        <Link to="/quote">
          <Button size="lg" variant="outline" className="transition-transform hover:scale-105 active:scale-95">
            Get a custom quote
          </Button>
        </Link>
      </div>
    </div>
  </section>
);