import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReactNode } from "react";

export function AppNav({
  shopName,
  right,
}: {
  shopName?: string;
  right?: ReactNode;
}) {
  return (
    <nav className="bk-nav">
      <div className="h-full max-w-[680px] mx-auto px-5 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <BrandIcon size={28} />
          <span className="text-[14px] font-medium text-[#1D1D1F] truncate max-w-[180px]">
            {shopName || "BillKar"}
          </span>
        </Link>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </nav>
  );
}

export function SubNav({
  backTo,
  backLabel = "Bills",
  center,
  right,
}: {
  backTo: string;
  backLabel?: string;
  center?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <nav className="bk-nav">
      <div className="h-full max-w-[680px] mx-auto px-5 grid grid-cols-3 items-center">
        <Link to={backTo} className="flex items-center gap-1.5 text-[#86868B] hover:text-[#6E6E73] text-[14px]">
          <ArrowLeft size={16} />
          <span>{backLabel}</span>
        </Link>
        <div className="text-center">{center}</div>
        <div className="flex items-center justify-end">{right}</div>
      </div>
    </nav>
  );
}

export function BrandIcon({ size = 50 }: { size?: number }) {
  const r = size === 50 ? 13 : Math.max(6, Math.round(size * 0.26));
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: size, height: size, borderRadius: r, background: "#1d1d1f" }}
    >
      <FileText size={size * 0.45} color="#fff" strokeWidth={1.75} />
    </div>
  );
}

export function GhostButton({
  children,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="bk-btn bk-btn-ghost" style={{ padding: "7px 14px", fontSize: 13 }}>
      {children}
    </button>
  );
}

export function SignOutButton() {
  const navigate = useNavigate();
  return (
    <GhostButton
      onClick={async () => {
        await supabase.auth.signOut();
        navigate({ to: "/auth" });
      }}
    >
      Sign out
    </GhostButton>
  );
}
