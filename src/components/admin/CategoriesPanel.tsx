import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCatalog";
import type { CatalogCategory } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const blank: Partial<CatalogCategory> = {
  slug: "", name: "", tagline: "", accent_hsl: "45 65% 52%", is_active: true,
};

export const CategoriesPanel = () => {
  const qc = useQueryClient();
  const { data: categories } = useCategories(true);
  const [editing, setEditing] = useState<Partial<CatalogCategory> | null>(null);
  const [deleting, setDeleting] = useState<CatalogCategory | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["services"] });
  };

  const save = async () => {
    if (!editing) return;
    const slug = (editing.slug || slugify(editing.name ?? "")).trim();
    if (!slug || !editing.name) { toast.error("Name is required"); return; }
    setBusy(true);
    try {
      const payload = {
        slug,
        name: editing.name,
        tagline: editing.tagline ?? "",
        accent_hsl: editing.accent_hsl ?? "45 65% 52%",
        is_active: editing.is_active ?? true,
      };
      const { error } = editing.id
        ? await supabase.from("categories").update(payload).eq("id", editing.id)
        : await supabase.from("categories").insert({ ...payload, sort_order: (categories?.length ?? 0) + 1 });
      if (error) throw error;
      toast.success(editing.id ? "Category updated" : "Category created");
      setEditing(null);
      refresh();
    } catch (e: any) { toast.error(e.message ?? "Failed to save"); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("categories").delete().eq("id", deleting.id);
      if (error) throw error;
      toast.success("Category deleted");
      setDeleting(null);
      refresh();
    } catch (e: any) { toast.error(e.message ?? "Failed to delete"); }
    finally { setBusy(false); }
  };

  const move = async (cat: CatalogCategory, dir: -1 | 1) => {
    const sorted = [...(categories ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((c) => c.id === cat.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await supabase.from("categories").update({ sort_order: swap.sort_order }).eq("id", cat.id);
    await supabase.from("categories").update({ sort_order: cat.sort_order }).eq("id", swap.id);
    refresh();
  };

  const toggleActive = async (cat: CatalogCategory) => {
    await supabase.from("categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    refresh();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl tracking-wide">Categories</h2>
          <p className="text-xs text-muted-foreground">Add or remove top-level groups (e.g. MK Foods).</p>
        </div>
        <Button onClick={() => setEditing(blank)} className="bg-gradient-gold text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> New category
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Tagline</th>
              <th className="px-4 py-3">Accent</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(categories ?? []).map((c, i, arr) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="inline-flex">
                    <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(c, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" disabled={i === arr.length - 1} onClick={() => move(c, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{c.name}<div className="text-[11px] text-muted-foreground">/{c.slug}</div></td>
                <td className="px-4 py-3 text-muted-foreground">{c.tagline}</td>
                <td className="px-4 py-3">
                  <span
                    className="inline-block h-5 w-10 rounded-sm border border-border"
                    style={{ backgroundColor: `hsl(${c.accent_hsl})` }}
                    title={c.accent_hsl}
                  />
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(c)}>
                    {c.is_active ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  </Button>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(c)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
            {(categories?.length ?? 0) === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No categories yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit / create dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit category" : "New category"}</DialogTitle>
            <DialogDescription>Group label shown on the storefront.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={editing?.name ?? ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="MK Foods"
              />
            </div>
            <div className="grid gap-2">
              <Label>Slug <span className="text-muted-foreground">(URL key)</span></Label>
              <Input
                value={editing?.slug ?? ""}
                onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                placeholder={slugify(editing?.name ?? "") || "mk-foods"}
                disabled={!!editing?.id}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tagline</Label>
              <Input
                value={editing?.tagline ?? ""}
                onChange={(e) => setEditing({ ...editing, tagline: e.target.value })}
                placeholder="Catering Services"
              />
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                Accent color (HSL)
                <span
                  className="inline-block h-4 w-8 rounded-sm border border-border"
                  style={{ backgroundColor: `hsl(${editing?.accent_hsl ?? "45 65% 52%"})` }}
                />
              </Label>
              <Input
                value={editing?.accent_hsl ?? ""}
                onChange={(e) => setEditing({ ...editing, accent_hsl: e.target.value })}
                placeholder="45 65% 52%"
              />
              <p className="text-[11px] text-muted-foreground">Format: hue saturation% lightness%. Try 25 80% 55% (orange), 145 60% 45% (green), 210 70% 55% (blue).</p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label>Visible on storefront</Label>
                <p className="text-[11px] text-muted-foreground">Hide while you set things up.</p>
              </div>
              <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={busy} className="bg-gradient-gold text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete warning */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the category, every service inside it, all field configurations, and all photos.
              Past customer orders keep a snapshot of the service name and category, but the live link is severed.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={busy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};