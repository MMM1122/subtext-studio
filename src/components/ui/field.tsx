"use client";
import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/text";

const base =
  "w-full rounded-md border border-line bg-bg px-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus-visible:outline-none";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(base, "h-9", className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...p },
  ref,
) {
  return <textarea ref={ref} className={cn(base, "min-h-[72px] resize-y py-2 leading-relaxed", className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...p }, ref) {
  return <select ref={ref} className={cn(base, "h-9 cursor-pointer pr-7", className)} {...p} />;
});

export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted", className)}>
      {children}
    </label>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/**
 * Text input bound to persisted data. Keeps a local draft while focused so that
 * IME composition (Chinese / Japanese input) is never interrupted by
 * asynchronous database round-trips. Commits on a debounce and on blur.
 */
export function BufferedInput({
  value,
  onCommit,
  multiline,
  delay = 500,
  className,
  ...rest
}: {
  value: string;
  onCommit: (v: string) => void;
  multiline?: boolean;
  delay?: number;
  className?: string;
  placeholder?: string;
  rows?: number;
  "aria-label"?: string;
  id?: string;
  autoFocus?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const composing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  const commitRef = useRef(onCommit);
  useEffect(() => {
    commitRef.current = onCommit;
  }, [onCommit]);

  // Sync from external changes only when the user isn't editing.
  useEffect(() => {
    if (!focused.current) {
      setDraft(value);
      latest.current = value;
    }
  }, [value]);

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (draft !== latest.current) {
      latest.current = draft;
      commitRef.current(draft);
    }
  };

  useEffect(() => {
    if (composing.current) return;
    if (draft === latest.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      latest.current = draft;
      commitRef.current(draft);
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, delay]);

  // Flush on unmount.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(
    () => () => {
      if (draftRef.current !== latest.current) commitRef.current(draftRef.current);
    },
    [],
  );

  const common = {
    value: draft,
    onFocus: () => (focused.current = true),
    onBlur: () => {
      focused.current = false;
      flush();
    },
    onCompositionStart: () => (composing.current = true),
    onCompositionEnd: () => {
      composing.current = false;
    },
    ...rest,
  };
  if (multiline)
    return (
      <Textarea
        {...common}
        className={className}
        onChange={(e) => setDraft(e.target.value)}
      />
    );
  return <Input {...common} className={className} onChange={(e) => setDraft(e.target.value)} />;
}
