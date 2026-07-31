// MK — single place to edit ALL automated message copy.
// Edit any string here to change what your customers receive.
// (For WhatsApp message structure, see src/lib/orderMessage.ts.)

import { BUSINESS } from "./config";

export const MESSAGES = {
  // === Email — quote request acknowledgement (sent right after the quote is submitted) ===
  quoteEmail: {
    subject: () => `We've got your quote request — ${BUSINESS.name}`,
    heading: (firstName?: string) =>
      firstName ? `Thanks, ${firstName}!` : "Thanks for reaching out!",
    intro:
      "We've received your quote request and our team will get back to you with pricing and availability shortly.",
    closing:
      "If anything is urgent, message us on WhatsApp and we'll prioritise it.",
    signature: `— The ${BUSINESS.name} team`,
  },

  // === Email — order invoice (sent right after the customer submits) ===
  invoiceEmail: {
    subject: (orderNumber: string) =>
      `Your ${BUSINESS.name} invoice — ${orderNumber}`,
    heading: (firstName?: string) =>
      firstName ? `Thanks, ${firstName}!` : "Thanks for your order!",
    intro:
      "We've received your booking and our team will reach out shortly to confirm payment. Your invoice is attached below.",
    closing:
      "If you need to make changes, reply to this email or message us on WhatsApp.",
    signature: `— The ${BUSINESS.name} team`,
  },

  // === Email — receipt (sent automatically when admin marks the order completed) ===
  receiptEmail: {
    subject: (orderNumber: string) =>
      `Receipt — ${BUSINESS.name} order ${orderNumber}`,
    heading: (firstName?: string) =>
      firstName ? `Thank you, ${firstName}!` : "Thank you!",
    intro:
      "Your service has been delivered and your payment is confirmed. Your receipt is attached.",
    closing: "We'd love to work with you again. Save us in your contacts!",
    signature: `— The ${BUSINESS.name} team`,
  },

  // === PDF document copy (invoice + receipt) ===
  documents: {
    invoiceTitle: "INVOICE",
    receiptTitle: "RECEIPT",
    paidStamp: "PAID",
    invoiceFooter:
      "Pay via the bank details our team will share on WhatsApp. Quote your invoice number when paying.",
    receiptFooter: "Thank you for your business.",
    addressBlock: [
      BUSINESS.name,
      BUSINESS.tagline,
      `WhatsApp: ${BUSINESS.whatsappDisplay}`,
      `Email: ${BUSINESS.supportEmail}`,
    ],
  },
} as const;