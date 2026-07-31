import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Navbar } from "@/components/mk/Navbar";
import { Hero } from "@/components/mk/Hero";
import { Footer } from "@/components/mk/Footer";
import { ServiceSection } from "@/components/mk/ServiceSection";
import { useCategories, useServices } from "@/hooks/useCatalog";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { hash } = useLocation();
  const { data: categories, isLoading: catLoading } = useCategories();
  const { data: services,   isLoading: svcLoading } = useServices();

  useEffect(() => {
    if (!hash || catLoading) return;
    const id = hash.replace("#", "");
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [hash, catLoading]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />

      {(catLoading || svcLoading) && (
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
          <Skeleton className="mb-6 h-6 w-48" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] w-full" />)}
          </div>
        </div>
      )}

      {categories?.map((cat) => (
        <ServiceSection
          key={cat.id}
          category={cat}
          services={(services ?? []).filter((s) => s.category_id === cat.id)}
        />
      ))}

      <section className="border-b border-border bg-card/30 px-6 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl tracking-[0.12em] md:text-3xl">Not sure exactly what you need?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Tell us what your event or situation looks like and we'll put together a tailored package — all in one go.
          </p>
          <Link to="/quote" className="mt-6 inline-flex items-center justify-center rounded-md border border-primary px-6 py-3 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
            Request a custom quote
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
