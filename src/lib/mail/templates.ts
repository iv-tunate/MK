// MK — Email body templates used by the Mailtrap adapter.
// Templates are rendered based on the MESSAGES copy.

import { MESSAGES } from "@/lib/messages";
import { BUSINESS } from "@/lib/config";

export type TemplateName = "order-invoice" | "order-receipt" | "quote-request";

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const wrap = (heading: string, bodyHtml: string) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #eee;">
    <div style="background:#0f0f0f;padding:18px 24px;">
      <h1 style="margin:0;color:#d4a73a;font-size:20px;letter-spacing:.18em;">${BUSINESS.name.toUpperCase()}</h1>
    </div>
    <div style="padding:28px 24px;line-height:1.55;font-size:14px;">
      <h2 style="margin:0 0 14px;font-size:18px;color:#0f0f0f;">${heading}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:14px 24px;background:#fafafa;border-top:1px solid #eee;font-size:11px;color:#888;">
      ${BUSINESS.name} · WhatsApp ${BUSINESS.whatsappDisplay} · ${BUSINESS.supportEmail}
    </div>
  </div>
</body></html>`;

const para = (s: string) => `<p style="margin:0 0 12px;">${s}</p>`;

export const renderTemplate = (
  name: TemplateName,
  data: Record<string, any>,
): RenderedEmail => {
  const firstName = (data.firstName as string) || undefined;

  if (name === "order-invoice") {
    const m = MESSAGES.invoiceEmail;
    const subject = m.subject(data.orderNumber ?? "—");
    const heading = m.heading(firstName);
    const lines = [
      m.intro,
      data.totalLabel ? `<strong>Order ${data.orderNumber}</strong> — total ${data.totalLabel}.` : `Order: <strong>${data.orderNumber}</strong>`,
      m.closing,
      m.signature,
    ];
    return {
      subject,
      text: `${heading}\n\n${lines.join("\n\n").replace(/<[^>]+>/g, "")}`,
      html: wrap(heading, lines.map(para).join("")),
    };
  }

  if (name === "order-receipt") {
    const m = MESSAGES.receiptEmail;
    const subject = m.subject(data.orderNumber ?? "—");
    const heading = m.heading(firstName);
    const lines = [
      m.intro,
      `Order: <strong>${data.orderNumber}</strong>${data.totalLabel ? ` — total <strong>${data.totalLabel}</strong>` : ""}.`,
      m.closing,
      m.signature,
    ];
    return {
      subject,
      text: `${heading}\n\n${lines.join("\n\n").replace(/<[^>]+>/g, "")}`,
      html: wrap(heading, lines.map(para).join("")),
    };
  }

  // quote-request
  const m = MESSAGES.quoteEmail;
  const subject = m.subject();
  const heading = m.heading(firstName);
  const lines = [
    m.intro,
    data.orderNumber ? `Reference: <strong>${data.orderNumber}</strong>` : "",
    m.closing,
    m.signature,
  ].filter(Boolean);
  return {
    subject,
    text: `${heading}\n\n${lines.join("\n\n").replace(/<[^>]+>/g, "")}`,
    html: wrap(heading, lines.map(para).join("")),
  };
};