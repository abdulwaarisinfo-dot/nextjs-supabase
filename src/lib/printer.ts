// Web Bluetooth ESC/POS thermal printer (58mm, 32 chars/line)
// Works with common BT printers like XPrinter, Goojprt, Munbyn, etc.

import type { Bill, ShopProfile } from "./pdf";
import { fmtPKR, fmtDate } from "./format";

const SERVICE_UUIDS = [
  "000018f0-0000-1000-8000-00805f9b34fb", // most common
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
];
const CHAR_UUIDS = [
  "00002af1-0000-1000-8000-00805f9b34fb",
  "0000ff02-0000-1000-8000-00805f9b34fb",
  "0000ffe1-0000-1000-8000-00805f9b34fb",
];

const LINE = 32;

// ESC/POS bytes
const ESC = 0x1b, GS = 0x1d;
const INIT = new Uint8Array([ESC, 0x40]);
const ALIGN_LEFT = new Uint8Array([ESC, 0x61, 0x00]);
const ALIGN_CENTER = new Uint8Array([ESC, 0x61, 0x01]);
const ALIGN_RIGHT = new Uint8Array([ESC, 0x61, 0x02]);
const BOLD_ON = new Uint8Array([ESC, 0x45, 0x01]);
const BOLD_OFF = new Uint8Array([ESC, 0x45, 0x00]);
const DOUBLE_ON = new Uint8Array([GS, 0x21, 0x11]);
const DOUBLE_OFF = new Uint8Array([GS, 0x21, 0x00]);
const FEED3 = new Uint8Array([0x0a, 0x0a, 0x0a]);
const CUT = new Uint8Array([GS, 0x56, 0x00]);

function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

function enc(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function line(text = ""): Uint8Array {
  return enc(text + "\n");
}

function pad(left: string, right: string, width = LINE): string {
  const space = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(space) + right;
}

function wrap(text: string, width = LINE): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > width) {
      if (cur) out.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

function divider(ch = "-"): Uint8Array {
  return line(ch.repeat(LINE));
}

export function buildReceipt(bill: Bill, shop: ShopProfile): Uint8Array {
  const parts: Uint8Array[] = [INIT];

  // Header
  parts.push(ALIGN_CENTER, BOLD_ON, DOUBLE_ON);
  parts.push(line(shop.shop_name.toUpperCase().slice(0, 16)));
  parts.push(DOUBLE_OFF, BOLD_OFF);
  if (shop.address) for (const l of wrap(shop.address)) parts.push(line(l));
  if (shop.phone) parts.push(line(shop.phone));
  parts.push(line(""));

  parts.push(ALIGN_LEFT);
  parts.push(divider());
  parts.push(line(pad(`Bill #${bill.bill_number}`, fmtDate(bill.created_at).replace(/,/g, ""))));
  if (bill.customer_name) parts.push(line(`Customer: ${bill.customer_name}`));
  if (bill.customer_phone) parts.push(line(`Phone   : ${bill.customer_phone}`));
  parts.push(divider());

  // Header row
  parts.push(BOLD_ON);
  parts.push(line(pad("ITEM", pad("QTY", "AMOUNT", 13), LINE)));
  parts.push(BOLD_OFF);
  parts.push(divider());

  // Items
  for (const it of bill.items) {
    const amt = `${fmtPKR(it.discounted_price * it.qty)}`;
    const qty = String(it.qty);
    const rightCol = pad(qty, amt, 13);
    const nameLines = wrap(it.name || "Item", LINE - rightCol.length - 1);
    parts.push(line(pad(nameLines[0], rightCol)));
    for (let i = 1; i < nameLines.length; i++) parts.push(line(nameLines[i]));
    if (it.price > it.discounted_price) {
      parts.push(line(`  was ${fmtPKR(it.price)}/u`));
    }
  }

  parts.push(divider());
  parts.push(line(pad("Subtotal", `Rs ${fmtPKR(bill.subtotal)}`)));
  if (bill.discount_total > 0) {
    parts.push(line(pad("Discount", `- ${fmtPKR(bill.discount_total)}`)));
  }
  parts.push(divider("="));
  parts.push(BOLD_ON, DOUBLE_ON);
  parts.push(line(pad("TOTAL", `${fmtPKR(bill.total)}`, 16)));
  parts.push(DOUBLE_OFF, BOLD_OFF);
  parts.push(line("Amount in PKR"));
  parts.push(divider("="));

  if (bill.discount_total > 0) {
    parts.push(ALIGN_CENTER);
    parts.push(line(`You saved Rs ${fmtPKR(bill.discount_total)}`));
    parts.push(ALIGN_LEFT);
  }

  if (bill.note) {
    parts.push(line(""));
    parts.push(line("NOTE:"));
    for (const l of wrap(bill.note)) parts.push(line(l));
  }

  parts.push(line(""));
  parts.push(ALIGN_CENTER);
  parts.push(line("Thank you!"));
  parts.push(line("Powered by BillKar"));
  parts.push(FEED3);
  parts.push(CUT);

  return concat(parts);
}

interface Nav {
  bluetooth?: {
    requestDevice(options: unknown): Promise<{
      gatt?: {
        connect(): Promise<{
          getPrimaryService(uuid: string): Promise<{
            getCharacteristic(uuid: string): Promise<{
              writeValueWithoutResponse?(v: BufferSource): Promise<void>;
              writeValue(v: BufferSource): Promise<void>;
            }>;
          }>;
          disconnect(): void;
        }>;
      };
    }>;
  };
}

export function isPrinterSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return !!(navigator as unknown as Nav).bluetooth;
}

export async function printThermal(bill: Bill, shop: ShopProfile): Promise<void> {
  const nav = navigator as unknown as Nav;
  if (!nav.bluetooth) {
    throw new Error("Bluetooth printing isn't supported on this device. Use Chrome on Android.");
  }
  const device = await nav.bluetooth.requestDevice({
    filters: SERVICE_UUIDS.map((s) => ({ services: [s] })),
    optionalServices: SERVICE_UUIDS,
  });
  if (!device.gatt) throw new Error("Printer has no GATT server.");
  const server = await device.gatt.connect();

  // Find first matching service/char
  let writer: { writeValue(v: BufferSource): Promise<void>; writeValueWithoutResponse?(v: BufferSource): Promise<void> } | null = null;
  for (const s of SERVICE_UUIDS) {
    try {
      const svc = await server.getPrimaryService(s);
      for (const c of CHAR_UUIDS) {
        try {
          writer = await svc.getCharacteristic(c);
          if (writer) break;
        } catch { /* try next */ }
      }
      if (writer) break;
    } catch { /* try next */ }
  }
  if (!writer) {
    server.disconnect();
    throw new Error("Could not find a writable characteristic on this printer.");
  }

  const data = buildReceipt(bill, shop);
  const chunkSize = 180;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (writer.writeValueWithoutResponse) {
      await writer.writeValueWithoutResponse(chunk);
    } else {
      await writer.writeValue(chunk);
    }
  }
  setTimeout(() => { try { server.disconnect(); } catch { /* noop */ } }, 400);
}
