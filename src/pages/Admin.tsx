import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/mk/Navbar";
import { Footer } from "@/components/mk/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoriesPanel } from "@/components/admin/CategoriesPanel";
import { ServicesPanel } from "@/components/admin/ServicesPanel";
import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { AdminsPanel } from "@/components/admin/AdminsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldCheck } from "lucide-react";

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/auth", { state: { redirectTo: "/admin" }, replace: true });
    else if (!isAdmin) navigate("/", { replace: true });
  }, [user, isAdmin, loading, navigate]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-muted-foreground">Checking access…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <header className="mb-8 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-3xl tracking-[0.08em]">Admin dashboard</h1>
            <p className="text-xs text-muted-foreground">Manage categories, services and photos.</p>
          </div>
        </header>

        <Tabs defaultValue="orders">
          <TabsList className="bg-card">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
          </TabsList>
          <TabsContent value="orders" className="mt-6"><OrdersPanel /></TabsContent>
          <TabsContent value="services" className="mt-6"><ServicesPanel /></TabsContent>
          <TabsContent value="categories" className="mt-6"><CategoriesPanel /></TabsContent>
          <TabsContent value="admins" className="mt-6"><AdminsPanel /></TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;