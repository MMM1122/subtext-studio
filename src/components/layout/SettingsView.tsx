"use client";
import { useEffect, useState } from "react";
import { Download, HardDrive, ShieldCheck, Sparkles } from "lucide-react";
import { useSettings } from "@/hooks/data";
import { updateSettings } from "@/lib/repositories/settings";
import { addDemoProject } from "@/lib/database/seed";
import { downloadAllBackups } from "@/features/projects/actions";
import { GlobalHeader } from "./GlobalHeader";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Loading, Notice, SectionTitle } from "@/components/ui/misc";
import { toast } from "@/stores/ui";
import type { AIStatus } from "@/lib/ai/tasks";
import type { ThemeMode } from "@/types";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function SettingsView() {
  const s = useSettings();
  const [storage, setStorage] = useState<{ usage?: number; quota?: number; persisted?: boolean } | null>(null);
  const [ai, setAI] = useState<AIStatus | null>(null);

  useEffect(() => {
    (async () => {
      const est = navigator.storage?.estimate ? await navigator.storage.estimate() : {};
      const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : undefined;
      setStorage({ usage: est.usage, quota: est.quota, persisted });
    })().catch(() => setStorage({}));
    fetch("/api/ai")
      .then((r) => r.json())
      .then(setAI)
      .catch(() => setAI({ configured: false, provider: null, model: null }));
  }, []);

  if (!s) return <Loading />;
  return (
    <div className="min-h-screen">
      <GlobalHeader />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Settings</p>
        <h1 className="serif mt-1 text-3xl">Studio preferences</h1>

        <section className="mt-10 space-y-5">
          <SectionTitle>Appearance</SectionTitle>
          <Field label="Theme" className="max-w-xs">
            <Select value={s.theme} onChange={(e) => updateSettings({ theme: e.target.value as ThemeMode })}>
              <option value="system">Match system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label={`Font size · ${s.editorFontSize}px`}>
              <Input type="range" min={14} max={26} value={s.editorFontSize} onChange={(e) => updateSettings({ editorFontSize: Number(e.target.value) })} className="h-6 border-none px-0" />
            </Field>
            <Field label={`Line height · ${s.editorLineHeight.toFixed(2)}`}>
              <Input type="range" min={1.4} max={2.4} step={0.05} value={s.editorLineHeight} onChange={(e) => updateSettings({ editorLineHeight: Number(e.target.value) })} className="h-6 border-none px-0" />
            </Field>
            <Field label={`Page width · ${s.editorWidth}px`}>
              <Input type="range" min={520} max={1000} step={20} value={s.editorWidth} onChange={(e) => updateSettings({ editorWidth: Number(e.target.value) })} className="h-6 border-none px-0" />
            </Field>
          </div>
          <div className="rounded-md border border-line bg-surface/40 px-6 py-6">
            <div className="manuscript">
              <p className="mb-3">雨下了一整夜。第七根弦在她指下发出一声闷响——没有断，只是走了音。</p>
              <p>The string did not break; it only went out of tune — a preview of your manuscript typography.</p>
            </div>
          </div>
          <Field label="Daily word goal" className="max-w-xs">
            <Input type="number" min={0} value={s.dailyWordGoal} onChange={(e) => updateSettings({ dailyWordGoal: Math.max(0, Number(e.target.value) || 0) })} />
          </Field>
        </section>

        <section className="mt-12 space-y-4">
          <SectionTitle>Your data</SectionTitle>
          <Notice>
            <strong className="text-ink">Local-first.</strong> Manuscripts, characters, timelines and notes are stored only in this browser&apos;s IndexedDB on this device.
            Nothing is uploaded. Clearing browsing data, using private windows, or switching browsers/devices means the data will not be there — export
            backups regularly. Backups are plain JSON you can keep anywhere.
          </Notice>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <HardDrive size={16} className="text-muted" />
            {storage?.usage !== undefined ? (
              <span>
                Using {formatBytes(storage.usage)}
                {storage.quota ? ` of ~${formatBytes(storage.quota)} available` : ""}
              </span>
            ) : (
              <span className="text-muted">Storage estimate unavailable</span>
            )}
            <span className="text-muted">· {storage?.persisted ? "Persistent storage granted" : "Best-effort storage (browser may evict under pressure)"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {!storage?.persisted && navigator.storage?.persist && (
              <Button
                variant="outline"
                onClick={async () => {
                  const ok = await navigator.storage.persist();
                  setStorage((st) => ({ ...st, persisted: ok }));
                  toast(ok ? "Persistent storage granted." : "The browser declined persistent storage. Keep exporting backups.", ok ? "success" : "error");
                }}
              >
                <ShieldCheck size={15} /> Request persistent storage
              </Button>
            )}
            <Button variant="outline" onClick={() => downloadAllBackups()}>
              <Download size={15} /> Export all projects
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await addDemoProject();
                toast("Demo project added to the library.");
              }}
            >
              <Sparkles size={15} /> Add demo project
            </Button>
          </div>
        </section>

        <section className="mt-12 space-y-4">
          <SectionTitle>AI assistant</SectionTitle>
          {!ai ? (
            <Loading />
          ) : ai.configured ? (
            <>
              <p className="text-sm">
                Provider configured on this deployment: <strong>{ai.provider}</strong> ({ai.model}).
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={s.aiConsent} onChange={(e) => updateSettings({ aiConsent: e.target.checked })} />
                <span>
                  I consent to sending manuscript excerpts I explicitly choose to this provider. <span className="text-muted">Unchecking revokes consent immediately.</span>
                </span>
              </label>
            </>
          ) : (
            <Notice>AI features are unavailable: no provider is configured on this deployment. Everything else works fully without it.</Notice>
          )}
        </section>

        <section className="mt-12 space-y-2">
          <SectionTitle>Keyboard</SectionTitle>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {[
              ["Ctrl/⌘ + \\", "Toggle navigation"],
              ["Ctrl/⌘ + .", "Toggle inspector"],
              ["Ctrl/⌘ + Shift + F", "Focus mode"],
              ["Esc", "Exit focus mode"],
              ["Ctrl/⌘ + F", "Find & replace"],
              ["Ctrl/⌘ + S", "Save now"],
              ["Ctrl/⌘ + Z / Shift + Z", "Undo / redo"],
              ["Ctrl/⌘ + Enter", "Capture note (Idea Vault)"],
            ].map(([k, v]) => (
              <li key={k} className="flex justify-between gap-4 border-b border-line py-1.5">
                <kbd className="font-mono text-xs text-muted">{k}</kbd>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
