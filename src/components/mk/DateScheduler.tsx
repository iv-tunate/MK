import { useEffect, useMemo, useState } from "react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CartSchedule, ScheduleEntry, ScheduleMode } from "@/contexts/CartContext";

const toKey = (d: Date) => format(d, "yyyy-MM-dd");
const prettyDate = (key: string) => {
  try { return format(parseISO(key), "EEE, d MMM yyyy"); } catch { return key; }
};

const MODES: { value: ScheduleMode; label: string; hint: string }[] = [
  { value: "single", label: "Single day",     hint: "One date and time" },
  { value: "multi",  label: "Specific days",  hint: "Pick several dates" },
  { value: "range",  label: "Date range",     hint: "From → to (every day)" },
];

export interface DateSchedulerProps {
  value?: CartSchedule;
  onChange: (v: CartSchedule) => void;
  defaultTime?: string;       // "HH:MM"
}

export const DateScheduler = ({ value, onChange, defaultTime = "09:00" }: DateSchedulerProps) => {
  const [mode, setMode] = useState<ScheduleMode>(value?.mode ?? "single");
  const [entries, setEntries] = useState<ScheduleEntry[]>(value?.dates ?? []);
  const [rangeFrom, setRangeFrom] = useState<Date | undefined>();
  const [rangeTo, setRangeTo] = useState<Date | undefined>();

  // hydrate range from existing entries on mount / value change
  useEffect(() => {
    if (mode === "range" && entries.length) {
      const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
      setRangeFrom(parseISO(sorted[0].date));
      setRangeTo(parseISO(sorted[sorted.length - 1].date));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // bubble up
  useEffect(() => {
    onChange({ mode, dates: entries });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, entries]);

  const setEntry = (idx: number, patch: Partial<ScheduleEntry>) =>
    setEntries((p) => p.map((e, i) => (i === idx ? { ...e, ...patch } : e)));

  const removeEntry = (idx: number) =>
    setEntries((p) => p.filter((_, i) => i !== idx));

  /* ---------- mode change ---------- */
  const switchMode = (m: ScheduleMode) => {
    setMode(m);
    if (m === "single") {
      setEntries((p) => (p.length ? [{ date: p[0].date, time: p[0].time || defaultTime }] : []));
    }
    if (m === "multi") {
      // keep all entries
    }
    if (m === "range") {
      // keep nothing yet — wait for picker
      setRangeFrom(undefined); setRangeTo(undefined);
    }
  };

  /* ---------- single ---------- */
  const singleDate = entries[0]?.date ? parseISO(entries[0].date) : undefined;
  const singleTime = entries[0]?.time ?? defaultTime;

  /* ---------- multi ---------- */
  const multiSelected = useMemo(() => entries.map((e) => parseISO(e.date)), [entries]);
  const handleMultiSelect = (dates: Date[] | undefined) => {
    const list = (dates ?? []).map(toKey);
    setEntries((prev) => {
      const map = new Map(prev.map((e) => [e.date, e]));
      // remove unselected
      for (const k of Array.from(map.keys())) if (!list.includes(k)) map.delete(k);
      // add new
      for (const k of list) if (!map.has(k)) map.set(k, { date: k, time: defaultTime });
      return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  /* ---------- range ---------- */
  const handleRangeSelect = (r: { from?: Date; to?: Date } | undefined) => {
    setRangeFrom(r?.from); setRangeTo(r?.to);
    if (r?.from && r?.to) {
      const days = eachDayOfInterval({ start: r.from, end: r.to });
      setEntries((prev) => {
        const prevMap = new Map(prev.map((e) => [e.date, e]));
        return days.map((d) => {
          const k = toKey(d);
          return prevMap.get(k) ?? { date: k, time: defaultTime };
        });
      });
    } else if (r?.from && !r?.to) {
      const k = toKey(r.from);
      setEntries([{ date: k, time: defaultTime }]);
    } else {
      setEntries([]);
    }
  };

  /* ---------- bulk apply time ---------- */
  const applyTimeToAll = (t: string) =>
    setEntries((p) => p.map((e) => ({ ...e, time: t })));

  return (
    <div className="grid gap-4 rounded-md border border-border bg-input/40 p-3">
      {/* Mode toggle */}
      <div className="grid grid-cols-3 gap-1.5">
        {MODES.map((m) => (
          <button
            type="button"
            key={m.value}
            onClick={() => switchMode(m.value)}
            className={cn(
              "rounded-md border px-2 py-2 text-left text-xs transition-colors",
              mode === m.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider">{m.label}</div>
            <div className="mt-0.5 text-[10px] opacity-80">{m.hint}</div>
          </button>
        ))}
      </div>

      {/* SINGLE */}
      {mode === "single" && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start font-normal", !singleDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {singleDate ? prettyDate(toKey(singleDate)) : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={singleDate}
                onSelect={(d) => d && setEntries([{ date: toKey(d), time: singleTime }])}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            value={singleTime}
            onChange={(e) => setEntries((p) => [{ date: p[0]?.date ?? "", time: e.target.value }].filter((x) => x.date))}
            className="w-32 bg-input border-border"
          />
        </div>
      )}

      {/* MULTI */}
      {mode === "multi" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {entries.length ? `${entries.length} day${entries.length === 1 ? "" : "s"} selected` : "Pick dates"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="multiple"
              selected={multiSelected}
              onSelect={handleMultiSelect}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* RANGE */}
      {mode === "range" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {rangeFrom && rangeTo
                ? `${prettyDate(toKey(rangeFrom))} → ${prettyDate(toKey(rangeTo))}`
                : rangeFrom
                ? `${prettyDate(toKey(rangeFrom))} → …`
                : "Pick a range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: rangeFrom, to: rangeTo }}
              onSelect={handleRangeSelect as any}
              numberOfMonths={2}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Per-day editor (multi & range) */}
      {(mode === "multi" || mode === "range") && entries.length > 0 && (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Times ({entries.length} day{entries.length === 1 ? "" : "s"})
            </Label>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              Apply to all
              <Input
                type="time"
                defaultValue={defaultTime}
                onChange={(e) => applyTimeToAll(e.target.value)}
                className="h-7 w-24 bg-input border-border"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-auto rounded-md border border-border">
            {entries.map((e, idx) => (
              <div key={e.date} className="flex items-center gap-2 border-b border-border/60 px-2 py-1.5 last:border-0">
                <span className="flex-1 text-xs">{prettyDate(e.date)}</span>
                <Input
                  type="time"
                  value={e.time}
                  onChange={(ev) => setEntry(idx, { time: ev.target.value })}
                  className="h-7 w-24 bg-input border-border"
                />
                {mode === "multi" && (
                  <button
                    type="button"
                    onClick={() => removeEntry(idx)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Remove date"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** Human-readable summary lines for a CartSchedule (used in cart, order message, etc.) */
export function summarizeSchedule(s: CartSchedule | undefined): string[] {
  if (!s || !s.dates.length) return [];
  const fmt = (e: ScheduleEntry) => `${prettyDate(e.date)} @ ${e.time || "—"}`;
  if (s.mode === "single") return [`When: ${fmt(s.dates[0])}`];
  if (s.mode === "range") {
    const sorted = [...s.dates].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0]; const last = sorted[sorted.length - 1];
    const head = `When: ${prettyDate(first.date)} → ${prettyDate(last.date)} (${sorted.length} day${sorted.length === 1 ? "" : "s"})`;
    const allSame = sorted.every((e) => e.time === sorted[0].time);
    if (allSame) return [head, `Time: ${sorted[0].time} each day`];
    return [head, ...sorted.map((e) => `  • ${prettyDate(e.date)} @ ${e.time || "—"}`)];
  }
  // multi
  const sorted = [...s.dates].sort((a, b) => a.date.localeCompare(b.date));
  return [
    `When: ${sorted.length} day${sorted.length === 1 ? "" : "s"}`,
    ...sorted.map((e) => `  • ${fmt(e)}`),
  ];
}