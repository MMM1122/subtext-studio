"use client";
import { useEffect, useState, type ReactNode } from "react";
import { getDB } from "@/lib/database/db";
import { seedDemoIfNeeded } from "@/lib/database/seed";
import { useSettings } from "@/hooks/data";
import { Toaster } from "./Toaster";
import type { UserSettings } from "@/types";

function applyTheme(theme: UserSettings["theme"]) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("subtext-theme", theme);
  } catch {}
}

function SettingsSync() {
  const settings = useSettings();
  useEffect(() => {
    if (!settings) return;
    applyTheme(settings.theme);
    const s = document.documentElement.style;
    s.setProperty("--editor-font-size", `${settings.editorFontSize}px`);
    s.setProperty("--editor-line-height", String(settings.editorLineHeight));
    s.setProperty("--editor-width", `${settings.editorWidth}px`);
    try {
      localStorage.setItem(
        "subtext-editor",
        JSON.stringify({ f: settings.editorFontSize, l: settings.editorLineHeight, w: settings.editorWidth }),
      );
    } catch {}
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings]);
  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getDB().open();
        await seedDemoIfNeeded();
        if (!cancelled) setState("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md space-y-3 text-center">
          <h1 className="serif text-2xl">Local storage is unavailable</h1>
          <p className="text-sm text-muted">
            Subtext Studio stores your manuscripts in this browser&apos;s IndexedDB, which could not be opened. Private
            browsing modes and some privacy settings block it. Your existing data has not been modified.
          </p>
          <p className="font-mono text-xs text-muted">{error}</p>
        </div>
      </div>
    );
  }
  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted" role="status">
        <span className="serif animate-pulse text-lg">Subtext Studio</span>
      </div>
    );
  }
  return (
    <>
      <SettingsSync />
      {children}
      <Toaster />
    </>
  );
}
