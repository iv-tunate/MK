import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/mk/Navbar";
import { Footer } from "@/components/mk/Footer";
import { ServiceConfigurator } from "@/components/mk/ServiceConfigurator";
import { useService } from "@/hooks/useCatalog";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { defaultPhotoFor } from "@/lib/defaultPhotos";

const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: service, isLoading, isError } = useService(slug);
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (isLoading) {
    return (
      <Shell>
        <Skeleton className="aspect-video w-full" />
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Shell>
    );
  }

  if (isError || !service) {
    return (
      <Shell>
        <div className="rounded-md border border-border bg-card p-10 text-center">
          <h1 className="font-display text-2xl tracking-wide">Service not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">It may have been removed or renamed.</p>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to all services
          </Link>
        </div>
      </Shell>
    );
  }

  // If the admin hasn't uploaded anything yet, surface a curated default cover
  // so the page never looks empty. Real uploads always take precedence.
  const realPhotos = service.photos;
  const fallbackUrl = defaultPhotoFor({
    serviceSlug: service.slug,
    serviceName: service.name,
    categorySlug: service.category_slug,
    categoryName: service.category_name,
  });
  const photos = realPhotos.length
    ? realPhotos
    : [{
        id: "default-cover",
        service_id: service.id,
        storage_path: "",
        is_primary: true,
        sort_order: 0,
        caption: null,
        url: fallbackUrl,
      }];
  const cover = photos[0];

  return (
    <Shell>
      <Link
        to={`/#${service.category_slug}`}
        className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {service.category_name}
      </Link>

      {/* Hero gallery */}
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <button
          onClick={() => cover && setLightbox(0)}
          className="aspect-[16/10] w-full overflow-hidden rounded-lg border border-border bg-muted"
          aria-label="Open photo"
        >
          <img src={cover.url} alt={service.name} className="h-full w-full object-cover" />
        </button>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:grid-rows-2">
          {[1, 2].map((idx) => {
            const p = photos[idx];
            return (
              <button
                key={idx}
                onClick={() => p && setLightbox(idx)}
                className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted md:aspect-auto"
                aria-label={p ? "Open photo" : "No photo"}
              >
                {p ? (
                  <img src={p.url} alt={`${service.name} ${idx + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <FillerArt icon={service.icon} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thumbnail strip for photos 4 & 5 */}
      {photos.length > 3 && (
        <div className="mt-3 flex gap-3 overflow-x-auto">
          {photos.slice(3).map((p, i) => (
            <button
              key={p.id}
              onClick={() => setLightbox(3 + i)}
              className="h-20 w-28 flex-shrink-0 overflow-hidden rounded-md border border-border"
            >
              <img src={p.url} alt={`${service.name} ${4 + i}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Title + content + configurator */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-2xl">
            <span>{service.icon}</span>
          </div>
          <h1 className="font-display text-4xl tracking-[0.06em] md:text-5xl">{service.name}</h1>
          <p className="mt-4 text-base text-muted-foreground">{service.description}</p>
          {service.info && (
            <p className="mt-4 rounded-md border border-border bg-card/50 p-4 text-sm text-muted-foreground">
              {service.info}
            </p>
          )}
        </div>

        <div>
          <ServiceConfigurator service={service} />
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={lightbox !== null} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-5xl border-border bg-background p-0">
          {lightbox !== null && photos[lightbox] && (
            <div className="relative">
              <img
                src={photos[lightbox].url}
                alt={`${service.name} ${lightbox + 1}`}
                className="max-h-[85vh] w-full object-contain"
              />
              {lightbox > 0 && (
                <button
                  onClick={() => setLightbox(lightbox - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 hover:bg-background"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {lightbox < photos.length - 1 && (
                <button
                  onClick={() => setLightbox(lightbox + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 hover:bg-background"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-xs">
                {lightbox + 1} / {photos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background text-foreground">
    <Navbar />
    <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-16">{children}</main>
    <Footer />
  </div>
);

const FillerArt = ({ icon }: { icon: string }) => (
  <div className="flex h-full w-full items-center justify-center bg-muted/40 text-muted-foreground">
    <span className="text-3xl opacity-60">{icon}</span>
  </div>
);

export default ServiceDetail;