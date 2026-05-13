"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

type ToastContextValue = {
  toast: (kind: ToastKind, message: string) => void;
};

const Ctx = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const v = useContext(Ctx);
  // Fallback: if no provider, use console — prevents crashes when used out of context
  if (!v) {
    return {
      toast: (kind, message) => console.log(`[toast/${kind}]`, message),
    };
  }
  return v;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, kind === "error" ? 6000 : 3500);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 300,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} kind={t.kind}>{t.message}</ToastItem>
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastItem({ kind, children }: { kind: ToastKind; children: ReactNode }) {
  const bg = kind === "success" ? "#15803d" : kind === "error" ? "#b91c1c" : "#18181b";
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: bg,
        color: "#fafafa",
        padding: "10px 16px",
        borderRadius: 8,
        fontSize: 14,
        boxShadow: "0 4px 12px rgba(0,0,0,.15)",
        pointerEvents: "auto",
        maxWidth: 360,
        animation: "advToastIn 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {children}
      <style>{`@keyframes advToastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
