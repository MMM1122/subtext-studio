"use client";
import { X } from "lucide-react";
import { useToasts } from "@/stores/ui";
import { cn } from "@/lib/utils/text";

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex max-w-sm items-start gap-3 rounded-md border bg-bg px-3.5 py-2.5 text-sm shadow-lg",
            t.tone === "error" ? "border-danger/50" : "border-line",
          )}
        >
          <span className={cn("flex-1", t.tone === "error" && "text-danger")}>{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
