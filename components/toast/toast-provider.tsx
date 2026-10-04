"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ToastVariant = "success" | "error" | "warning";

const toastTone: Record<ToastVariant, string> = {
  error: "border-danger",
  warning: "border-warning",
  success: "border-success",
};

const ToastContext = createContext<{
  toast: (message: string, variant?: ToastVariant) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<
    Array<{ id: number; message: string; variant: ToastVariant }>
  >([]);

  const value = useMemo(
    () => ({
      toast: (message: string, variant: ToastVariant = "success") => {
        const id = Date.now();
        setMessages((current) => [...current, { id, message, variant }]);
        window.setTimeout(() => {
          setMessages((current) => current.filter((item) => item.id !== id));
        }, 4000);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="app-theme-surface fixed inset-x-4 bottom-6 z-[60] mx-auto flex max-w-sm flex-col gap-2">
        {messages.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border border-l-4 bg-overlay p-3 text-sm text-foreground shadow-overlay ${toastTone[item.variant]}`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
