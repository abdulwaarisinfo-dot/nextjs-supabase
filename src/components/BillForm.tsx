import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { fmtPKR } from "@/lib/format";
import type { BillItem } from "@/lib/pdf";

export interface BillFormValues {
  bill_number: string;
  customer_name: string;
  customer_phone: string;
  items: BillItem[];
  note: string;
}

export interface BillFormTotals {
  subtotal: number;
  discount: number;
  total: number;
}

export function newItem(): BillItem {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    name: "",
    qty: 1,
    price: 0,
    discounted_price: 0,
  };
}

export function computeTotals(items: BillItem[]): BillFormTotals {
  let subtotal = 0;
  let total = 0;
  for (const it of items) {
    const qty = Number(it.qty) || 0;
    const price = Number(it.price) || 0;
    const disc = Number(it.discounted_price) || 0;
    subtotal += price * qty;
    total += disc * qty;
  }
  return { subtotal, total, discount: Math.max(0, subtotal - total) };
}

export function BillFormFields({
  values,
  onChange,
}: {
  values: BillFormValues;
  onChange: (v: BillFormValues) => void;
}) {
  const totals = useMemo(() => computeTotals(values.items), [values.items]);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  function update(patch: Partial<BillFormValues>) {
    onChange({ ...values, ...patch });
  }
  function updateItem(id: string, patch: Partial<BillItem>) {
    const items = values.items.map((it) => {
      if (it.id !== id) return it;
      const next = { ...it, ...patch };
      if (patch.price !== undefined && (!it.discounted_price || it.discounted_price === it.price)) {
        next.discounted_price = Number(patch.price) || 0;
      }
      return next;
    });
    update({ items });
  }
  function remove(id: string) {
    if (values.items.length === 1) return;
    update({ items: values.items.filter((it) => it.id !== id) });
  }

  return (
    <div className="bk-stagger flex flex-col gap-4">
      <div className="bk-card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="bk-label">Bill details</p>
          <p className="font-mono text-[11.5px] text-[#86868B]">#{values.bill_number}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            className="bk-input"
            placeholder="Customer name"
            value={values.customer_name}
            onChange={(e) => update({ customer_name: e.target.value })}
          />
          <input
            className="bk-input"
            placeholder="Phone (optional)"
            inputMode="tel"
            value={values.customer_phone}
            onChange={(e) => update({ customer_phone: e.target.value })}
          />
        </div>
      </div>

      <div>
        <p className="bk-label mb-2.5">Items</p>
        <div className="bk-card overflow-hidden">
          {values.items.map((it, idx) => {
            const lineSaving = (Number(it.price) - Number(it.discounted_price)) * Number(it.qty);
            return (
              <div
                key={it.id}
                className="p-4"
                style={{
                  borderTop: idx === 0 ? "none" : "0.5px solid #ECECF0",
                  background: focusedId === it.id ? "#FAFAFC" : "transparent",
                  transition: "background 0.15s",
                }}
                onFocus={() => setFocusedId(it.id)}
                onBlur={() => setFocusedId(null)}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="bk-label">Item {idx + 1}</span>
                  {values.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(it.id)}
                      className="flex items-center gap-1 text-[12px] text-[#C1121F] hover:underline"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  )}
                </div>
                <input
                  className="bk-input mb-2.5"
                  placeholder="Item name"
                  value={it.name}
                  onChange={(e) => updateItem(it.id, { name: e.target.value })}
                />
                <div className="grid grid-cols-3 gap-2">
                  <NumField label="Qty" value={it.qty} onChange={(v) => updateItem(it.id, { qty: v })} min={1} />
                  <NumField label="Price" value={it.price} onChange={(v) => updateItem(it.id, { price: v })} />
                  <NumField label="After disc." value={it.discounted_price} onChange={(v) => updateItem(it.id, { discounted_price: v })} />
                </div>
                {lineSaving > 0 && (
                  <div className="mt-3">
                    <span
                      className="inline-block text-[11px] font-semibold"
                      style={{
                        background: "#E8F6EC",
                        color: "#1C7A35",
                        borderRadius: 6,
                        padding: "3px 8px",
                      }}
                    >
                      Saving PKR {fmtPKR(lineSaving)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => update({ items: [...values.items, newItem()] })}
          className="w-full mt-2.5 py-3 text-[13px] font-medium text-[#86868B] hover:text-[#1D1D1F] transition-colors"
          style={{ border: "0.5px dashed #D8D8DE", borderRadius: 12, background: "#FFFFFF" }}
        >
          + Add another item
        </button>
      </div>

      <div className="bk-card p-5">
        <Row label="Original total" value={`PKR ${fmtPKR(totals.subtotal)}`} muted />
        {totals.discount > 0 && <Row label="Discount" value={`− PKR ${fmtPKR(totals.discount)}`} green />}
        <div className="my-3" style={{ borderTop: "0.5px solid #ECECF0" }} />
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-medium text-[#1D1D1F]">Total</span>
          <span className="text-[22px] font-semibold text-[#000000] font-mono tracking-tight">
            PKR {fmtPKR(totals.total)}
          </span>
        </div>
      </div>

      <div className="bk-card p-5">
        <p className="bk-label mb-2">Note (optional)</p>
        <textarea
          className="bk-input resize-none"
          rows={3}
          style={{ minHeight: 76 }}
          placeholder="e.g. Exchange within 7 days with receipt."
          value={values.note}
          onChange={(e) => update({ note: e.target.value })}
        />
      </div>
    </div>
  );
}

function NumField({
  label, value, onChange, min,
}: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div>
      <label className="block mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#86868B]">
        {label}
      </label>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        className="bk-input font-mono"
        style={{ padding: "11px 12px" }}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        onFocus={(e) => e.target.select()}
      />
    </div>
  );
}

function Row({ label, value, muted, green }: { label: string; value: string; muted?: boolean; green?: boolean }) {
  const color = green ? "#1C7A35" : muted ? "#86868B" : "#1D1D1F";
  return (
    <div className="flex items-center justify-between text-[13px] mb-1.5">
      <span style={{ color }}>{label}</span>
      <span className="font-mono" style={{ color }}>{value}</span>
    </div>
  );
}
