import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Star, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogField, CatalogFieldOption, CatalogPhoto, CatalogService, FieldKind } from "@/lib/catalog";
import { photoUrl, PHOTO_BUCKET } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { NAIRA } from "@/lib/pricing";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const FIELD_KINDS: { value: FieldKind; label: string }[] = [
  { value: "qty",      label: "Quantity (number stepper)" },
  { value: "text",     label: "Text input" },
  { value: "select",   label: "Dropdown" },
  { value: "checkbox", label: "Checkbox (yes/no)" },
  { value: "datetime", label: "Date & time" },
];

type DraftField = Partial<CatalogField> & { _localId: string; _dirty?: boolean; _new?: boolean };

type DraftOption = Partial<CatalogFieldOption> & { _localId: string; _dirty?: boolean; _new?: boolean; _delete?: boolean };

export const ServiceEditor = ({
  service, categoryId, onClose,
}: { service: Partial<CatalogService>; categoryId: string; onClose: () => void }) => {
  const isNew = !service.id;
  const [name, setName]               = useState(service.name ?? "");
  const [slug, setSlug]               = useState(service.slug ?? "");
  const [icon, setIcon]               = useState(service.icon ?? "✨");
  const [description, setDescription] = useState(service.description ?? "");
  const [info, setInfo]               = useState(service.info ?? "");
  const [isActive, setIsActive]       = useState(service.is_active ?? false);
  const [basePrice, setBasePrice]     = useState<number>(service.base_price_naira ?? 0);
  const [pricePerDay, setPricePerDay] = useState<boolean>(!!service.price_per_day);
  const [serviceId, setServiceId]     = useState(service.id);
  const [photos, setPhotos]           = useState<CatalogPhoto[]>(service.photos ?? []);
  const [fields, setFields]           = useState<DraftField[]>(
    (service.fields ?? []).map((f) => ({ ...f, _localId: f.id }))
  );
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("basics");

  // auto-derive slug from name on new
  useEffect(() => {
    if (isNew && !slug && name) setSlug(slugify(name));
  }, [name, slug, isNew]);

  // ---------------- save basics ----------------
  const saveBasics = async (): Promise<string | null> => {
    if (!name.trim()) { toast.error("Name is required"); return null; }
    const finalSlug = slug || slugify(name);
    const payload = {
      category_id: categoryId,
      name: name.trim(),
      slug: finalSlug,
      icon: icon || "✨",
      description: description.trim(),
      info: info.trim(),
      is_active: isActive,
      base_price_naira: Math.max(0, Math.round(basePrice || 0)),
      price_per_day: pricePerDay,
    };
    if (serviceId) {
      const { error } = await supabase.from("services").update(payload).eq("id", serviceId);
      if (error) { toast.error(error.message); return null; }
      return serviceId;
    } else {
      const { data, error } = await supabase
        .from("services")
        .insert({ ...payload, sort_order: 999, is_active: false })
        .select("id")
        .single();
      if (error) { toast.error(error.message); return null; }
      setServiceId(data.id);
      setIsActive(false);
      return data.id;
    }
  };

  // ---------------- field builder ----------------
  const addField = (kind: FieldKind) => {
    const _localId = crypto.randomUUID();
    setFields((prev) => [
      ...prev,
      {
        _localId, _new: true, _dirty: true,
        kind, field_key: "", label: "", required: false, sort_order: prev.length + 1,
        options: kind === "select" ? [""] : null,
        field_options: [],
        default_num: kind === "qty" ? 1 : null, min_num: kind === "qty" ? 1 : null,
      },
    ]);
  };

  const updateField = (id: string, patch: Partial<DraftField>) =>
    setFields((prev) => prev.map((f) => (f._localId === id ? { ...f, ...patch, _dirty: true } : f)));

  const deleteField = async (f: DraftField) => {
    if (f.id) {
      const { error } = await supabase.from("service_fields").delete().eq("id", f.id);
      if (error) { toast.error(error.message); return; }
    }
    setFields((prev) => prev.filter((x) => x._localId !== f._localId));
  };

  const moveField = (id: string, dir: -1 | 1) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f._localId === id);
      const swap = prev[idx + dir];
      if (!swap) return prev;
      const next = [...prev];
      next[idx] = { ...swap, _dirty: true };
      next[idx + dir] = { ...prev[idx], _dirty: true };
      return next.map((f, i) => ({ ...f, sort_order: i + 1 }));
    });
  };

  const saveFields = async (sid: string) => {
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f._dirty) continue;
      if (!f.field_key || !f.label || !f.kind) {
        toast.error("Every field needs a key, label and type");
        return false;
      }
      const payload = {
        service_id: sid,
        kind: f.kind,
        field_key: f.field_key,
        label: f.label,
        placeholder: f.placeholder ?? null,
        info: f.info ?? null,
        required: !!f.required,
        default_num: f.kind === "qty" ? (f.default_num ?? null) : null,
        min_num:     f.kind === "qty" ? (f.min_num ?? null) : null,
        max_num:     f.kind === "qty" ? (f.max_num ?? null) : null,
        options:     f.kind === "select"
                       ? ((f.field_options ?? []).length
                            ? (f.field_options as DraftOption[]).filter((o) => !o._delete && o.label?.trim()).map((o) => o.label!.trim())
                            : (f.options ?? []).filter((o) => o.trim()))
                       : null,
        sort_order: i + 1,
      };
      if (f.id) {
        const { error } = await supabase.from("service_fields").update(payload).eq("id", f.id);
        if (error) { toast.error(error.message); return false; }
      } else {
        const { data, error } = await supabase.from("service_fields").insert(payload).select("id").single();
        if (error) { toast.error(error.message); return false; }
        f.id = data.id;
        f._new = false;
      }

      // Sync rich field_options (per-option pricing / stock)
      if (f.kind === "select" && f.field_options) {
        const opts = f.field_options as DraftOption[];
        for (let j = 0; j < opts.length; j++) {
          const o = opts[j];
          if (o._delete && o.id) {
            await supabase.from("service_field_options").delete().eq("id", o.id);
            continue;
          }
          if (!o.label?.trim()) continue;
          const op = {
            field_id: f.id!,
            label: o.label.trim(),
            price_modifier_naira: Math.max(0, Math.round(o.price_modifier_naira ?? 0)),
            stock: o.stock ?? null,
            sort_order: j + 1,
            is_active: o.is_active ?? true,
          };
          if (o.id) {
            await supabase.from("service_field_options").update(op).eq("id", o.id);
          } else {
            const { data } = await supabase.from("service_field_options").insert(op).select("id").single();
            if (data) o.id = data.id;
          }
        }
      }

      f._dirty = false;
    }
    return true;
  };

  // ---------------- photos ----------------
  const MAX_PHOTOS = 7;

  const handleBulkUpload = async (files: FileList) => {
    const sid = serviceId ?? (await saveBasics());
    if (!sid) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) { toast.error(`Max ${MAX_PHOTOS} photos reached`); return; }
    const toUpload = Array.from(files).slice(0, remaining);
    if (files.length > remaining) {
      toast.warning(`Only ${remaining} photo(s) uploaded — max ${MAX_PHOTOS} total`);
    }
    setBusy(true);
    let uploadedCount = photos.length;
    try {
      for (const file of toUpload) {
        if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: exceeds 5 MB — skipped`); continue; }
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${sid}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
          cacheControl: "3600", upsert: false, contentType: file.type,
        });
        if (upErr) { toast.error(upErr.message); continue; }
        const isPrimary = uploadedCount === 0;
        const { data, error } = await supabase
          .from("service_photos")
          .insert({ service_id: sid, storage_path: path, is_primary: isPrimary, sort_order: uploadedCount + 1 })
          .select("*").single();
        if (error) { toast.error(error.message); continue; }
        setPhotos((p) => [...p, { ...(data as any), url: photoUrl(path) }]);
        uploadedCount++;
      }
    } finally { setBusy(false); }
  };

  const removePhoto = async (p: CatalogPhoto) => {
    await supabase.storage.from(PHOTO_BUCKET).remove([p.storage_path]);
    await supabase.from("service_photos").delete().eq("id", p.id);
    setPhotos((prev) => prev.filter((x) => x.id !== p.id));
  };

  const setPrimary = async (p: CatalogPhoto) => {
    if (!serviceId) return;
    await supabase.from("service_photos").update({ is_primary: false }).eq("service_id", serviceId);
    await supabase.from("service_photos").update({ is_primary: true }).eq("id", p.id);
    setPhotos((prev) => prev.map((x) => ({ ...x, is_primary: x.id === p.id })));
  };

  const updateCaption = async (p: CatalogPhoto, caption: string) => {
    setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, caption } : x)));
    await supabase.from("service_photos").update({ caption: caption || null }).eq("id", p.id);
  };

  // ---------------- save & close ----------------
  const saveAll = async () => {
    setBusy(true);
    try {
      const sid = await saveBasics();
      if (!sid) return;
      const ok = await saveFields(sid);
      if (!ok) return;
      toast.success("Saved");
    } finally { setBusy(false); }
  };

  const photoCountOk = photos.length >= 2 && photos.length <= MAX_PHOTOS;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full max-w-2xl overflow-y-auto bg-background sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{isNew ? "New service" : `Edit — ${name}`}</SheetTitle>
          <SheetDescription>
            Configure the basics, build the booking form, and upload 2–7 photos. Service stays hidden until you have ≥2 photos and toggle it live.
          </SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList className="w-full bg-card">
            <TabsTrigger value="basics" className="flex-1">Basics</TabsTrigger>
            <TabsTrigger value="fields" className="flex-1">Form ({fields.length})</TabsTrigger>
            <TabsTrigger value="photos" className="flex-1">
              Photos ({photos.length}/{MAX_PHOTOS}){!photoCountOk && <span className="ml-1 text-destructive">!</span>}
            </TabsTrigger>
          </TabsList>

          {/* ---------- BASICS ---------- */}
          <TabsContent value="basics" className="mt-6 grid gap-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bouncers" />
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-2">
                <Label>Slug (URL key)</Label>
                <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} disabled={!isNew} />
              </div>
              <div className="grid gap-2">
                <Label>Icon (emoji)</Label>
                <Input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-20 text-center text-xl" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Short description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>Tooltip / longer info</Label>
              <Textarea value={info} onChange={(e) => setInfo(e.target.value)} rows={3} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <Label>Live on storefront</Label>
                <p className="text-[11px] text-muted-foreground">
                  Requires at least 2 photos. {photos.length < 2 && <span className="text-destructive">Currently {photos.length}.</span>}
                </p>
              </div>
              <Switch
                checked={isActive}
                disabled={photos.length < 2}
                onCheckedChange={setIsActive}
              />
            </div>
          </TabsContent>

          {/* ---------- FIELDS ---------- */}
          <TabsContent value="fields" className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Fields the customer fills out before adding to cart.</p>
              <Select onValueChange={(v) => addField(v as FieldKind)}>
                <SelectTrigger className="w-56"><SelectValue placeholder="+ Add field…" /></SelectTrigger>
                <SelectContent>
                  {FIELD_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              {fields.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No fields yet. Add one above.
                </div>
              )}
              {fields.map((f, i) => (
                <div key={f._localId} className="rounded-md border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="rounded-sm border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">{f.kind}</span>
                    <div className="inline-flex">
                      <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => moveField(f._localId, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" disabled={i === fields.length - 1} onClick={() => moveField(f._localId, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteField(f)} className="text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Label (shown to customer)</Label>
                      <Input value={f.label ?? ""} onChange={(e) => updateField(f._localId, { label: e.target.value })} />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px]">Key (machine name, no spaces)</Label>
                      <Input
                        value={f.field_key ?? ""}
                        onChange={(e) => updateField(f._localId, { field_key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                        placeholder="guards"
                      />
                    </div>
                  </div>

                  {(f.kind === "text" || f.kind === "datetime" || f.kind === "select") && (
                    <div className="mt-2 flex items-center gap-2">
                      <Switch checked={!!f.required} onCheckedChange={(v) => updateField(f._localId, { required: v })} />
                      <Label className="text-[11px]">Required</Label>
                    </div>
                  )}

                  {f.kind === "text" && (
                    <div className="mt-2 grid gap-1">
                      <Label className="text-[11px]">Placeholder</Label>
                      <Input value={f.placeholder ?? ""} onChange={(e) => updateField(f._localId, { placeholder: e.target.value })} />
                    </div>
                  )}

                  {f.kind === "qty" && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div className="grid gap-1">
                        <Label className="text-[11px]">Default</Label>
                        <Input type="number" value={f.default_num ?? 1} onChange={(e) => updateField(f._localId, { default_num: Number(e.target.value) })} />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[11px]">Min</Label>
                        <Input type="number" value={f.min_num ?? 1} onChange={(e) => updateField(f._localId, { min_num: Number(e.target.value) })} />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-[11px]">Max</Label>
                        <Input type="number" value={f.max_num ?? ""} onChange={(e) => updateField(f._localId, { max_num: e.target.value ? Number(e.target.value) : null })} />
                      </div>
                    </div>
                  )}

                  {f.kind === "select" && (
                    <div className="mt-2 grid gap-2">
                      <Label className="text-[11px]">Options</Label>
                      {(f.options ?? []).map((opt, oi) => (
                        <div key={oi} className="flex gap-2">
                          <Input
                            value={opt}
                            onChange={(e) => {
                              const next = [...(f.options ?? [])]; next[oi] = e.target.value;
                              updateField(f._localId, { options: next });
                            }}
                          />
                          <Button size="icon" variant="ghost" onClick={() => {
                            const next = (f.options ?? []).filter((_, k) => k !== oi);
                            updateField(f._localId, { options: next });
                          }}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      ))}
                      <Button size="sm" variant="outline" onClick={() => updateField(f._localId, { options: [...(f.options ?? []), ""] })}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add option
                      </Button>
                    </div>
                  )}

                  <div className="mt-2 grid gap-1">
                    <Label className="text-[11px]">Helper info (tooltip)</Label>
                    <Input value={f.info ?? ""} onChange={(e) => updateField(f._localId, { info: e.target.value })} />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* ---------- PHOTOS ---------- */}
          <TabsContent value="photos" className="mt-6">
            <p className="mb-3 text-xs text-muted-foreground">
              Upload 2–7 photos (select multiple at once). The first one (or whichever you mark as primary) is used as the card cover.
              Add a caption (e.g. "Bumble Bee", "Panda") to link a photo to a dropdown option of the same name —
              customers will see the matching picture as they pick.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {photos.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-md border border-border bg-card">
                  <div className="relative aspect-square bg-muted">
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    {p.is_primary && (
                      <span className="absolute left-2 top-2 rounded-sm bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">Primary</span>
                    )}
                  </div>
                  <div className="grid gap-2 p-2">
                    <Input
                      placeholder="Caption (e.g. Bumble Bee)"
                      value={p.caption ?? ""}
                      onChange={(e) => updateCaption(p, e.target.value)}
                      className="h-8 bg-input border-border text-xs"
                    />
                    <div className="flex gap-1">
                      {!p.is_primary && (
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setPrimary(p)}>
                          <Star className="mr-1 h-3 w-3" /> Primary
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => removePhoto(p)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-card hover:border-primary">
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload photos</span>
                  <span className="text-[10px] text-muted-foreground">{MAX_PHOTOS - photos.length} remaining</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const files = e.target.files;
                      e.target.value = "";
                      if (files && files.length > 0) handleBulkUpload(files);
                    }}
                  />
                </label>
              )}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">JPG / PNG / WebP · up to 5 MB each · select multiple files at once.</p>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-border bg-background py-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={saveAll} disabled={busy} className="bg-gradient-gold text-primary-foreground">Save changes</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};