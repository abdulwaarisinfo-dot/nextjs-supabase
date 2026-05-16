import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, FileText, Plus, Search, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { AppNav, GhostButton, SignOutButton } from "@/components/AppNav";
import { fmtPKR, fmtShortDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

interface BillRow {
  id: string;
  bill_number: string;
  customer_name: string | null;
  total: number | null;
  created_at: string | null;
}

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [shopName, setShopName] = useState<string>("");
  const [bills, setBills] = useState<BillRow[]>([]);
  const [q, setQ] = useState("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    (async () => {
      const [{ data: shop }, { data: list, error }] = await Promise.all([
        supabase.from("shop_profiles").select("shop_name").maybeSingle(),
        supabase.from("bills").select("id,bill_number,customer_name,total,created_at").order("created_at", { ascending: false }),
      ]);
      if (!shop) {
        navigate({ to: "/setup", replace: true });
        return;
      }
      setShopName(shop.shop_name);
      if (error) toast(error.message);
      setBills((list as BillRow[]) || []);
      setFetching(false);
    })();
  }, [loading, user, navigate, toast]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthBills = bills.filter((b) => b.created_at && new Date(b.created_at) >= monthStart);
    const revenue = monthBills.reduce((s, b) => s + Number(b.total || 0), 0);
    return { total: bills.length, monthCount: monthBills.length, revenue };
  }, [bills]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return bills;
    return bills.filter(
      (b) =>
        b.bill_number.toLowerCase().includes(t) ||
        (b.customer_name || "").toLowerCase().includes(t)
    );
  }, [bills, q]);

  return (
    <div className="min-h-screen bg-[#FBFBFD]">
      <AppNav
        shopName={shopName}
        right={
          <>
            <Link to="/setup" className="bk-btn bk-btn-ghost" style={{ padding: "7px 12px", fontSize: 13 }}>
              <Settings size={14} />
            </Link>
            <SignOutButton />
          </>
        }
      />

      <div className="max-w-[680px] mx-auto px-5 py-8 bk-fade">
        <div className="bk-stagger">
          <p className="bk-label" style={{ color: "#C7C7CC" }}>Overview</p>
          <h1 className="mt-1 text-[28px] font-normal text-[#1D1D1F]" style={{ letterSpacing: "-0.4px" }}>
            Your bills
          </h1>

          <div className="grid grid-cols-3 gap-2 mt-6">
            <Stat label="Total bills" value={String(stats.total)} sub="all time" />
            <Stat label="This month" value={String(stats.monthCount)} sub="bills" />
            <Stat label="Month revenue" value={fmtPKR(stats.revenue)} sub="PKR" />
          </div>

          <div className="flex gap-2 mt-5">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1A6]" />
              <input
                className="bk-input pl-9"
                placeholder="Search by bill # or customer"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Link to="/bills/new" className="bk-btn bk-btn-primary">
              <Plus size={16} />
              New bill
            </Link>
          </div>

          <div className="bk-card mt-5 overflow-hidden">
            {fetching ? (
              <div className="py-14 flex justify-center"><div className="bk-spin text-[#A1A1A6]" /></div>
            ) : filtered.length === 0 ? (
              <EmptyState onCreate={() => navigate({ to: "/bills/new" })} hasBills={bills.length > 0} />
            ) : (
              filtered.map((b, i) => (
                <Link
                  key={b.id}
                  to="/bills/$id"
                  params={{ id: b.id }}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F5F5F7] transition-colors"
                  style={{ borderTop: i === 0 ? "none" : "0.5px solid #EDEDF0" }}
                >
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 32, height: 32, background: "#EDEDF0", borderRadius: 8 }}
                  >
                    <FileText size={14} className="text-[#6E6E73]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[14px] text-[#1D1D1F] truncate">#{b.bill_number}</div>
                    <div className="text-[12px] text-[#A1A1A6] truncate">
                      {b.customer_name || "Walk-in"} · {b.created_at ? fmtShortDate(b.created_at) : ""}
                    </div>
                  </div>
                  <div className="text-[14px] text-[#1D1D1F] font-mono">PKR {fmtPKR(Number(b.total || 0))}</div>
                  <ChevronRight size={16} className="text-[#C7C7CC]" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bk-card p-3.5">
      <p className="bk-label">{label}</p>
      <p className="mt-1.5 text-[19px] font-medium text-[#1D1D1F] font-mono leading-tight">{value}</p>
      <p className="mt-0.5 text-[10px] text-[#C7C7CC]">{sub}</p>
    </div>
  );
}

function EmptyState({ onCreate, hasBills }: { onCreate: () => void; hasBills: boolean }) {
  return (
    <div className="py-14 flex flex-col items-center text-center px-6">
      <div
        className="flex items-center justify-center mb-4"
        style={{ width: 44, height: 44, background: "#EDEDF0", borderRadius: 10 }}
      >
        <FileText size={18} className="text-[#86868B]" />
      </div>
      <p className="text-[15px] text-[#1D1D1F]">{hasBills ? "No matching bills" : "No bills yet"}</p>
      <p className="text-[13px] text-[#A1A1A6] mt-1">
        {hasBills ? "Try a different search" : "Create your first bill to get started"}
      </p>
      {!hasBills && (
        <div className="mt-5">
          <GhostButton onClick={onCreate}>Create first bill</GhostButton>
        </div>
      )}
    </div>
  );
}
