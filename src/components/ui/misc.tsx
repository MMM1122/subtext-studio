"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/text";

export function Badge({ children, className, color }: { children: ReactNode; className?: string; color?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[11px] leading-none text-muted", className)}
      style={color ? { borderColor: color, color } : undefined}
    >
      {children}
    </span>
  );
}

export function Dot({ color, className }: { color: string; className?: string }) {
  return <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)} style={{ background: color }} />;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-muted">{icon}</div>}
      <h3 className="serif text-lg text-ink">{title}</h3>
      {children && <div className="mt-2 max-w-sm text-sm text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted" role="status" aria-live="polite">
      <span className="animate-pulse">{label}</span>
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-2 flex items-center justify-between gap-2", className)}>
      <h3 className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">{children}</h3>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-6 py-5">
      <div>
        <h1 className="serif text-2xl text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({ children, tone = "info", className }: { children: ReactNode; tone?: "info" | "warn" | "danger"; className?: string }) {
  const tones = {
    info: "border-line bg-surface text-muted",
    warn: "border-warn/40 bg-warn/10 text-ink",
    danger: "border-danger/40 bg-danger/10 text-ink",
  };
  return <div className={cn("rounded-md border px-3 py-2 text-xs leading-relaxed", tones[tone], className)}>{children}</div>;
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex items-center gap-1 border-b border-line", className)}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
            value === it.value ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
