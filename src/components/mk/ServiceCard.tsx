import { Link } from "react-router-dom";
import type { CatalogService } from "@/lib/catalog";
import { InfoTip } from "./InfoTip";
import { defaultPhotoFor } from "@/lib/defaultPhotos";
import { ArrowRight } from "lucide-react";

export const ServiceCard = ({ service, index = 0 }: { service: CatalogService; index?: number }) => {
  const primary = service.photos[0];
  const imgUrl = primary?.url ?? defaultPhotoFor({
    serviceSlug: service.slug,
    serviceName: service.name,
    categorySlug: service.category_slug,
    categoryName: service.category_name,
  });

  return (
    <Link
      to={`/service/${service.slug}`}
      className="animate-fade-up group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-card-elevated"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={imgUrl}
          alt={`${service.name} preview`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Subtle gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">{service.name}</h3>
            {service.info && <InfoTip text={service.info} />}
          </div>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 translate-x-0 text-muted-foreground/0 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{service.description}</p>
      </div>
    </Link>
  );
};