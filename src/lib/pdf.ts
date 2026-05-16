import { jsPDF } from "jspdf";
import { fmtPKR, fmtDate } from "./format";

export interface BillItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  discounted_price: number;
}

export interface ShopProfile {
  shop_name: string;
  address: string;
  phone: string;
}

export interface Bill {
  bill_number: string;
  customer_name: string;
  customer_phone: string;
  items: BillItem[];
  subtotal: number;
  discount_total: number;
  total: number;
  note: string;
  created_at: string;
}

export function exportBillPdf(bill: Bill, shop: ShopProfile) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  let y = 0;

  // Black header band
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, W, 44, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(shop.shop_name.toUpperCase(), 18, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(140, 140, 140);
  if (shop.address) doc.text(shop.address, 18, 27);
  if (shop.phone) doc.text(shop.phone, 18, 32);

  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text("INVOICE", W - 18, 20, { align: "right" });
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(9);
  doc.text(fmtDate(bill.created_at), W - 18, 26, { align: "right" });

  y = 56;
  // Bill number
  doc.setFont("courier", "bold");
  doc.setFontSize(22);
  doc.setTextColor(26, 26, 26);
  doc.text(`#${bill.bill_number}`, 18, y);
  y += 6;
  doc.setDrawColor(232, 232, 232);
  doc.setLineWidth(0.2);
  doc.line(18, y, W - 18, y);
  y += 8;

  // Customer
  if (bill.customer_name) {
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(18, y, W - 36, 20, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text("BILLED TO", 22, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text(bill.customer_name, 22, y + 12);
    if (bill.customer_phone) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(bill.customer_phone, 22, y + 17);
    }
    y += 26;
  }

  // Items header
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(170, 170, 170);
  doc.text("ITEM", 18, y);
  doc.text("QTY", 120, y, { align: "right" });
  doc.text("UNIT PRICE", 155, y, { align: "right" });
  doc.text("AMOUNT", W - 18, y, { align: "right" });
  y += 2;
  doc.setDrawColor(232, 232, 232);
  doc.line(18, y, W - 18, y);
  y += 6;

  // Items
  for (const it of bill.items) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(20, 20, 20);
    doc.text(it.name || "Item", 18, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(String(it.qty), 120, y, { align: "right" });
    doc.text(fmtPKR(it.discounted_price), 155, y, { align: "right" });
    doc.text(fmtPKR(it.discounted_price * it.qty), W - 18, y, { align: "right" });
    if (it.price > it.discounted_price) {
      y += 4.5;
      doc.setFontSize(8);
      doc.setTextColor(170, 170, 170);
      const saved = (it.price - it.discounted_price) * it.qty;
      doc.text(`Was PKR ${fmtPKR(it.price)} · saved PKR ${fmtPKR(saved)}`, 18, y);
    }
    y += 7;
  }

  y += 4;
  doc.setDrawColor(232, 232, 232);
  doc.line(120, y, W - 18, y);
  y += 6;

  // Totals
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("Original total", 120, y);
  doc.text(`PKR ${fmtPKR(bill.subtotal)}`, W - 18, y, { align: "right" });
  y += 6;

  if (bill.discount_total > 0) {
    doc.setTextColor(29, 158, 117);
    doc.text("Discount", 120, y);
    doc.text(`− PKR ${fmtPKR(bill.discount_total)}`, W - 18, y, { align: "right" });
    y += 6;
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(120, y, W - 18, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 15, 15);
  doc.text("Total", 120, y);
  doc.text(`PKR ${fmtPKR(bill.total)}`, W - 18, y, { align: "right" });
  y += 10;

  if (bill.discount_total > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(29, 158, 117);
    doc.text(`Customer saved PKR ${fmtPKR(bill.discount_total)} on this purchase`, W / 2, y, { align: "center" });
    y += 8;
  }

  if (bill.note) {
    y += 2;
    doc.setLineDashPattern([1, 1], 0);
    doc.setDrawColor(200, 200, 200);
    doc.line(18, y, W - 18, y);
    doc.setLineDashPattern([], 0);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text("NOTE", 18, y);
    y += 5;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(bill.note, W - 36);
    doc.text(lines, 18, y);
    y += lines.length * 5;
  }

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(187, 187, 187);
  doc.text("Generated by BillKar", W / 2, 285, { align: "center" });

  doc.save(`BillKar-${bill.bill_number}.pdf`);
}
