import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const STATUS_META: Record<OrderStatus, { label: string; varName: string; description: string }> = {
  pending:     { label: "Pending payment",  varName: "--status-pending",   description: "Awaiting admin to confirm your payment." },
  confirmed:   { label: "Confirmed",        varName: "--status-confirmed", description: "Payment confirmed. Service is scheduled." },
  in_progress: { label: "In progress",      varName: "--status-progress",  description: "Service is currently being delivered." },
  completed:   { label: "Completed",        varName: "--status-completed", description: "Service delivered. Thank you." },
  cancelled:   { label: "Cancelled",        varName: "--status-cancelled", description: "This order has been cancelled by the admin." },
  refunded:    { label: "Refunded",         varName: "--status-refunded",  description: "A refund has been issued." },
};

/**
 * Cancellation is only meaningful when the order is still pending or confirmed
 * AND the earliest service_date is still in the future.
 */
export function canRequestCancellation(status: OrderStatus, earliestServiceDate?: string | null): boolean {
  if (!["pending", "confirmed"].includes(status)) return false;
  if (!earliestServiceDate) return true;
  return new Date(earliestServiceDate).getTime() > Date.now();
}