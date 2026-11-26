"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Camera, Eye, RotateCcw, Trash2 } from "lucide-react";
import { Inspector } from "@/components/layout/ProjectShell";
import { BufferedInput, Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Loading, Notice, SectionTitle, Tabs } from "@/components/ui/misc";
import { useEvents, useSessions, useSnapshots } from "@/hooks/data";
import { createSnapshot, deleteSnapshot, restoreSnapshot, updateChapter, updateScene } from "@/lib/repositories/manuscript";
import { updateSettings } from "@/lib/repositories/settings";
import { useEditorBridge } from "@/stores/editor";
import { toast } from "@/stores/ui";
import { formatCount, relativeTime } from "@/lib/utils/text";
import { dateKey } from "@/lib/utils/id";
import { STATUS_LABEL } from "./Binder";
import type { Chapter, ChapterStatus, DocRef, ID, ManuscriptSnapshot, Scene } from "@/types";
import { useCurrentProject } from "@/components/layout/ProjectShell";

const AIPanel = dynamic(() => import("./AIPanel").then((m) => m.AIPanel), { ssr: false, loading: () => <Loading /> });
const WritingStatsChart = dynamic(() => import("@/components/analytics/WritingStatsChart").then((m) => m.WritingStatsChart), {
  ssr: false,
  loading: () => <Loading />,
});

type Tab = "details" | "versions" | "stats" | "ai";

export function WriteInspector(props: {
  projectId: ID;
  docRef: DocRef;
  chapter?: Chapter;
  scene?: Scene;
  chapters: Chapter[];
  scenes: Scene[];
  dailyGoal: number;
  onRestored: () => void;
}) {
  const [tab, setTab] = useState<Tab>("details");
  return (
    <Inspector title="Inspector">
      <Tabs
        className="-mx-4 -mt-4 mb-4 px-2"
        value={tab}
        onChange={setTab}
        items={[
          { value: "details", label: "Details" },
          { value: "versions", label: "Versions" },
          { value: "stats", label: "Stats" },
          { value: "ai", label: "AI" },
        ]}
      />
      {tab === "details" && <Details {...props} />}
      {tab === "versions" && <Versions docRef={props.docRef} onRestored={props.onRestored} />}
      {tab === "stats" && <Stats {...props} />}
      {tab === "ai" && <AIPanel projectId={props.projectId} />}
    </Inspector>
  );
}

function Details({ chapter, scene, projectId }: { chapter?: Chapter; scene?: Scene; projectId: ID }) {
  const events = useEvents(projectId);
  if (scene)
    return (
      <div className="space-y-4">
        <Field label="Scene summary">
          <BufferedInput key={scene.id} multiline rows={4} value={scene.summary} onCommit={(v) => updateScene(scene.id, { summary: v })} placeholder="What happens, and why it matters…" />
        </Field>
        <LinkedEvents events={(events ?? []).filter((e) => e.sceneId === scene.id)} />
      </div>
    );
  if (!chapter) return null;
  return (
    <div className="space-y-4">
      <Field label="Status">
        <Select value={chapter.status} onChange={(e) => updateChapter(chapter.id, { status: e.target.value as ChapterStatus })}>
          {(Object.keys(STATUS_LABEL) as ChapterStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Chapter word goal">
        <Input
          type="number"
          min={0}
          value={chapter.wordGoal ?? ""}
          placeholder="none"
          onChange={(e) => updateChapter(chapter.id, { wordGoal: e.target.value ? Math.max(0, Number(e.target.value)) : null })}
        />
      </Field>
      <Field label="Chapter notes">
        <BufferedInput key={chapter.id} multiline rows={6} value={chapter.notes} onCommit={(v) => updateChapter(chapter.id, { notes: v })} placeholder="Intentions, reminders, open questions…" />
      </Field>
      <LinkedEvents events={(events ?? []).filter((e) => e.chapterId === chapter.id)} />
    </div>
  );
}

function LinkedEvents({ events }: { events: { id: ID; title: string; storyTime: string }[] }) {
  const project = useCurrentProject();
  return (
    <div>
      <SectionTitle>Timeline events here</SectionTitle>
      {events.length === 0 ? (
        <p className="text-xs text-muted">
          None linked. Assign events in the{" "}
          <a className="underline" href={`/projects/${project.id}/timeline`}>
            Narrative Lab
          </a>
          .
        </p>
      ) : (
        <ul className="space-y-1">
          {events.map((e) => (
            <li key={e.id} className="text-sm">
              <span className="serif">{e.title}</span>
              {e.storyTime && <span className="ml-2 text-xs text-muted">{e.storyTime}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Versions({ docRef, onRestored }: { docRef: DocRef; onRestored: () => void }) {
  const snaps = useSnapshots(docRef.id);
  const [label, setLabel] = useState("");
  const [preview, setPreview] = useState<ManuscriptSnapshot | null>(null);
  const [restoring, setRestoring] = useState<ManuscriptSnapshot | null>(null);
  const [deleting, setDeleting] = useState<ManuscriptSnapshot | null>(null);

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await useEditorBridge.getState().flush?.();
          await createSnapshot(docRef, label);
          setLabel("");
          toast("Snapshot saved.");
        }}
      >
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" aria-label="Snapshot label" className="h-8" />
        <Button type="submit" size="sm" variant="outline" className="h-8">
          <Camera size={13} /> Save
        </Button>
      </form>
      <Notice>Snapshots are full copies of this document. Restoring first saves the current text as an automatic snapshot.</Notice>
      {!snaps ? (
        <Loading />
      ) : snaps.length === 0 ? (
        <p className="text-sm text-muted">No snapshots yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {snaps.map((s) => (
            <li key={s.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{s.label}</div>
                <div className="text-[11px] text-muted">
                  {relativeTime(s.createdAt)} · {formatCount(s.wordCount)} words{s.automatic ? " · auto" : ""}
                </div>
              </div>
              <Button size="icon-sm" variant="ghost" onClick={() => setPreview(s)} aria-label="Preview snapshot">
                <Eye size={13} />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setRestoring(s)} aria-label="Restore snapshot">
                <RotateCcw size={13} />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={() => setDeleting(s)} aria-label="Delete snapshot">
                <Trash2 size={13} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)} title={preview?.label ?? ""} description={preview ? new Date(preview.createdAt).toLocaleString() : ""} wide>
        <div className="serif max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded border border-line bg-surface p-4 text-[15px] leading-relaxed">
          {preview?.text || "(empty)"}
        </div>
      </Dialog>
      <ConfirmDialog
        open={!!restoring}
        onOpenChange={(o) => !o && setRestoring(null)}
        title="Restore this version?"
        description={<>The editor content will be replaced with “{restoring?.label}”. Your current text is saved as a snapshot first, so you can undo this.</>}
        confirmLabel="Restore"
        onConfirm={async () => {
          if (!restoring) return;
          await useEditorBridge.getState().flush?.();
          const ok = await restoreSnapshot(restoring.id);
          if (ok) {
            onRestored();
            toast("Version restored. Previous text saved as a snapshot.");
          } else toast("Could not restore that snapshot.", "error");
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete snapshot?"
        danger
        confirmLabel="Delete"
        description={<>“{deleting?.label}” will be removed. The current manuscript is not affected.</>}
        onConfirm={async () => {
          if (deleting) await deleteSnapshot(deleting.id);
        }}
      />
    </div>
  );
}

function Stats({ projectId, chapters, scenes, dailyGoal }: { projectId: ID; chapters: Chapter[]; scenes: Scene[]; dailyGoal: number }) {
  const project = useCurrentProject();
  const sessions = useSessions(projectId);
  const total = chapters.reduce((s, c) => s + c.wordCount, 0) + scenes.reduce((s, c) => s + c.wordCount, 0);
  const today = sessions?.find((s) => s.date === dateKey())?.wordsAdded ?? 0;
  const byStatus = chapters.reduce<Record<ChapterStatus, number>>((acc, c) => ({ ...acc, [c.status]: acc[c.status] + 1 }), { draft: 0, revising: 0, complete: 0 });
  const bar = (v: number, max: number) => (
    <div className="mt-1 h-[3px] w-full overflow-hidden rounded bg-line">
      <div className="h-full bg-accent" style={{ width: `${max ? Math.min(100, (v / max) * 100) : 0}%` }} />
    </div>
  );
  return (
    <div className="space-y-5">
      <div>
        <SectionTitle>Manuscript</SectionTitle>
        <p className="serif text-2xl">{formatCount(total)}</p>
        <p className="text-xs text-muted">
          words / 字{project.wordGoal ? ` of ${formatCount(project.wordGoal)} goal` : ""}
        </p>
        {project.wordGoal ? bar(total, project.wordGoal) : null}
      </div>
      <div>
        <SectionTitle>Today</SectionTitle>
        <p className="text-sm">
          {formatCount(today)} / {formatCount(dailyGoal)} daily goal
        </p>
        {bar(today, dailyGoal)}
        <label className="mt-2 flex items-center gap-2 text-xs text-muted">
          Daily goal
          <Input
            type="number"
            min={0}
            className="h-7 w-24"
            value={dailyGoal}
            onChange={(e) => updateSettings({ dailyWordGoal: Math.max(0, Number(e.target.value) || 0) })}
          />
        </label>
      </div>
      <div>
        <SectionTitle>Last 14 days (net words added)</SectionTitle>
        {sessions ? <WritingStatsChart sessions={sessions} /> : <Loading />}
      </div>
      <div>
        <SectionTitle>Chapters</SectionTitle>
        <p className="text-xs text-muted">
          {byStatus.complete} complete · {byStatus.revising} revising · {byStatus.draft} draft
        </p>
        <ul className="mt-2 space-y-1.5">
          {chapters.map((c) => {
            const w = c.wordCount + scenes.filter((s) => s.chapterId === c.id).reduce((a, s) => a + s.wordCount, 0);
            const max = Math.max(1, ...chapters.map((x) => x.wordCount + scenes.filter((s) => s.chapterId === x.id).reduce((a, s) => a + s.wordCount, 0)));
            return (
              <li key={c.id} className="text-xs">
                <div className="flex justify-between gap-2">
                  <span className="truncate">{c.title}</span>
                  <span className="tabular-nums text-muted">{formatCount(w)}</span>
                </div>
                {bar(w, max)}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
