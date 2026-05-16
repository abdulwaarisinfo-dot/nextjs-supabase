import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Printer, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { SubNav } from "@/components/AppNav";
import { fmtDate, fmtPKR } from "@/lib/format";
import { exportBillPdf, type Bill, type BillItem, type ShopProfile } from "@/lib/pdf";
import { isPrinterSupported, printThermal } from "@/lib/printer";

export const Route = createFileRoute("/bills/$id")({
  component: BillView,
});

function BillView() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [bill, setBill] = useState<Bill | null>(null);
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [confirmDel, setConfirmDel] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    (async () => {
      const [{ data: b, error }, { data: s }] = await Promise.all([
        supabase.from("bills").select("*").eq("id", id).maybeSingle(),
        supabase.from("shop_profiles").select("shop_name,address,phone").maybeSingle(),
      ]);
      if (error || !b) {
        toast("Bill not found");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      setBill({
        bill_number: b.bill_number,
        customer_name: b.customer_name || "",
        customer_phone: b.customer_phone || "",
        items: (b.items as unknown as BillItem[]) || [],
        subtotal: Number(b.subtotal),
        discount_total: Number(b.discount_total),
        total: Number(b.total),
        note: b.note || "",
        created_at: b.created_at || new Date().toISOString(),
      });
      setShop(s ? { shop_name: s.shop_name, address: s.address || "", phone: s.phone || "" } : { shop_name: "BillKar", address: "", phone: "" });
      setFetching(false);
    })();
  }, [id, loading, user, navigate, toast]);

  async function del() {
    const { error } = await supabase.from("bills").delete().eq("id", id);
    if (error) { toast(error.message); return; }
    navigate({ to: "/dashboard", replace: true });
  }

  async function print() {
    if (!bill || !shop) return;
    if (!isPrinterSupported()) { toast("Bluetooth print works on Android Chrome"); return; }
    setPrinting(true);
    try {
      await printThermal(bill, shop);
      toast("Sent to printer");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Print failed";
      if (!msg.toLowerCase().includes("cancel")) toast(msg);
    } finally {
      setPrinting(false);
    }
  }

  if (fetching || !bill || !shop) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="bk-spin text-[#A1A1A6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD]">
      <SubNav
        backTo="/dashboard"
        center={<span className="font-mono text-[12.5px] text-[#86868B]">#{bill.bill_number}</span>}
        right={
          <Link
            to="/bills/$id/edit"
            params={{ id }}
            className="bk-btn bk-btn-ghost"
            style={{ padding: "7px 12px", fontSize: 13, minHeight: 36 }}
          >
            <Pencil size={13} /> Edit
          </Link>
        }
      />

      <div className="max-w-[560px] mx-auto px-4 sm:px-5 py-6 bk-fade bk-safe-bottom">
        <div className="bk-card overflow-hidden">
          <div
            className="text-center px-6 py-7"
            style={{ background: "#F5F5F7", borderBottom: "0.5px solid #ECECF0" }}
          >
            <h2
              className="text-[17px] font-semibold text-[#1D1D1F]"
              style={{ letterSpacing: "0.06em", textTransform: "uppercase" }}
            >
              {shop.shop_name}
            </h2>
            {(shop.address || shop.phone) && (
              <p className="text-[12px] text-[#86868B] mt-1.5 leading-relaxed">
                {[shop.address, shop.phone].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          <div className="px-5 py-5">
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="bk-label">Invoice</p>
                <p className="font-mono text-[20px] text-[#1D1D1F] mt-1 tracking-tight">#{bill.bill_number}</p>
              </div>
              <div className="text-right">
                <p className="bk-label">Date</p>
                <p className="text-[13px] text-[#6E6E73] mt-1">{fmtDate(bill.created_at)}</p>
              </div>
            </div>

            {bill.customer_name && (
              <div
                className="p-3.5 mb-5"
                style={{ background: "#F5F5F7", border: "0.5px solid #ECECF0", borderRadius: 11 }}
              >
                <p className="bk-label">Billed to</p>
                <p className="text-[15px] font-semibold text-[#1D1D1F] mt-1">{bill.customer_name}</p>
                {bill.customer_phone && <p className="text-[12px] text-[#86868B] mt-0.5">{bill.customer_phone}</p>}
              </div>
            )}

            <div className="mb-1">
              <div
                className="grid items-center text-[10.5px] uppercase text-[#86868B] py-2 font-semibold"
                style={{ gridTemplateColumns: "1fr 36px 96px", borderBottom: "0.5px solid #ECECF0", letterSpacing: "0.08em" }}
              >
                <span>Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Amount</span>
              </div>
              {bill.items.map((it, i) => (
                <div
                  key={it.id || i}
                  className="grid items-center py-3"
                  style={{ gridTemplateColumns: "1fr 36px 96px", borderTop: i === 0 ? "none" : "0.5px solid #F5F5F7" }}
                >
                  <div className="pr-2">
                    <p className="text-[14px] font-medium text-[#1D1D1F] leading-snug">{it.name}</p>
                    {it.price > it.discounted_price && (
                      <p className="text-[11px] text-[#86868B] mt-0.5">Was PKR {fmtPKR(it.price)}</p>
                    )}
                  </div>
                  <span className="text-center text-[13px] text-[#86868B] font-mono">{it.qty}</span>
                  <span className="text-right text-[14px] font-semibold text-[#1D1D1F] font-mono tracking-tight">
                    PKR {fmtPKR(it.discounted_price * it.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-2 pt-4" style={{ borderTop: "0.5px solid #ECECF0" }}>
              <div className="flex justify-between text-[13px] text-[#86868B] mb-2">
                <span>Original total</span>
                <span className="font-mono">PKR {fmtPKR(bill.subtotal)}</span>
              </div>
              {bill.discount_total > 0 && (
                <div className="flex justify-between text-[13px] text-[#1C7A35] mb-2 font-medium">
                  <span>Discount</span>
                  <span className="font-mono">− PKR {fmtPKR(bill.discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between items-end mt-3 pt-3" style={{ borderTop: "0.5px solid #ECECF0" }}>
                <span className="text-[17px] font-semibold text-[#000000]">Total</span>
                <span className="text-[22px] font-mono font-semibold text-[#000000] tracking-tight">
                  PKR {fmtPKR(bill.total)}
                </span>
              </div>
              {bill.discount_total > 0 && (
                <p className="text-center text-[12px] text-[#1C7A35] mt-3 font-medium">
                  Customer saved PKR {fmtPKR(bill.discount_total)} on this purchase
                </p>
              )}
            </div>

            {bill.note && (
              <div className="mt-5 p-3.5" style={{ background: "#F5F5F7", borderRadius: 10 }}>
                <p className="bk-label mb-1">Note</p>
                <p className="text-[13px] text-[#1D1D1F] leading-relaxed">{bill.note}</p>
              </div>
            )}
          </div>

          <p
            className="text-center text-[11px] text-[#A1A1A6] py-4"
            style={{ borderTop: "0.5px solid #F5F5F7" }}
          >
            Thank you for your purchase · BillKar
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button onClick={print} disabled={printing} className="bk-btn bk-btn-soft bk-btn-full">
            {printing ? <span className="bk-spin" /> : <><Printer size={16} /> Print</>}
          </button>
          <button onClick={() => exportBillPdf(bill, shop)} className="bk-btn bk-btn-primary bk-btn-full">
            <Download size={16} /> PDF
          </button>
        </div>
        <button
          onClick={() => (confirmDel ? del() : setConfirmDel(true))}
          onBlur={() => setConfirmDel(false)}
          className="bk-btn bk-btn-danger w-full mt-2.5"
          style={{ borderRadius: 13, padding: "12px 16px", minHeight: 46 }}
        >
          <Trash2 size={14} /> {confirmDel ? "Tap again to confirm" : "Delete bill"}
        </button>
      </div>
    </div>
  );
}
