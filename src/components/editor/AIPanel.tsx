"use client";
import { useEffect, useState } from "react";
import { Copy, Lightbulb, Send, ShieldCheck, Replace } from "lucide-react";
import { AI_MAX_INPUT_CHARS, AI_TASKS, type AIResponse, type AIStatus, type AITask } from "@/lib/ai/tasks";
import { useCharacters, useSettings } from "@/hooks/data";
import { updateSettings } from "@/lib/repositories/settings";
import { addNote } from "@/lib/repositories/notes";
import { createSnapshot } from "@/lib/repositories/manuscript";
import { useEditorBridge } from "@/stores/editor";
import { toast } from "@/stores/ui";
import { useCurrentProject } from "@/components/layout/ProjectShell";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { Loading, Notice } from "@/components/ui/misc";
import { formatCount } from "@/lib/utils/text";
import type { ID } from "@/types";

interface Captured {
  text: string;
  from: number;
  to: number;
  isSelection: boolean;
}

function capture(): Captured | null {
  const editor = useEditorBridge.getState().editor;
  if (!editor) return null;
  const { from, to, empty } = editor.state.selection;
  if (!empty) return { text: editor.state.doc.textBetween(from, to, "\n\n", "\n"), from, to, isSelection: true };
  const size = editor.state.doc.content.size;
  return { text: editor.state.doc.textBetween(0, size, "\n\n", "\n"), from: 0, to: size, isSelection: false };
}

export function AIPanel({ projectId }: { projectId: ID }) {
  const project = useCurrentProject();
  const settings = useSettings();
  const characters = useCharacters(projectId);
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [task, setTask] = useState<AITask>("brainstorm");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<(AIResponse & { task: AITask; captured: Captured }) | null>(null);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [includeContext, setIncludeContext] = useState(true);

  useEffect(() => {
    fetch("/api/ai", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: AIStatus) => setStatus(s))
      .catch(() => setStatusError(true));
  }, []);

  if (statusError)
    return <Notice tone="warn">Could not reach the AI status endpoint. AI features are unavailable; everything else works offline.</Notice>;
  if (!status || !settings) return <Loading />;
  if (!status.configured)
    return (
      <div className="space-y-3">
        <Notice>
          <strong className="text-ink">AI features are unavailable.</strong> No AI provider is configured on this deployment. Subtext Studio
          works fully without AI. To enable it, set <code>ANTHROPIC_API_KEY</code> (or an OpenAI-compatible key and model) as a server
          environment variable — see the README.
        </Notice>
        <p className="text-xs text-muted">No manuscript text ever leaves your browser unless a provider is configured and you explicitly consent.</p>
      </div>
    );

  if (!settings.aiConsent)
    return (
      <div className="space-y-3">
        <Notice>
          This deployment can send manuscript excerpts to <strong className="text-ink">{status.provider}</strong> ({status.model}) when you ask
          for help. Text is sent only when you press “Send”, only the selection or current document, and suggestions are never applied without
          your approval.
        </Notice>
        <Button variant="primary" onClick={() => updateSettings({ aiConsent: true })}>
          <ShieldCheck size={15} /> I consent to sending excerpts
        </Button>
        <p className="text-xs text-muted">You can revoke consent at any time in Settings.</p>
      </div>
    );

  const preview = capture();
  const context = includeContext
    ? [
        `Novel: ${project.title}${project.genre ? ` (${project.genre})` : ""}`,
        project.synopsis ? `Synopsis: ${project.synopsis}` : "",
        characters?.length ? `Characters: ${characters.map((c) => `${c.name} — ${c.role}${c.goals ? `; wants: ${c.goals}` : ""}`).join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 12000)
    : undefined;

  const send = async () => {
    const cap = capture();
    setError("");
    if (!cap || !cap.text.trim()) {
      setError("Nothing to send — write something or select a passage first.");
      return;
    }
    if (task === "revision" && !cap.isSelection) {
      setError("Select the passage you want revised in the editor first.");
      return;
    }
    if (cap.text.length > AI_MAX_INPUT_CHARS) {
      setError(`The excerpt is too long (${formatCount(cap.text.length)} characters). Select a shorter passage (max ${formatCount(AI_MAX_INPUT_CHARS)}).`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task, text: cap.text, context, instruction: instruction || undefined, consent: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setResult({ ...(data as AIResponse), task, captured: cap });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const suggestion = result ? (result.task === "revision" ? result.output.split(/\n-{3,}\n/)[0].trim() : result.output) : "";

  const applyRevision = async () => {
    const editor = useEditorBridge.getState().editor;
    const ref = useEditorBridge.getState().docRef;
    if (!editor || !ref || !result) return;
    const { from, to, text } = result.captured;
    const current = to <= editor.state.doc.content.size ? editor.state.doc.textBetween(from, to, "\n\n", "\n") : null;
    if (current !== text) {
      toast("The passage changed since the suggestion was made. Nothing was replaced.", "error");
      return;
    }
    await useEditorBridge.getState().flush?.();
    await createSnapshot(ref, "Before applying AI revision", true);
    const paragraphs = suggestion.split(/\n{2,}/).map((p) => ({ type: "paragraph", content: p.trim() ? [{ type: "text", text: p.trim() }] : [] }));
    if (paragraphs.length <= 1) editor.chain().focus().insertContentAt({ from, to }, suggestion).run();
    else editor.chain().focus().insertContentAt({ from, to }, paragraphs).run();
    setReviewing(false);
    toast("Revision applied. The previous text is saved as a snapshot.");
  };

  return (
    <div className="space-y-4">
      <Field label="Task">
        <Select value={task} onChange={(e) => setTask(e.target.value as AITask)}>
          {(Object.keys(AI_TASKS) as AITask[]).map((t) => (
            <option key={t} value={t}>
              {AI_TASKS[t].label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Your note (optional)">
        <Textarea rows={2} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="e.g. keep it restrained; focus on Iris" />
      </Field>
      <label className="flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={includeContext} onChange={(e) => setIncludeContext(e.target.checked)} />
        Include synopsis & character list as context
      </label>
      <p className="text-xs text-muted">
        Will send: {preview?.isSelection ? "the selected passage" : "the current document"} ({formatCount(preview?.text.length ?? 0)} characters)
        {includeContext ? " + project context" : ""} to {status.provider}.
      </p>
      <Button variant="primary" onClick={send} disabled={busy} className="w-full justify-center">
        <Send size={14} /> {busy ? "Waiting for response…" : "Send"}
      </Button>
      {error && <Notice tone="danger">{error}</Notice>}
      {result && (
        <div className="space-y-2 rounded-md border border-accent/50 p-3">
          <div className="text-[11px] uppercase tracking-[0.1em] text-accent-ink">
            AI suggestion · {result.provider} · not applied
          </div>
          <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">{result.output}</div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(result.output).then(() => toast("Copied."))}>
              <Copy size={12} /> Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await addNote(projectId, { title: `AI · ${AI_TASKS[result.task].label}`, body: result.output, tags: ["ai-suggestion"], kind: "idea" });
                toast("Saved to the Idea Vault.");
              }}
            >
              <Lightbulb size={12} /> Save as note
            </Button>
            {result.task === "revision" && result.captured.isSelection && (
              <Button size="sm" variant="primary" onClick={() => setReviewing(true)}>
                <Replace size={12} /> Review & replace…
              </Button>
            )}
          </div>
        </div>
      )}
      <Dialog
        open={reviewing}
        onOpenChange={setReviewing}
        title="Replace the selected passage?"
        description="Compare the two versions. Your original is saved as a snapshot before anything changes."
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewing(false)}>
              Keep original
            </Button>
            <Button variant="primary" onClick={applyRevision}>
              Replace with suggestion
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wider text-muted">Original</div>
            <div className="serif max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded border border-line bg-surface p-3 text-sm">{result?.captured.text}</div>
          </div>
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-wider text-accent-ink">Suggestion</div>
            <div className="serif max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded border border-accent/50 p-3 text-sm">{suggestion}</div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
