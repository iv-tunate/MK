import type { CartItem } from "@/contexts/CartContext";
import { BUSINESS } from "./config";
import { summarizeSchedule } from "@/components/mk/DateScheduler";

export function buildOrderMessage(args: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: CartItem[];
  notes?: string;
}): string {
  const { orderNumber, customerName, customerEmail, customerPhone, items, notes } = args;

  // Group by category snapshot stored on each cart item; preserves order of first appearance.
  const groups = new Map<string, { name: string; items: CartItem[] }>();
  for (const it of items) {
    const key = it.categorySlug;
    if (!groups.has(key)) groups.set(key, { name: it.categoryName, items: [] });
    groups.get(key)!.items.push(it);
  }

  const lines: string[] = [];
  lines.push(`*NEW ORDER — ${BUSINESS.name}*`);
  lines.push(`Order ID: *${orderNumber}*`);
  lines.push("");
  lines.push(`*Customer*`);
  lines.push(`Name: ${customerName}`);
  lines.push(`Email: ${customerEmail}`);
  lines.push(`Phone: ${customerPhone}`);
  lines.push("");

  for (const g of groups.values()) {
    lines.push(`*${g.name}*`);
    for (const it of g.items) {
      lines.push(`• *${it.serviceName}* × ${it.quantity}`);
      for (const s of it.summary) lines.push(`   - ${s}`);
      if (it.location)    lines.push(`   - Location: ${it.location}`);
      if (it.schedule && it.schedule.dates.length) {
        for (const s of summarizeSchedule(it.schedule)) lines.push(`   - ${s}`);
      } else if (it.serviceDate) {
        lines.push(`   - When: ${formatDate(it.serviceDate)}`);
      }
      if (it.duration)    lines.push(`   - Duration: ${it.duration}`);
    }
    lines.push("");
  }

  if (notes && notes.trim()) {
    lines.push("*Notes*");
    lines.push(notes.trim());
    lines.push("");
  }

  lines.push("Please reply with payment details. Thank you!");
  return lines.join("\n");
}

export function buildCancellationMessage(args: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  reasons: string[];
  note?: string;
}): string {
  const { orderNumber, customerName, customerEmail, reasons, note } = args;
  const lines: string[] = [];
  lines.push(`*CANCELLATION REQUEST — ${BUSINESS.name}*`);
  lines.push(`Order ID: *${orderNumber}*`);
  lines.push("");
  lines.push(`*Customer*`);
  lines.push(`Name: ${customerName}`);
  lines.push(`Email: ${customerEmail}`);
  lines.push("");
  lines.push(`*Reason(s)*`);
  for (const r of reasons) lines.push(`• ${r}`);
  if (note && note.trim()) {
    lines.push("");
    lines.push(`*Additional notes*`);
    lines.push(note.trim());
  }
  lines.push("");
  lines.push(`Please review and cancel from the admin dashboard.`);
  return lines.join("\n");
}

export function buildQuoteMessage(args: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
}): string {
  return [
    `*QUOTE REQUEST — ${BUSINESS.name}*`,
    "",
    `Name: ${args.customerName}`,
    `Email: ${args.customerEmail}`,
    `Phone: ${args.customerPhone}`,
    "",
    `*What I need:*`,
    args.description.trim(),
    "",
    `Please advise.`,
  ].join("\n");
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}