import { createContext, useState, ReactNode, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed z-50 flex flex-col gap-2 pointer-events-none toast-safe-area">
      {toasts.map((toast) => {
        const bgColors = {
          success: "bg-teal-800 text-white border-teal-600",
          error: "bg-rose-800 text-white border-rose-600",
          warning: "bg-amber-800 text-white border-amber-600",
          info: "bg-slate-800 text-white border-slate-600",
        };

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between p-3.5 rounded-lg border shadow-lg text-sm transition-all"
            role="alert"
          >
            <div className={`flex items-center gap-2 ${bgColors[toast.type]} p-3 rounded-lg border w-full justify-between`}>
              <span className="font-medium leading-relaxed">{toast.message}</span>
              <button
                onClick={() => onRemove(toast.id)}
                className="ml-3 text-white/80 hover:text-white p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Đóng thông báo"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
