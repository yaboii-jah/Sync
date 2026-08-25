"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle } from "lucide-react";

type ToastVariant = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

const ToastContext = createContext<{
  toast: (message: string, variant?: ToastVariant) => void;
} | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = nextToastId++;
    setToasts((previous) => [...previous, { id, message, variant }]);
    setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed inset-x-4 bottom-28 z-[60] mx-auto flex max-w-md flex-col gap-2 lg:inset-x-auto lg:right-8 lg:bottom-8 lg:mx-0"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className="toast-in flex items-center gap-2.5 rounded-xl border border-border-default bg-bg-base px-4 py-3 shadow-[0_0_24px_rgba(0,0,0,0.45)]"
          >
            {item.variant === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0 text-state-success" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-state-error" />
            )}
            <p className="text-sm font-bold text-text-primary">{item.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
