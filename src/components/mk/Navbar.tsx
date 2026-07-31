import { Link, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { ShoppingBag, User as UserIcon, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export const Navbar = () => {
  const { count } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    if (window.location.pathname !== "/") { navigate("/#" + id); return; }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="hidden items-center gap-6 md:flex">
            <button onClick={() => scrollToSection("guards")}  className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors">Guards</button>
            <button onClick={() => scrollToSection("events")}  className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors">Events</button>
            <button onClick={() => scrollToSection("mascots")} className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors">Mascots</button>
            <Link to="/quote" className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors">Quote</Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/cart">
            <Button variant="default" size="sm" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-background px-1.5 text-[11px] font-bold text-primary">
                {count}
              </span>
            </Button>
          </Link>

          {!user ? (
            <Link to="/auth">
              <Button variant="outline" size="sm">Sign in</Button>
            </Link>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <UserIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> My orders
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Admin dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate("/"); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
};