"use client";
import { AlertCircle, Check, CircleDot, LoaderCircle } from "lucide-react";
import { useUI } from "@/stores/ui";

export function SaveIndicator() {
  const status = useUI((s) => s.saveStatus);
  const map = {
    idle: { icon: <Check size={13} />, label: "Saved locally", cls: "text-muted" },
    saved: { icon: <Check size={13} />, label: "Saved locally", cls: "text-muted" },
    unsaved: { icon: <CircleDot size={13} />, label: "Unsaved changes", cls: "text-warn" },
    saving: { icon: <LoaderCircle size={13} className="animate-spin" />, label: "Saving…", cls: "text-muted" },
    error: { icon: <AlertCircle size={13} />, label: "Save failed — retrying on next edit", cls: "text-danger" },
  }[status];
  return (
    <span className={`mr-1 hidden items-center gap-1.5 text-xs sm:inline-flex ${map.cls}`} role="status" aria-live="polite">
      {map.icon}
      {map.label}
    </span>
  );
}
