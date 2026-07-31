// MK — pluggable image provider.
// -----------------------------------------------------------------------
// Two strategies ship out of the box:
//   1. "local"      → reads /public/catalog/manifest.json + curated Unsplash fallbacks.
//   2. "cloudinary" → builds Cloudinary delivery URLs.
//
// Switch by setting `VITE_IMAGE_PROVIDER=cloudinary` (and the cloud name)
// in `.env`. No other code change needed.
// -----------------------------------------------------------------------

import { MANIFEST as M } from "./manifest";
import { UNSPLASH_FALLBACKS } from "./fallbacks";

export interface ResolvedImage {
  url: string;
  caption?: string | null;
}

export interface LookupKeys {
  categorySlug?: string | null;
  categoryName?: string | null;
  serviceSlug?: string | null;
  serviceName?: string | null;
  optionLabel?: string | null;
}

export const slug = (s: string | null | undefined) =>
  (s ?? "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* -------------------- Provider interface -------------------- */

interface ImageProvider {
  /** Returns one image (the most-specific match available). */
  resolveOne(keys: LookupKeys): ResolvedImage;
  /** Returns all available images for these keys (most specific first). */
  resolveMany(keys: LookupKeys): ResolvedImage[];
}

/* -------------------- Local provider -------------------- */

const toUrl = (rel: string) => (rel.startsWith("http") ? rel : `/catalog/${rel.replace(/^\/+/, "")}`);

const localProvider: ImageProvider = {
  resolveMany(keys) {
    const out: ResolvedImage[] = [];

    // 1. Option-level
    if (keys.optionLabel) {
      const oSlug = slug(keys.optionLabel);
      // a) under a known service bucket
      const sSlug = slug(keys.serviceSlug);
      if (sSlug && M.options?.[sSlug]?.[oSlug]) {
        for (const p of M.options[sSlug][oSlug]) out.push({ url: toUrl(p), caption: keys.optionLabel });
      }
      // b) Unsplash fallback for that label
      const fb = UNSPLASH_FALLBACKS.options[oSlug];
      if (fb) out.push({ url: fb, caption: keys.optionLabel });
    }

    // 2. Service-level
    const sSlug = slug(keys.serviceSlug) || slug(keys.serviceName);
    if (sSlug && M.services?.[sSlug]) {
      for (const p of M.services[sSlug]) out.push({ url: toUrl(p) });
    }
    if (sSlug && UNSPLASH_FALLBACKS.services[sSlug]) {
      out.push({ url: UNSPLASH_FALLBACKS.services[sSlug] });
    }

    // 3. Category-level
    const cSlug = slug(keys.categorySlug) || slug(keys.categoryName);
    if (cSlug && M.categories?.[cSlug]) {
      for (const p of M.categories[cSlug]) out.push({ url: toUrl(p) });
    }
    if (cSlug && UNSPLASH_FALLBACKS.categories[cSlug]) {
      out.push({ url: UNSPLASH_FALLBACKS.categories[cSlug] });
    }

    if (!out.length) out.push({ url: UNSPLASH_FALLBACKS.generic });
    return out;
  },
  resolveOne(keys) {
    return this.resolveMany(keys)[0];
  },
};

/* -------------------- Cloudinary provider -------------------- */
// Stub — finish later by setting env vars. Builds a delivery URL such as:
//   https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto/<folder>/<bucket>/<slug>.jpg
// Same logical key naming as the local provider.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const CLOUD_FOLDER = (import.meta.env.VITE_CLOUDINARY_FOLDER as string | undefined) ?? "mk-hub";

const cloudUrl = (path: string) =>
  `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${CLOUD_FOLDER}/${path}`;

const cloudinaryProvider: ImageProvider = {
  resolveMany(keys) {
    if (!CLOUD_NAME) return localProvider.resolveMany(keys);
    const out: ResolvedImage[] = [];
    const sSlug = slug(keys.serviceSlug);
    const oSlug = slug(keys.optionLabel);
    if (sSlug && oSlug) out.push({ url: cloudUrl(`options/${sSlug}/${oSlug}`), caption: keys.optionLabel });
    if (sSlug)          out.push({ url: cloudUrl(`services/${sSlug}`) });
    const cSlug = slug(keys.categorySlug) || slug(keys.categoryName);
    if (cSlug)          out.push({ url: cloudUrl(`categories/${cSlug}`) });
    // Always also fall through to local/Unsplash so missing assets don't 404.
    out.push(...localProvider.resolveMany(keys));
    return out;
  },
  resolveOne(keys) { return this.resolveMany(keys)[0]; },
};

/* -------------------- Active provider -------------------- */

const ACTIVE: ImageProvider =
  (import.meta.env.VITE_IMAGE_PROVIDER === "cloudinary") ? cloudinaryProvider : localProvider;

export const resolveImage      = (keys: LookupKeys) => ACTIVE.resolveOne(keys);
export const resolveImagesAll  = (keys: LookupKeys) => ACTIVE.resolveMany(keys);

/** Backwards-compatible helper used across the app. */
export const defaultPhotoFor = (keys: LookupKeys): string => resolveImage(keys).url;