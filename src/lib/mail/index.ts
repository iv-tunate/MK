// MK — Brevo email/mailer provider.
// -----------------------------------------------------------------------
// Configuration via environment variables:
//
//   VITE_BREVO_API_KEY=...                        (required)
//   VITE_BREVO_FROM_EMAIL=hello@yourdomain.com    (required)
//   VITE_BREVO_FROM_NAME="MK Hub"                 (optional)
// -----------------------------------------------------------------------

import { renderTemplate, type TemplateName } from "./templates";
import { BUSINESS } from "@/lib/config";

export interface SendOpts {
  to: string;
  template: TemplateName;
  data: Record<string, any>;
  /** Idempotency key — prevents accidental duplicate sends on retry. */
  idempotencyKey: string;
  /** Optional PDF attachment (passed by the order flow). */
  attachment?: { filename: string; mimeType: string; bytes: Uint8Array };
}

export interface MailProvider {
  name: string;
  send(opts: SendOpts): Promise<{ ok: boolean; reason?: string }>;
}

/* ---------------- Brevo provider ---------------- */

const BREVO_KEY    = import.meta.env.VITE_BREVO_API_KEY as string | undefined;
const BREVO_FROM   = (import.meta.env.VITE_BREVO_FROM_EMAIL as string | undefined) ?? BUSINESS.supportEmail;
const BREVO_NAME   = (import.meta.env.VITE_BREVO_FROM_NAME as string | undefined) ?? BUSINESS.name;

const toBase64 = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

const brevoProvider: MailProvider = {
  name: "brevo",
  async send({ to, template, data, attachment }) {
    if (!BREVO_KEY) return { ok: false, reason: "VITE_BREVO_API_KEY not set" };
    const rendered = renderTemplate(template, data);
    const url = "https://api.brevo.com/v3/smtp/email";

    const body: Record<string, any> = {
      sender: { email: BREVO_FROM, name: BREVO_NAME },
      to: [{ email: to }],
      subject: rendered.subject,
      textContent: rendered.text,
      htmlContent: rendered.html,
      tags: [template],
    };
    if (attachment) {
      body.attachment = [{
        name: attachment.filename,
        content: toBase64(attachment.bytes),
      }];
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "api-key": BREVO_KEY,
          "Content-Type": "application/json",
          "accept": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        return { ok: false, reason: `Brevo ${res.status}: ${txt.slice(0, 200)}` };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, reason: e?.message ?? "brevo fetch failed" };
    }
  },
};

/* ---------------- Active provider ---------------- */

const ACTIVE: MailProvider = brevoProvider;

/** Send one transactional email through the active provider. Never throws. */
export const sendMail = async (opts: SendOpts) => {
  try {
    const result = await ACTIVE.send(opts);
    if (!result.ok) console.info(`[mail:${ACTIVE.name}] not sent — ${result.reason}`);
    return result;
  } catch (e: any) {
    console.warn(`[mail:${ACTIVE.name}] threw`, e);
    return { ok: false, reason: e?.message ?? "unknown" };
  }
};

export const activeMailProviderName = () => ACTIVE.name;