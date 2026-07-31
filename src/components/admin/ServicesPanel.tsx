import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCategories, useServices } from "@/hooks/useCatalog";
import type { CatalogService } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ServiceEditor } from "./ServiceEditor";
import { toast } from "sonner";

export const ServicesPanel = () => {
  const qc = useQueryClient();
  const { data: categories } = useCategories(true);
  const { data: services } = useServices(true);
  const [activeCat, setActiveCat] = useState<string | undefined>();
  const [editing, setEditing] = useState<{ service: Partial<CatalogService> | null; categoryId?: string }>({ service: null });
  const [deleting, setDeleting] = useState<CatalogService | null>(null);

  const tabValue = activeCat ?? categories?.[0]?.id;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["services"] });
    qc.invalidateQueries({ queryKey: ["service"] });
  };

  const move = async (s: CatalogService, dir: -1 | 1) => {
    const peers = (services ?? []).filter((x) => x.category_id === s.category_id).sort((a, b) => a.sort_order - b.sort_order);
    const idx = peers.findIndex((x) => x.id === s.id);
    const swap = peers[idx + dir];
    if (!swap) return;
    await supabase.from("services").update({ sort_order: swap.sort_order }).eq("id", s.id);
    await supabase.from("services").update({ sort_order: s.sort_order }).eq("id", swap.id);
    refresh();
  };

  const toggleActive = async (s: CatalogService) => {
    if (!s.is_active && s.photos.length < 2) {
      toast.error("Add at least 2 photos before publishing this service.");
      return;
    }
    await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    refresh();
  };

  const remove = async () => {
    if (!deleting) return;
    // Delete photo files first (storage doesn't cascade with row delete)
    if (deleting.photos.length) {
      await supabase.storage.from("service-photos").remove(deleting.photos.map((p) => p.storage_path));
    }
    const { error } = await supabase.from("services").delete().eq("id", deleting.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Service deleted");
    setDeleting(null);
    refresh();
  };

  if (!categories?.length) {
    return (
      <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Add a category first, then you can add services to it.
      </div>
    );
  }

  return (
    <div>
      <Tabs value={tabValue} onValueChange={setActiveCat}>
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-card p-1">
          {categories.map((c) => (
            <TabsTrigger key={c.id} value={c.id} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {c.name} {!c.is_active && <span className="ml-1 text-[10px] opacity-60">(hidden)</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((c) => {
          const list = (services ?? []).filter((s) => s.category_id === c.id).sort((a, b) => a.sort_order - b.sort_order);
          return (
            <TabsContent key={c.id} value={c.id} className="mt-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{list.length} service{list.length === 1 ? "" : "s"}</p>
                <Button
                  onClick={() => setEditing({ service: { category_id: c.id, is_active: false }, categoryId: c.id })}
                  className="bg-gradient-gold text-primary-foreground"
                >
                  <Plus className="mr-2 h-4 w-4" /> New service
                </Button>
              </div>

              <div className="overflow-hidden rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-card text-left text-xs uppercase tracking-widest text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Photos</th>
                      <th className="px-4 py-3">Fields</th>
                      <th className="px-4 py-3">Live</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((s, i, arr) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-4 py-3">
                          <div className="inline-flex">
                            <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(s, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" disabled={i === arr.length - 1} onClick={() => move(s, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <span className="mr-2">{s.icon}</span>{s.name}
                          <div className="text-[11px] text-muted-foreground">/{s.slug}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs ${s.photos.length < 2 ? "text-destructive" : "text-foreground"}`}>
                            <ImageIcon className="h-3 w-3" /> {s.photos.length} / 5
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{s.fields.length}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" onClick={() => toggleActive(s)}>
                            {s.is_active ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                          </Button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => setEditing({ service: s, categoryId: s.category_id })}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleting(s)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </td>
                      </tr>
                    ))}
                    {list.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No services in this category yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {editing.service && editing.categoryId && (
        <ServiceEditor
          service={editing.service}
          categoryId={editing.categoryId}
          onClose={() => { setEditing({ service: null }); refresh(); }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the service, its booking form, and all uploaded photos.
              Past customer orders keep a snapshot. Cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};