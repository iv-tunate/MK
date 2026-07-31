// MK Hub — single source of truth for business contact info.
// Update WHATSAPP_NUMBER in international format (no spaces, no '+').

export const BUSINESS = {
  name: "MK Hub",
  shortName: "MK",
  tagline: "Nigeria's Premier Security & Events Group",
  whatsappNumber: "2348107218421", // wa.me digits only, no '+', no spaces
  whatsappDisplay: "+234 810 721 8421",
  adminEmail: "mkguards@yahoo.com",
  supportEmail: "mkguards@yahoo.com",
} as const;

export const waLink = (message: string) =>
  `https://wa.me/${BUSINESS.whatsappNumber}?text=${encodeURIComponent(message)}`;