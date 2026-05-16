import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { SubNav } from "@/components/AppNav";
import { genBillNumber } from "@/lib/format";
import { exportBillPdf } from "@/lib/pdf";
import { isPrinterSupported, printThermal } from "@/lib/printer";
import { BillFormFields, computeTotals, newItem, type BillFormValues } from "@/components/BillForm";

export const Route = createFileRoute("/bills/new")({
  component: NewBill,
});

function NewBill() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // IMPORTANT: don't generate random number during SSR (causes hydration mismatch).
  const [values, setValues] = useState<BillFormValues>({
    bill_number: "",
    customer_name: "",
    customer_phone: "",
    items: [newItem()],
    note: "",
  });
  const [busy, setBusy] = useState<"" | "save" | "print">("");
  const [shop, setShop] = useState<{ shop_name: string; address: string; phone: string } | null>(null);

  useEffect(() => {
    setValues((v) => (v.bill_number ? v : { ...v, bill_number: genBillNumber() }));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    supabase
      .from("shop_profiles")
      .select("shop_name,address,phone")
      .maybeSingle()
      .then(({ data }) => {
        if (!data) navigate({ to: "/setup", replace: true });
        else setShop({ shop_name: data.shop_name, address: data.address || "", phone: data.phone || "" });
      });
  }, [loading, user, navigate]);

  async function persist(): Promise<{ id: string; bill: ReturnType<typeof buildBill> } | null> {
    if (!user || !shop) return null;
    const cleanItems = values.items
      .filter((it) => it.name.trim())
      .map((it) => ({
        ...it,
        qty: Number(it.qty) || 1,
        price: Number(it.price) || 0,
        discounted_price: Number(it.discounted_price) || Number(it.price) || 0,
      }));
    if (cleanItems.length === 0) {
      toast("Add at least one item");
      return null;
    }
    const t = computeTotals(cleanItems);
    const payload = {
      user_id: user.id,
      bill_number: values.bill_number,
      customer_name: values.customer_name.trim(),
      customer_phone: values.customer_phone.trim(),
      items: cleanItems,
      subtotal: t.subtotal,
      discount_total: t.discount,
      total: t.total,
      note: values.note.trim(),
    };
    const { data, error } = await supabase.from("bills").insert(payload).select().single();
    if (error) throw error;
    const bill = buildBill(data, cleanItems);
    return { id: data.id, bill };
  }

  async function saveAndExport() {
    if (busy) return;
    setBusy("save");
    try {
      const res = await persist();
      if (!res || !shop) return;
      exportBillPdf(res.bill, shop);
      navigate({ to: "/bills/$id", params: { id: res.id } });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy("");
    }
  }

  async function saveAndPrint() {
    if (busy) return;
    if (!isPrinterSupported()) {
      toast("Bluetooth print works on Android Chrome");
      return;
    }
    setBusy("print");
    try {
      const res = await persist();
      if (!res || !shop) return;
      await printThermal(res.bill, shop);
      toast("Sent to printer");
      navigate({ to: "/bills/$id", params: { id: res.id } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Print failed";
      if (!msg.toLowerCase().includes("cancel")) toast(msg);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD]">
      <SubNav
        backTo="/dashboard"
        center={<span className="text-[14px] font-semibold text-[#1D1D1F]">New bill</span>}
        right={
          <button
            onClick={saveAndExport}
            disabled={!!busy}
            className="bk-btn bk-btn-primary"
            style={{ padding: "8px 14px", fontSize: 13, minHeight: 36 }}
          >
            {busy === "save" ? <span className="bk-spin" /> : "Save"}
          </button>
        }
      />
      <div className="max-w-[600px] mx-auto px-4 sm:px-5 py-6 bk-fade bk-safe-bottom">
        <BillFormFields values={values} onChange={setValues} />

        <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
          <button
            onClick={saveAndPrint}
            disabled={!!busy}
            className="bk-btn bk-btn-soft bk-btn-full sm:flex-1"
          >
            {busy === "print" ? <span className="bk-spin" /> : <><Printer size={16} /> Save & print</>}
          </button>
          <button
            onClick={saveAndExport}
            disabled={!!busy}
            className="bk-btn bk-btn-primary bk-btn-full sm:flex-1"
          >
            {busy === "save" ? <span className="bk-spin" /> : "Save & export PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PersistedRow {
  bill_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number | string | null;
  discount_total: number | string | null;
  total: number | string | null;
  note: string | null;
  created_at: string | null;
}

function buildBill(data: PersistedRow, items: ReturnType<typeof newItem>[]) {
  return {
    bill_number: data.bill_number,
    customer_name: data.customer_name || "",
    customer_phone: data.customer_phone || "",
    items,
    subtotal: Number(data.subtotal),
    discount_total: Number(data.discount_total),
    total: Number(data.total),
    note: data.note || "",
    created_at: data.created_at || new Date().toISOString(),
  };
}
