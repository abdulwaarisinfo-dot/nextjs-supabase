import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

function SetupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [existingId, setExistingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    supabase
      .from("shop_profiles")
      .select("*")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingId(data.id);
          setShopName(data.shop_name || "");
          setAddress(data.address || "");
          setPhone(data.phone || "");
        }
      });
  }, [loading, user, navigate]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const payload = { user_id: user.id, shop_name: shopName.trim(), address, phone };
      const { error } = existingId
        ? await supabase.from("shop_profiles").update(payload).eq("id", existingId)
        : await supabase.from("shop_profiles").insert(payload);
      if (error) throw error;
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-12 flex flex-col items-center bg-[#FBFBFD]">
      <div className="w-full max-w-[420px] bk-fade">
        <div className="bk-stagger">
          <p className="bk-label">{existingId ? "Shop settings" : "One-time setup"}</p>
          <h1 className="mt-2 text-[26px] font-medium text-[#000000]" style={{ letterSpacing: "-0.4px" }}>
            Your shop details
          </h1>
          <p className="mt-2 text-[14px] text-[#A1A1A6]">
            This appears at the top of every bill you create.
          </p>
        </div>

        <form onSubmit={save} className="bk-card mt-7 overflow-hidden bk-fade">
          <Section>
            <label className="bk-label block mb-2">Shop name</label>
            <input
              className="bk-input"
              placeholder="e.g. Al-Noor Fabrics"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
            />
          </Section>
          <Section>
            <label className="bk-label block mb-2">Address</label>
            <input
              className="bk-input"
              placeholder="e.g. Shop #12, Zainab Market, Karachi"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Section>
          <Section>
            <label className="bk-label block mb-2">Phone</label>
            <input
              className="bk-input"
              placeholder="e.g. 0300-1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Section>
          <Section last>
            <button disabled={busy} className="bk-btn bk-btn-primary bk-btn-full">
              {busy ? <span className="bk-spin" /> : "Save & continue"}
            </button>
          </Section>
        </form>
      </div>
    </div>
  );
}

function Section({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div className="p-5" style={{ borderBottom: last ? "none" : "0.5px solid #EDEDF0" }}>
      {children}
    </div>
  );
}
