import { Link } from "react-router-dom";

export const Logo = ({ className }: { className?: string }) => (
  <Link
    to="/"
    className={`inline-flex items-baseline font-display text-2xl tracking-[0.32em] ${className ?? ""}`}
    aria-label="MK home"
  >
    <span className="text-primary">MK</span>
  </Link>
);