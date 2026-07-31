import { BUSINESS } from "@/lib/config";
import { Logo } from "./Logo";

export const Footer = () => (
  <footer className="border-t border-border bg-card/50 px-6 py-10">
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
      <div className="flex flex-col items-center gap-1 md:items-start">
        <Logo />
        <p className="text-xs text-muted-foreground">{BUSINESS.tagline}</p>
      </div>
      <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground md:items-end">
        <p>WhatsApp: <a className="text-primary hover:underline" href={`https://wa.me/${BUSINESS.whatsappNumber}`}>{BUSINESS.whatsappDisplay}</a></p>
        <p>Email: <a className="text-primary hover:underline" href={`mailto:${BUSINESS.supportEmail}`}>{BUSINESS.supportEmail}</a></p>
        <p className="mt-1">© {new Date().getFullYear()} {BUSINESS.name}</p>
      </div>
    </div>
  </footer>
);