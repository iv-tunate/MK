// MK — PDF invoice & receipt generation (jsPDF, runs in the browser).
// Returns a Blob ready to upload to Supabase storage.

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import { NAIRA } from "./pricing";
import { BUSINESS } from "./config";
import { MESSAGES } from "./messages";

export interface PdfOrderInput {
  orderNumber: string;
  createdAt: string; // ISO
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    serviceName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    days: number;
    lineTotal: number;
    summary: string[]; // bulleted detail (config + schedule)
  }>;
  subtotal: number;
  total: number;
  notes?: string;
}

const drawHeader = (doc: jsPDF, title: string) => {
  // Brand block (left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20);
  doc.text(BUSINESS.name, 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  MESSAGES.documents.addressBlock.slice(1).forEach((line, i) => {
    doc.text(line, 14, 25 + i * 4.5);
  });

  // Title (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(180, 140, 30); // gold
  doc.text(title, 196, 20, { align: "right" });
};

const drawMeta = (
  doc: jsPDF,
  order: PdfOrderInput,
  startY: number,
  paid: boolean,
) => {
  // Customer block
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("BILL TO", 14, startY);
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text(order.customerName || "—", 14, startY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(order.customerEmail, 14, startY + 11);
  doc.text(order.customerPhone, 14, startY + 15);

  // Order metadata block
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${paid ? "RECEIPT" : "INVOICE"} #`, 130, startY);
  doc.text("DATE", 170, startY);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text(order.orderNumber, 130, startY + 6);
  doc.text(format(parseISO(order.createdAt), "d MMM yyyy"), 170, startY + 6);
  doc.setFont("helvetica", "normal");

  if (paid) {
    // Big PAID stamp
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.setTextColor(34, 134, 58);
    doc.text(MESSAGES.documents.paidStamp, 196, startY + 24, {
      align: "right",
      angle: 12,
    });
    doc.setFont("helvetica", "normal");
  }
};

const drawTable = (doc: jsPDF, order: PdfOrderInput, startY: number) => {
  autoTable(doc, {
    startY,
    head: [["Service", "Qty", "Days", "Unit", "Line total"]],
    body: order.items.map((it) => [
      {
        content: `${it.serviceName}\n${it.category}` +
          (it.summary.length ? "\n  • " + it.summary.join("\n  • ") : ""),
        styles: { cellWidth: 95 },
      },
      String(it.quantity),
      String(it.days),
      NAIRA(it.unitPrice),
      NAIRA(it.lineTotal),
    ]),
    styles: { fontSize: 9, cellPadding: 3, valign: "top" },
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [220, 180, 60],
      fontStyle: "bold",
    },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: 14, right: 14 },
  });
};

const drawTotals = (doc: jsPDF, order: PdfOrderInput, paid: boolean) => {
  const y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Subtotal", 150, y, { align: "right" });
  doc.text(NAIRA(order.subtotal), 196, y, { align: "right" });

  doc.setDrawColor(220);
  doc.line(120, y + 3, 196, y + 3);

  doc.setFontSize(13);
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text(paid ? "PAID" : "TOTAL DUE", 150, y + 11, { align: "right" });
  doc.text(NAIRA(order.total), 196, y + 11, { align: "right" });
  doc.setFont("helvetica", "normal");

  // Notes / footer
  doc.setFontSize(9);
  doc.setTextColor(110);
  if (order.notes) {
    doc.text("Notes", 14, y + 22);
    const wrapped = doc.splitTextToSize(order.notes, 130);
    doc.text(wrapped, 14, y + 27);
  }

  doc.setTextColor(140);
  const footer = paid
    ? MESSAGES.documents.receiptFooter
    : MESSAGES.documents.invoiceFooter;
  doc.text(footer, 14, 285);
};

const buildDoc = (order: PdfOrderInput, paid: boolean): Blob => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  drawHeader(
    doc,
    paid ? MESSAGES.documents.receiptTitle : MESSAGES.documents.invoiceTitle,
  );
  drawMeta(doc, order, 50, paid);
  drawTable(doc, order, 75);
  drawTotals(doc, order, paid);
  return doc.output("blob");
};

export const buildInvoicePdf = (order: PdfOrderInput) => buildDoc(order, false);
export const buildReceiptPdf = (order: PdfOrderInput) => buildDoc(order, true);