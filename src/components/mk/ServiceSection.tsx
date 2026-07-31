import type { CatalogCategory, CatalogService } from "@/lib/catalog";
import { ServiceCard } from "./ServiceCard";
import { SectionHeader } from "./SectionHeader";

export const ServiceSection = ({
  category, services, note,
}: { category: CatalogCategory; services: CatalogService[]; note?: React.ReactNode }) => (
  <section id={category.slug} className="border-b border-border px-4 py-12 md:px-6 md:py-16">
    <div className="mx-auto max-w-7xl">
      <SectionHeader category={category} />
      {note}
      {services.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No services in this category yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s, i) => <ServiceCard key={s.id} service={s} index={i} />)}
        </div>
      )}
    </div>
  </section>
);