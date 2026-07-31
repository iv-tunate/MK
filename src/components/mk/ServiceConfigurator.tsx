import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InfoTip } from "./InfoTip";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import type { CatalogService, CatalogField, CatalogFieldOption } from "@/lib/catalog";
import { DateScheduler } from "./DateScheduler";
import type { CartSchedule } from "@/contexts/CartContext";
import { unitPriceForSelection, lineTotal, NAIRA, scheduleDays } from "@/lib/pricing";
import { defaultPhotoFor } from "@/lib/defaultPhotos";

export const ServiceConfigurator = ({
  service, onAdded,
}: { service: CatalogService; onAdded?: () => void }) => {
  const { addItem, items: cartItems } = useCart();

  const initial = useMemo(() => {
    const v: Record<string, any> = {};
    for (const f of service.fields) {
      if (f.kind === "qty") v[f.field_key] = f.default_num ?? f.min_num ?? 1;
      else if (f.kind === "checkbox") v[f.field_key] = false;
      else if (f.kind === "select") v[f.field_key] = f.options?.[0] ?? "";
      else v[f.field_key] = "";
    }
    return v;
  }, [service]);
  const [values, setValues] = useState<Record<string, any>>(initial);
  const [schedule, setSchedule] = useState<CartSchedule>({ mode: "single", dates: [] });

  const set = (k: string, v: any) => setValues((p) => ({ ...p, [k]: v }));

  // For "select" fields whose options correspond to photos by caption
  // (e.g. mascots: "Bumble Bee", "Panda"), find the matching photo for preview.
  // If no admin photo is uploaded yet for that option, fall back to a curated
  // default image so the client can still see what they're choosing.
  const photoForOption = (val: string | undefined) => {
    if (!val) return undefined;
    const norm = val.toLowerCase().trim();
    const real = service.photos.find((p) => (p.caption ?? "").toLowerCase().trim() === norm);
    if (real) return real;
    const fallbackUrl = defaultPhotoFor({
      optionLabel: val,
      serviceSlug: service.slug,
      serviceName: service.name,
      categorySlug: service.category_slug,
      categoryName: service.category_name,
    });
    return { url: fallbackUrl, caption: val } as { url: string; caption: string | null };
  };

  // Live pricing
  const qtyField  = service.fields.find((f) => f.kind === "qty");
  const quantity  = qtyField ? Number(values[qtyField.field_key] || 1) : 1;
  const unitPrice = useMemo(() => unitPriceForSelection(service, values), [service, values]);
  const days      = service.price_per_day ? scheduleDays(schedule) : 1;
  const livePrice = useMemo(() =>
    lineTotal({ unitPriceNaira: unitPrice, quantity, pricePerDay: service.price_per_day, schedule }),
    [unitPrice, quantity, service.price_per_day, schedule]
  );

  // Find a select field that should enforce uniqueness across cart
  // (mascot character, etc). We use the convention: any select field with
  // populated `field_options` having stock=1 is treated as unique.
  const uniqueField = service.fields.find(
    (f) => f.kind === "select" && f.field_options?.some((o) => o.stock === 1)
  );

  const handleAdd = () => {
    const missing: string[] = [];
    for (const f of service.fields) {
      if (f.kind === "text" && f.required) {
        if (!values[f.field_key] || String(values[f.field_key]).trim() === "") missing.push(f.label);
      }
      if (f.kind === "datetime" && f.required) {
        if (!schedule.dates.length) missing.push(f.label);
      }
    }
    if (missing.length) { toast.error("Please fill in: " + missing.join(", ")); return; }

    // Stock / uniqueness check (e.g. mascot characters limited per session)
    if (uniqueField) {
      const picked = String(values[uniqueField.field_key] ?? "");
      const opt    = uniqueField.field_options?.find((o) => o.label === picked);
      const cap    = opt?.stock ?? null;
      if (cap !== null) {
        const usedKey = `${service.id}:${uniqueField.field_key}:${picked}`;
        const used    = cartItems.filter((i) => i.uniqueOptionKey === usedKey).length;
        if (used + 1 > cap) {
          toast.error(`Only ${cap} "${picked}" available — already in cart.`);
          return;
        }
      }
    }

    const qty = service.fields.find((f) => f.kind === "qty");
    const loc = service.fields.find(
      (f) => f.kind === "text" && (f.field_key === "location" || f.field_key === "destination" || f.field_key === "pickup")
    );
    const dateField = service.fields.find((f) => f.kind === "datetime");
    const dur  = service.fields.find((f) => f.kind === "select" && f.field_key === "duration");

    const summary: string[] = [];
    for (const f of service.fields) {
      if (f.kind === "qty") continue;
      if (f.kind === "text" && (f.field_key === "location" || f.field_key === "destination" || f.field_key === "pickup")) continue;
      if (f.kind === "datetime") continue;
      if (f.kind === "select" && f.field_key === "duration") continue;
      const val = values[f.field_key];
      if (f.kind === "checkbox") { if (val) summary.push(f.label); continue; }
      if (val !== undefined && val !== "" && val !== null) summary.push(`${f.label}: ${val}`);
    }
    if (loc?.field_key === "pickup"      && values.pickup)      summary.unshift(`Pickup: ${values.pickup}`);
    if (loc?.field_key === "destination" && values.destination) summary.unshift(`Destination: ${values.destination}`);

    addItem({
      serviceId: service.id,
      categorySlug: service.category_slug,
      categoryName: service.category_name,
      serviceName: service.name,
      quantity: qty ? Number(values[qty.field_key]) : 1,
      location: loc ? String(values[loc.field_key] ?? "") : "",
      schedule: dateField && schedule.dates.length ? schedule : undefined,
      duration: dur ? values[dur.field_key] : undefined,
      config: values,
      summary,
      unitPriceNaira: unitPrice,
      pricePerDay: service.price_per_day,
      uniqueOptionKey: uniqueField
        ? `${service.id}:${uniqueField.field_key}:${values[uniqueField.field_key] ?? ""}`
        : undefined,
    });

    toast.success(`${service.name} added to cart`);
    onAdded?.();
  };

  return (
    <div className="rounded-lg border border-primary/40 bg-card p-5 shadow-card-elevated">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-medium tracking-wide text-primary">Configure — {service.name}</h4>
        {service.base_price_naira > 0 && (
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            From <span className="text-foreground font-semibold">{NAIRA(service.base_price_naira)}</span>
            {service.price_per_day ? " / day" : ""}
          </p>
        )}
      </div>
      <div className="grid gap-4">
        {service.fields.map((f) =>
          f.kind === "datetime" ? (
            <div key={f.id} className="grid gap-2">
              <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                {f.label}
                {f.required ? <span className="text-destructive">*</span> : null}
                {f.info && <InfoTip text={f.info} />}
              </Label>
              <DateScheduler value={schedule} onChange={setSchedule} />
            </div>
          ) : (
            <FieldRow
              key={f.id}
              field={f}
              value={values[f.field_key]}
              onChange={(v) => set(f.field_key, v)}
              previewPhoto={f.kind === "select" ? photoForOption(values[f.field_key]) : undefined}
            />
          )
        )}
      </div>

      {/* Live total */}
      {unitPrice > 0 && (
        <div className="mt-5 rounded-md border border-border bg-input/40 p-3 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Unit price{service.price_per_day ? " / day" : ""}</span>
            <span>{NAIRA(unitPrice)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>× quantity</span>
            <span>{quantity}</span>
          </div>
          {service.price_per_day && (
            <div className="flex justify-between text-muted-foreground">
              <span>× days</span>
              <span>{days}</span>
            </div>
          )}
          <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 text-sm font-semibold text-foreground">
            <span>Line total</span>
            <span className="text-primary">{NAIRA(livePrice)}</span>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button onClick={handleAdd} className="bg-gradient-gold text-primary-foreground shadow-gold">
          Add to cart{unitPrice > 0 ? ` — ${NAIRA(livePrice)}` : ""}
        </Button>
      </div>
    </div>
  );
};

const FieldRow = ({
  field, value, onChange, previewPhoto,
}: {
  field: CatalogField;
  value: any;
  onChange: (v: any) => void;
  previewPhoto?: { url: string; caption: string | null };
}) => {
  const labelEl = (
    <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
      {field.kind !== "checkbox" && (
        <>
          {field.label}
          {field.required ? <span className="text-destructive">*</span> : null}
          {field.info && <InfoTip text={field.info} />}
        </>
      )}
    </Label>
  );

  if (field.kind === "qty") {
    const min = field.min_num ?? 1;
    const adjust = (delta: number) => onChange(Math.max(min, Number(value || min) + delta));
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {labelEl}
        <div className="inline-flex items-center overflow-hidden rounded-md border border-border bg-input">
          <button type="button" onClick={() => adjust(-1)} className="flex h-9 w-9 items-center justify-center hover:bg-muted"><Minus className="h-3.5 w-3.5" /></button>
          <div className="flex h-9 w-12 items-center justify-center text-sm font-medium">{value}</div>
          <button type="button" onClick={() => adjust(1)}  className="flex h-9 w-9 items-center justify-center hover:bg-muted"><Plus className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    );
  }

  if (field.kind === "text") {
    return (
      <div className="grid gap-2">
        {labelEl}
        <Input value={value ?? ""} placeholder={field.placeholder ?? ""} onChange={(e) => onChange(e.target.value)} className="bg-input border-border" />
      </div>
    );
  }

  if (field.kind === "datetime") {
    // Handled in the parent (DateScheduler).
    return null;
  }

  if (field.kind === "select") {
    // Prefer rich `field_options` (with prices) when available.
    const richOpts: CatalogFieldOption[] | undefined = field.field_options?.filter((o) => o.is_active);
    const opts = richOpts?.length ? richOpts.map((o) => o.label) : (field.options ?? []);
    const priceFor = (label: string) =>
      richOpts?.find((o) => o.label === label)?.price_modifier_naira ?? 0;
    return (
      <div className="grid gap-2">
        {labelEl}
        <Select value={value ?? opts[0]} onValueChange={onChange}>
          <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            {opts.map((o) => {
              const p = priceFor(o);
              return (
                <SelectItem key={o} value={o}>
                  <span className="flex w-full items-center justify-between gap-3">
                    <span>{o}</span>
                    {p > 0 && <span className="text-[11px] text-muted-foreground">+{NAIRA(p)}</span>}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {previewPhoto && (
          <div className="overflow-hidden rounded-md border border-border bg-muted">
            <img
              src={previewPhoto.url}
              alt={previewPhoto.caption ?? "Selected option"}
              className="h-44 w-full object-cover"
            />
            {previewPhoto.caption && (
              <div className="border-t border-border bg-card/60 px-3 py-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                {previewPhoto.caption}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 pt-1">
      <Checkbox id={field.id} checked={!!value} onCheckedChange={(c) => onChange(!!c)} />
      <Label htmlFor={field.id} className="flex cursor-pointer items-center gap-1.5 text-sm font-normal text-foreground">
        {field.label}
        {field.info && <InfoTip text={field.info} />}
      </Label>
    </div>
  );
};