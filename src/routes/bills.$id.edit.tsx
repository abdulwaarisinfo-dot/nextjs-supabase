import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { SubNav } from "@/components/AppNav";
import { exportBillPdf, type BillItem } from "@/lib/pdf";
import { isPrinterSupported, printThermal } from "@/lib/printer";
import { BillFormFields, computeTotals, newItem, type BillFormValues } from "@/components/BillForm";

export const Route = createFileRoute("/bills/$id/edit")({
  component: EditBill,
});

function EditBill() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [values, setValues] = useState<BillFormValues | null>(null);
  const [shop, setShop] = useState<{ shop_name: string; address: string; phone: string } | null>(null);
  const [busy, setBusy] = useState<"" | "save" | "print">("");
  const [fetching, setFetching] = useState(true);

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
      const items = ((b.items as unknown as BillItem[]) || []).map((it) => ({
        ...it,
        id: it.id || newItem().id,
      }));
      setValues({
        bill_number: b.bill_number,
        customer_name: b.customer_name || "",
        customer_phone: b.customer_phone || "",
        items: items.length ? items : [newItem()],
        note: b.note || "",
      });
      setShop(s ? { shop_name: s.shop_name, address: s.address || "", phone: s.phone || "" } : { shop_name: "BillKar", address: "", phone: "" });
      setFetching(false);
    })();
  }, [id, loading, user, navigate, toast]);

  async function persist() {
    if (!values || !shop) return null;
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
    const { error } = await supabase
      .from("bills")
      .update({
        customer_name: values.customer_name.trim(),
        customer_phone: values.customer_phone.trim(),
        items: cleanItems,
        subtotal: t.subtotal,
        discount_total: t.discount,
        total: t.total,
        note: values.note.trim(),
      })
      .eq("id", id);
    if (error) throw error;
    return {
      bill_number: values.bill_number,
      customer_name: values.customer_name.trim(),
      customer_phone: values.customer_phone.trim(),
      items: cleanItems,
      subtotal: t.subtotal,
      discount_total: t.discount,
      total: t.total,
      note: values.note.trim(),
      created_at: new Date().toISOString(),
    };
  }

  async function save() {
    if (busy) return;
    setBusy("save");
    try {
      const bill = await persist();
      if (!bill) return;
      toast("Bill updated");
      navigate({ to: "/bills/$id", params: { id } });
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
      const bill = await persist();
      if (!bill || !shop) return;
      await printThermal(bill, shop);
      toast("Sent to printer");
      navigate({ to: "/bills/$id", params: { id } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Print failed";
      if (!msg.toLowerCase().includes("cancel")) toast(msg);
    } finally {
      setBusy("");
    }
  }

  async function saveAndPdf() {
    if (busy) return;
    setBusy("save");
    try {
      const bill = await persist();
      if (!bill || !shop) return;
      exportBillPdf(bill, shop);
      navigate({ to: "/bills/$id", params: { id } });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy("");
    }
  }

  if (fetching || !values) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="bk-spin text-[#A1A1A6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD]">
      <SubNav
        backTo="/bills/$id"
        backLabel="Bill"
        center={<span className="text-[14px] font-semibold text-[#1D1D1F]">Edit bill</span>}
        right={
          <button
            onClick={save}
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
          <button onClick={saveAndPrint} disabled={!!busy} className="bk-btn bk-btn-soft bk-btn-full sm:flex-1">
            {busy === "print" ? <span className="bk-spin" /> : <><Printer size={16} /> Save & print</>}
          </button>
          <button onClick={saveAndPdf} disabled={!!busy} className="bk-btn bk-btn-primary bk-btn-full sm:flex-1">
            {busy === "save" ? <span className="bk-spin" /> : "Save & export PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
