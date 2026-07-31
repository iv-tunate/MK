import type { CatalogCategory } from "@/lib/catalog";

export const SectionHeader = ({ category }: { category: CatalogCategory }) => {
  // Inline HSL allows admin-defined accent colors per category.
  const style = {
    color: `hsl(${category.accent_hsl})`,
    borderColor: `hsl(${category.accent_hsl})`,
    backgroundColor: `hsl(${category.accent_hsl} / 0.12)`,
  } as React.CSSProperties;

  return (
    <div className="mb-8 flex flex-wrap items-center gap-4">
      <span style={style} className="rounded-sm border px-3 py-1 font-display text-[11px] tracking-[0.18em]">
        {category.name}
      </span>
      <h2 className="font-display text-2xl tracking-[0.12em] md:text-3xl">{category.tagline}</h2>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
};