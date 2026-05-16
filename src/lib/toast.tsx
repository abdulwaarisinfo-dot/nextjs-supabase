import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type Toast = { id: number; msg: string };
const Ctx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bk-fade pointer-events-auto px-4 py-2.5 text-[13px]"
            style={{
              background: "#FFFFFF",
              color: "#1D1D1F",
              border: "0.5px solid #D2D2D7",
              borderRadius: 20,
              maxWidth: "92vw",
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
