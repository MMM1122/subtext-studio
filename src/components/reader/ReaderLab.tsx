"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useChapters, useCharacters, useEvents, useForeshadowing, useMetrics } from "@/hooks/data";
import { addForeshadowing, deleteForeshadowing, setMetric, setMetricNote, updateForeshadowing } from "@/lib/repositories/reader";
import { checkForeshadowing, METRIC_LABEL } from "@/features/reader/logic";
import { Inspector, useCurrentProject } from "@/components/layout/ProjectShell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { BufferedInput, Field, Select } from "@/components/ui/field";
import { Badge, EmptyState, Loading, Notice, SectionTitle, Tabs } from "@/components/ui/misc";
import { cn, truncate } from "@/lib/utils/text";
import { METRIC_KEYS, type Chapter, type Foreshadowing, type ForeshadowingStatus, type ID, type MetricKey } from "@/types";

const ExperienceChart = dynamic(() => import("@/components/analytics/ExperienceChart").then((m) => m.ExperienceChart), {
  ssr: false,
  loading: () => <Loading label="Loading chart…" />,
});

const STATUS: ForeshadowingStatus[] = ["planned", "planted", "reinforced", "paid-off", "abandoned"];
const STATUS_COLOR: Record<ForeshadowingStatus, string> = {
  planned: "var(--c-stone)",
  planted: "var(--c-sand)",
  reinforced: "var(--c-plum)",
  "paid-off": "var(--c-sage)",
  abandoned: "var(--muted)",
};
const METRIC_DOT: Record<MetricKey, string> = {
  emotionalIntensity: "var(--c-clay)",
  tension: "var(--c-slate)",
  suspense: "var(--c-plum)",
  uncertainty: "var(--c-sand)",
  informationDensity: "var(--c-teal)",
  pacing: "var(--c-sage)",
};

type View = "experience" | "foreshadowing";

export function ReaderLab() {
  const project = useCurrentProject();
  const chapters = useChapters(project.id);
  const metrics = useMetrics(project.id);
  const fores = useForeshadowing(project.id);
  const characters = useCharacters(project.id);
  const events = useEvents(project.id);
  const [view, setView] = useState<View>("experience");
  const [shown, setShown] = useState<Set<MetricKey>>(new Set(["emotionalIntensity", "tension", "suspense", "uncertainty"]));
  const [selected, setSelected] = useState<ID | null>(null);

  if (!chapters || !metrics || !fores || !characters || !events) return <Loading />;
  const byChapter = new Map(metrics.filter((m) => !m.sceneId).map((m) => [m.chapterId, m]));
  const data = chapters.map((c, i) => {
    const m = byChapter.get(c.id);
    return { label: `Ch ${i + 1}`, title: c.title, ...Object.fromEntries(METRIC_KEYS.map((k) => [k, m?.values[k] ?? null])) };
  });
  const issues = checkForeshadowing(fores, chapters);
  const sel = fores.find((f) => f.id === selected) ?? null;

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-line px-3">
          <Tabs
            className="border-b-0"
            value={view}
            onChange={setView}
            items={[
              { value: "experience", label: "Experience curve" },
              { value: "foreshadowing", label: `Foreshadowing${issues.length ? ` (${issues.length})` : ""}` },
            ]}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {chapters.length === 0 ? (
            <EmptyState title="No chapters yet">Add chapters in the Writing Studio first.</EmptyState>
          ) : view === "experience" ? (
            <div className="mx-auto max-w-5xl px-6 py-6">
              <Notice className="mb-5">
                <strong className="text-ink">Author-estimated planning values (0–10).</strong> These are your intentions for how a chapter should feel. They
                are not measured reader responses and no reader data is collected.
              </Notice>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {METRIC_KEYS.map((k) => (
                  <button
                    key={k}
                    aria-pressed={shown.has(k)}
                    onClick={() =>
                      setShown((s) => {
                        const n = new Set(s);
                        if (n.has(k)) n.delete(k);
                        else n.add(k);
                        return n;
                      })
                    }
                    className={cn("flex items-center gap-1.5 rounded border px-2 py-1 text-xs", shown.has(k) ? "border-line text-ink" : "border-line text-muted/60")}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: shown.has(k) ? METRIC_DOT[k] : "var(--line)" }} />
                    {METRIC_LABEL[k]}
                  </button>
                ))}
              </div>
              <ExperienceChart data={data} keys={METRIC_KEYS.filter((k) => shown.has(k))} />
              <div className="mt-8 overflow-x-auto rounded-md border border-line">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface/60 text-left">
                      <th scope="col" className="border-b border-line px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted">
                        Chapter
                      </th>
                      {METRIC_KEYS.map((k) => (
                        <th key={k} scope="col" className="border-b border-l border-line px-2 py-2 text-[11px] font-medium text-muted">
                          {METRIC_LABEL[k]}
                        </th>
                      ))}
                      <th scope="col" className="min-w-[200px] border-b border-l border-line px-2 py-2 text-[11px] font-medium text-muted">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map((c, i) => {
                      const m = byChapter.get(c.id);
                      return (
                        <tr key={c.id}>
                          <th scope="row" className="border-b border-line px-3 py-1.5 text-left font-normal">
                            <span className="serif text-[13px]">
                              {i + 1}. {truncate(c.title, 26)}
                            </span>
                          </th>
                          {METRIC_KEYS.map((k) => (
                            <td key={k} className="border-b border-l border-line p-1">
                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={1}
                                aria-label={`${METRIC_LABEL[k]} for ${c.title}`}
                                value={m?.values[k] ?? ""}
                                placeholder="–"
                                onChange={(e) => {
                                  const v = e.target.value === "" ? null : Math.max(0, Math.min(10, Number(e.target.value)));
                                  void setMetric(project.id, c.id, k, v);
                                }}
                                className="h-8 w-16 rounded border border-transparent bg-transparent px-2 text-sm tabular-nums hover:border-line focus:border-accent focus:outline-none"
                              />
                            </td>
                          ))}
                          <td className="border-b border-l border-line p-1">
                            {m ? (
                              <BufferedInput value={m.note} onCommit={(v) => setMetricNote(m.id, v)} className="h-8 border-transparent bg-transparent text-xs hover:border-line" aria-label="Note" />
                            ) : (
                              <span className="px-2 text-xs text-muted/60">set a value first</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <ForeshadowingView items={fores} chapters={chapters} issues={issues} selected={selected} onSelect={setSelected} onAdd={async () => setSelected((await addForeshadowing(project.id)).id)} />
          )}
        </div>
      </section>
      <Inspector title="Foreshadowing">
        {sel ? (
          <ForeshadowingEditor key={sel.id} f={sel} chapters={chapters} characters={characters} events={events} onDeleted={() => setSelected(null)} />
        ) : (
          <p className="text-sm text-muted">Select a foreshadowing thread to edit it.</p>
        )}
      </Inspector>
    </div>
  );
}

function ForeshadowingView({
  items,
  chapters,
  issues,
  selected,
  onSelect,
  onAdd,
}: {
  items: Foreshadowing[];
  chapters: Chapter[];
  issues: { id: ID; severity: string; message: string }[];
  selected: ID | null;
  onSelect: (id: ID) => void;
  onAdd: () => void;
}) {
  const ci = new Map(chapters.map((c, i) => [c.id, i]));
  const n = chapters.length;
  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">Plant, reinforce and pay off. Each row spans from introduction to payoff across your chapters.</p>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus size={13} /> Thread
        </Button>
      </div>
      {issues.length > 0 && (
        <ul className="mb-5 space-y-1.5">
          {issues.map((iss, i) => (
            <li key={i}>
              <button onClick={() => onSelect(iss.id)} className="flex w-full items-start gap-2 text-left text-xs">
                <AlertTriangle size={13} className={cn("mt-0.5 shrink-0", iss.severity === "warning" ? "text-warn" : "text-muted")} />
                {iss.message}
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length === 0 ? (
        <EmptyState title="No foreshadowing threads yet" action={<Button onClick={onAdd}>Add a thread</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-md border border-line">
          <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `minmax(220px, 1.4fr) repeat(${n}, minmax(36px, 1fr))` }}>
            <div className="border-b border-line bg-surface/60 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted">Thread</div>
            {chapters.map((c, i) => (
              <div key={c.id} title={c.title} className="border-b border-l border-line bg-surface/60 py-2 text-center text-xs tabular-nums text-muted">
                {i + 1}
              </div>
            ))}
            {items.map((f) => {
              const a = f.introducedChapterId ? ci.get(f.introducedChapterId) : undefined;
              const exp = f.expectedPayoffChapterId ? ci.get(f.expectedPayoffChapterId) : undefined;
              const act = f.actualPayoffChapterId ? ci.get(f.actualPayoffChapterId) : undefined;
              const end = act ?? exp;
              return (
                <div key={f.id} className="contents">
                  <button
                    onClick={() => onSelect(f.id)}
                    className={cn("border-b border-line px-3 py-2 text-left hover:bg-surface", selected === f.id && "bg-surface-2")}
                  >
                    <span className="serif block text-[13px] leading-snug">{f.description}</span>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider" style={{ color: STATUS_COLOR[f.status] }}>
                      {f.status}
                    </span>
                  </button>
                  {chapters.map((c, i) => {
                    const inSpan = a !== undefined && end !== undefined && i >= Math.min(a, end) && i <= Math.max(a, end);
                    return (
                      <div key={c.id} className="relative flex items-center border-b border-l border-line">
                        {inSpan && <div className="absolute inset-x-0 h-[3px]" style={{ background: STATUS_COLOR[f.status], opacity: act !== undefined ? 0.9 : 0.45 }} />}
                        {i === a && <span className="relative z-10 mx-auto h-2.5 w-2.5 rounded-full border-2 border-bg" style={{ background: STATUS_COLOR[f.status] }} title="Introduced" />}
                        {i === exp && act === undefined && i !== a && <span className="relative z-10 mx-auto h-2.5 w-2.5 rounded-full border-2 border-dashed" style={{ borderColor: STATUS_COLOR[f.status] }} title="Expected payoff" />}
                        {i === act && i !== a && <span className="relative z-10 mx-auto h-3 w-3 rotate-45 border-2 border-bg" style={{ background: STATUS_COLOR[f.status] }} title="Paid off" />}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span>● introduced</span>
        <span>◌ expected payoff</span>
        <span>◆ actual payoff</span>
      </div>
    </div>
  );
}

function ForeshadowingEditor({
  f,
  chapters,
  characters,
  events,
  onDeleted,
}: {
  f: Foreshadowing;
  chapters: Chapter[];
  characters: { id: ID; name: string }[];
  events: { id: ID; title: string }[];
  onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const set = (p: Partial<Foreshadowing>) => updateForeshadowing(f.id, p);
  const chapterSelect = (key: "introducedChapterId" | "expectedPayoffChapterId" | "actualPayoffChapterId", label: string) => (
    <Field label={label}>
      <Select value={f[key] ?? ""} onChange={(e) => set({ [key]: e.target.value || null } as Partial<Foreshadowing>)}>
        <option value="">—</option>
        {chapters.map((c, i) => (
          <option key={c.id} value={c.id}>
            {i + 1}. {truncate(c.title, 30)}
          </option>
        ))}
      </Select>
    </Field>
  );
  const toggle = (key: "characterIds" | "eventIds", id: ID) => set({ [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] } as Partial<Foreshadowing>);
  return (
    <div className="space-y-4">
      <Field label="Description">
        <BufferedInput multiline rows={3} value={f.description} onCommit={(v) => set({ description: v })} className="serif" />
      </Field>
      <Field label="Status">
        <Select value={f.status} onChange={(e) => set({ status: e.target.value as ForeshadowingStatus })}>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      {chapterSelect("introducedChapterId", "Introduced in")}
      {chapterSelect("expectedPayoffChapterId", "Expected payoff")}
      {chapterSelect("actualPayoffChapterId", "Actual payoff")}
      <div>
        <SectionTitle>Characters</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {characters.map((c) => (
            <button key={c.id} onClick={() => toggle("characterIds", c.id)} aria-pressed={f.characterIds.includes(c.id)} className={cn("rounded border px-2 py-0.5 text-xs", f.characterIds.includes(c.id) ? "border-accent text-ink" : "border-line text-muted")}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>Events</SectionTitle>
        <div className="flex flex-wrap gap-1.5">
          {events.map((e) => (
            <button key={e.id} onClick={() => toggle("eventIds", e.id)} aria-pressed={f.eventIds.includes(e.id)} className={cn("rounded border px-2 py-0.5 text-xs", f.eventIds.includes(e.id) ? "border-accent text-ink" : "border-line text-muted")}>
              {truncate(e.title, 24)}
            </button>
          ))}
          {events.length === 0 && <Badge>No events</Badge>}
        </div>
      </div>
      <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
        <Trash2 size={13} /> Delete thread
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this foreshadowing thread?"
        danger
        confirmLabel="Delete"
        onConfirm={async () => {
          await deleteForeshadowing(f.id);
          onDeleted();
        }}
      />
    </div>
  );
}
