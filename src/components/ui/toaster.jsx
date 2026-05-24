 
import React from "react";
import { useToast } from "./use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (!Array.isArray(toasts) || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`border rounded-lg shadow-lg p-4 flex items-start gap-3 min-w-[300px] bg-background ${
            t?.type === "error" ? "border-red-200" : "border-green-200"
          }`}
        >
          <div className="flex-1">
            {t?.title && <p className="font-semibold text-sm">{t.title}</p>}
            {t?.description && <p className="text-xs mt-1 opacity-90">{t.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
