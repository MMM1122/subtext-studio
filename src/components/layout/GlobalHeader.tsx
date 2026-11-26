"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils/text";

export function Wordmark() {
  return (
    <Link href="/library" className="serif text-[17px] tracking-wide text-ink">
      Subtext <span className="text-accent">Studio</span>
    </Link>
  );
}

export function GlobalHeader() {
  const path = usePathname();
  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={cn("rounded px-2 py-1 text-sm transition-colors", path.startsWith(href) ? "text-ink" : "text-muted hover:text-ink")}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-line bg-bg/95 px-5 backdrop-blur">
      <Wordmark />
      <nav className="flex items-center gap-1">
        {link("/library", "Library")}
        {link("/settings", "Settings")}
        <ThemeToggle />
      </nav>
    </header>
  );
}
