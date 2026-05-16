import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { BrandIcon } from "@/components/AppNav";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) routeAfterLogin();
  }, [loading, user]);

  async function routeAfterLogin() {
    const { data } = await supabase.from("shop_profiles").select("id").maybeSingle();
    navigate({ to: data ? "/dashboard" : "/setup", replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-[#FBFBFD]">
      <div className="w-full max-w-[360px] bk-fade">
        <div className="flex flex-col items-center text-center mb-10 bk-stagger">
          <BrandIcon size={50} />
          <h1 className="mt-5 text-[26px] font-medium text-[#000000]" style={{ letterSpacing: "-0.5px" }}>
            BillKar
          </h1>
          <p className="mt-1 text-[13px] text-[#86868B]">Billing, simplified.</p>
        </div>

        <div className="bk-card p-6 bk-fade">
          <h2 className="text-[16px] font-medium text-[#1D1D1F] mb-5">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="bk-label block mb-2">Email</label>
              <input
                className="bk-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="bk-label block mb-2">Password</label>
              <input
                className="bk-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            <button type="submit" disabled={busy} className="bk-btn bk-btn-primary bk-btn-full mt-1">
              {busy ? <span className="bk-spin" /> : mode === "signin" ? "Sign in" : "Sign up"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center mt-5 text-[13px] text-[#86868B] hover:text-[#6E6E73] transition"
          >
            {mode === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
          </button>
        </div>

        <p className="text-center mt-8 text-[11px] text-[#C7C7CC]">
          Your data is private and encrypted.
        </p>
      </div>
    </div>
  );
}
