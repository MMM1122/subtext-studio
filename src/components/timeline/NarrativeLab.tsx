"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, CornerUpLeft, CornerUpRight, Info, Plus, Trash2, Waypoints } from "lucide-react";
import { useChapters, useCharacters, useEvents, useScenes } from "@/hooks/data";
import { addEvent, deleteEvent, reorderChronological, reorderNarrative, reorderSubjective, updateEvent } from "@/lib/repositories/narrative";
import { updateProject } from "@/lib/repositories/projects";
import { byChrono, byNarrative, checkCausality, narrativeMarkers, nonlinearity, type NarrativeIssue, type NarrativeMarker } from "@/features/narrative/logic";
import { Inspector, useCurrentProject } from "@/components/layout/ProjectShell";
import { Button } from "@/components/ui/button";
import { BufferedInput, Field, Input, Select } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge, Dot, EmptyState, Loading, Notice, SectionTitle, Tabs } from "@/components/ui/misc";
import { cn, parseTags } from "@/lib/utils/text";
import { ROW_GAP, ROW_H, SortableColumn } from "./SortableColumn";
import type { Chapter, Character, ID, Scene, StoryEvent } from "@/types";

const MARKER_COLOR: Record<NarrativeMarker, string> = {
  linear: "var(--muted)",
  flashback: "var(--c-clay)",
  "flash-forward": "var(--c-slate)",
};
const TRACK_COLORS = ["var(--c-sage)", "var(--c-sand)", "var(--c-plum)", "var(--c-teal)", "var(--c-slate)", "var(--c-moss)"];

type View = "dual" | "subjective" | "issues";

export function NarrativeLab() {
  const project = useCurrentProject();
  const events = useEvents(project.id);
  const chapters = useChapters(project.id);
  const scenes = useScenes(project.id);
  const characters = useCharacters(project.id);
  const [view, setView] = useState<View>("dual");
  const [selected, setSelected] = useState<ID | null>(null);
  const [hovered, setHovered] = useState<ID | null>(null);
  const [trackFilter, setTrackFilter] = useState<string>("");

  const chapterIndex = useMemo(() => new Map((chapters ?? []).map((c, i) => [c.id, i])), [chapters]);
  const issues = useMemo(() => (events ? checkCausality(events, chapterIndex) : []), [events, chapterIndex]);
  const markers = useMemo(() => (events ? narrativeMarkers(events) : new Map<ID, NarrativeMarker>()), [events]);

  if (!events || !chapters || !scenes || !characters) return <Loading />;

  const tracks = Array.from(new Set([...(project.tracks ?? []), ...events.map((e) => e.track).filter(Boolean)]));
  const trackColor = (t: string) => TRACK_COLORS[Math.max(0, tracks.indexOf(t)) % TRACK_COLORS.length];
  const visible = trackFilter ? events.filter((e) => e.track === trackFilter) : events;
  const chrono = [...visible].sort(byChrono);
  const narrative = [...visible].sort(byNarrative);
  const sel = events.find((e) => e.id === selected) ?? null;
  const focusId = hovered ?? selected;
  const issuesFor = (id: ID) => issues.filter((i) => i.eventId === id && i.severity !== "info");

  // Reordering a filtered subset keeps hidden events in their relative slots.
  const mergeOrder = (all: StoryEvent[], subsetIds: ID[]) => {
    if (!trackFilter) return subsetIds;
    const subset = new Set(subsetIds);
    const queue = [...subsetIds];
    return all.map((e) => (subset.has(e.id) ? queue.shift()! : e.id));
  };

  const create = async () => {
    const e = await addEvent(project.id, { track: trackFilter || tracks[0] || "Main", title: `Event ${events.length + 1}` });
    setSelected(e.id);
  };

  const card = (e: StoryEvent, side: "chrono" | "narrative") => {
    const marker = markers.get(e.id) ?? "linear";
    const ch = e.chapterId ? chapters.find((c) => c.id === e.chapterId) : undefined;
    const bad = issuesFor(e.id).length > 0;
    const active = focusId === e.id;
    return (
      <button
        onClick={() => setSelected(e.id)}
        onMouseEnter={() => setHovered(e.id)}
        onMouseLeave={() => setHovered(null)}
        onFocus={() => setHovered(e.id)}
        onBlur={() => setHovered(null)}
        aria-pressed={selected === e.id}
        className={cn(
          "flex h-full w-full flex-col justify-center rounded-md border bg-bg px-3 text-left transition-colors",
          active ? "border-accent bg-surface" : "border-line hover:border-accent/50",
          selected === e.id && "ring-1 ring-accent",
        )}
      >
        <span className="flex items-center gap-2">
          <Dot color={trackColor(e.track)} />
          <span className="serif truncate text-[14px] text-ink">{e.title}</span>
          {bad && <AlertTriangle size={12} className="shrink-0 text-danger" aria-label="Has consistency issues" />}
        </span>
        <span className="mt-0.5 flex items-center gap-2 truncate pl-4 text-[11px] text-muted">
          {side === "chrono" ? (
            <>{e.storyTime || "—"}</>
          ) : (
            <>
              {ch ? `Ch ${chapterIndex.get(ch.id)! + 1}` : "No chapter"}
              {marker !== "linear" && (
                <span className="inline-flex items-center gap-0.5" style={{ color: MARKER_COLOR[marker] }}>
                  {marker === "flashback" ? <CornerUpLeft size={11} /> : <CornerUpRight size={11} />}
                  {marker}
                </span>
              )}
            </>
          )}
        </span>
      </button>
    );
  };

  const ROW = ROW_H + ROW_GAP;
  const cIdx = new Map(chrono.map((e, i) => [e.id, i]));
  const nIdx = new Map(narrative.map((e, i) => [e.id, i]));
  const height = Math.max(1, visible.length) * ROW;

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3">
          <Tabs
            className="border-b-0"
            value={view}
            onChange={setView}
            items={[
              { value: "dual", label: "Dual timeline" },
              { value: "subjective", label: "Subjective time" },
              { value: "issues", label: `Causality${issues.filter((i) => i.severity !== "info").length ? ` (${issues.filter((i) => i.severity !== "info").length})` : ""}` },
            ]}
          />
          <div className="ml-auto flex items-center gap-2 py-1.5">
            <Select className="h-8 w-40" value={trackFilter} onChange={(e) => setTrackFilter(e.target.value)} aria-label="Filter by track">
              <option value="">All tracks</option>
              {tracks.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="outline" onClick={create}>
              <Plus size={13} /> Event
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <EmptyState icon={<Waypoints size={28} />} title="No events yet" action={<Button variant="primary" onClick={create}>Add the first event</Button>}>
              Events live on two independent axes: when they happen in the story world, and when readers learn about them.
            </EmptyState>
          ) : view === "dual" ? (
            <div className="px-6 py-6">
              <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted">
                <span>
                  Nonlinearity: <strong className="text-ink">{Math.round(nonlinearity(visible) * 100)}%</strong> of event pairs shown out of chronological order
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4" style={{ background: MARKER_COLOR.flashback }} /> flashback
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-4" style={{ background: MARKER_COLOR["flash-forward"] }} /> flash-forward
                </span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(60px,140px)_minmax(0,1fr)] gap-0">
                <div>
                  <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Chronological time · 故事时间</h2>
                  <SortableColumn
                    ids={chrono.map((e) => e.id)}
                    label="Chronological order"
                    onReorder={(ids) => reorderChronological(mergeOrder([...events].sort(byChrono), ids))}
                    renderItem={(id) => card(events.find((e) => e.id === id)!, "chrono")}
                  />
                </div>
                <svg className="mt-[30px] w-full overflow-visible" height={height} aria-hidden preserveAspectRatio="none" viewBox={`0 0 100 ${height}`}>
                  {visible.map((e) => {
                    const y1 = cIdx.get(e.id)! * ROW + ROW_H / 2;
                    const y2 = nIdx.get(e.id)! * ROW + ROW_H / 2;
                    const m = markers.get(e.id) ?? "linear";
                    const on = focusId === e.id;
                    return (
                      <path
                        key={e.id}
                        d={`M0 ${y1} C 50 ${y1}, 50 ${y2}, 100 ${y2}`}
                        fill="none"
                        stroke={on ? "var(--accent)" : MARKER_COLOR[m]}
                        strokeWidth={on ? 2.5 : 1.2}
                        opacity={focusId && !on ? 0.25 : 0.85}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                </svg>
                <div>
                  <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Narrative order · 叙述顺序</h2>
                  <SortableColumn
                    ids={narrative.map((e) => e.id)}
                    label="Narrative order"
                    onReorder={(ids) => reorderNarrative(mergeOrder([...events].sort(byNarrative), ids))}
                    renderItem={(id) => card(events.find((e) => e.id === id)!, "narrative")}
                  />
                </div>
              </div>
              <p className="mt-6 text-xs text-muted">
                Drag within a column to reorder that axis only — the other axis is never changed. Flashback / flash-forward labels are computed from
                your two orderings.
              </p>
            </div>
          ) : view === "subjective" ? (
            <SubjectiveView events={events} characters={characters} onSelect={setSelected} selected={selected} />
          ) : (
            <IssuesView issues={issues} events={events} onSelect={setSelected} />
          )}
        </div>
      </section>
      <Inspector title="Event">
        {sel ? (
          <EventEditor
            key={sel.id}
            e={sel}
            events={events}
            chapters={chapters}
            scenes={scenes}
            characters={characters}
            tracks={tracks}
            issues={issues.filter((i) => i.eventId === sel.id)}
            onAddTrack={(t) => updateProject(project.id, { tracks: Array.from(new Set([...(project.tracks ?? []), t])) })}
            onDeleted={() => setSelected(null)}
          />
        ) : (
          <p className="text-sm text-muted">Select an event to edit it. The same event is highlighted on both timelines.</p>
        )}
      </Inspector>
    </div>
  );
}

function SubjectiveView({ events, characters, selected, onSelect }: { events: StoryEvent[]; characters: Character[]; selected: ID | null; onSelect: (id: ID) => void }) {
  const [charId, setCharId] = useState(characters[0]?.id ?? "");
  const c = characters.find((x) => x.id === charId);
  const involved = events.filter((e) => e.characterIds.includes(charId));
  const sorted = [...involved].sort((a, b) => {
    const sa = a.subjective?.[charId]?.order;
    const sb = b.subjective?.[charId]?.order;
    if (sa !== undefined && sb !== undefined) return sa - sb;
    if (sa !== undefined) return -1;
    if (sb !== undefined) return 1;
    return a.chronoOrder - b.chronoOrder;
  });
  if (!characters.length) return <EmptyState title="No characters">Add characters in the Character Lab first.</EmptyState>;
  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <Notice className="mb-5">
        Subjective time is an optional, author-defined view: the order in which a character experiences, remembers or understands events. It does not
        change chronology or narrative order.
      </Notice>
      <Field label="Character" className="mb-5 max-w-xs">
        <Select value={charId} onChange={(e) => setCharId(e.target.value)}>
          {characters.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </Select>
      </Field>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">{c?.name} is not linked to any events. Link characters to events in the inspector.</p>
      ) : (
        <SortableColumn
          ids={sorted.map((e) => e.id)}
          label={`${c?.name} subjective order`}
          onReorder={(ids) => reorderSubjective(charId, ids)}
          renderItem={(id, i) => {
            const e = events.find((x) => x.id === id)!;
            return (
              <div className={cn("flex h-full items-center gap-3 rounded-md border bg-bg px-3", selected === id ? "border-accent" : "border-line")}>
                <span className="w-5 text-right text-xs tabular-nums text-muted">{i + 1}</span>
                <button onClick={() => onSelect(id)} className="min-w-0 flex-1 text-left">
                  <span className="serif block truncate text-[14px]">{e.title}</span>
                  <span className="block text-[11px] text-muted">
                    story time: {e.storyTime || "—"} · chronological #{e.chronoOrder + 1}
                  </span>
                </button>
                <BufferedInput
                  className="h-8 w-56 text-xs"
                  placeholder="How they perceive it…"
                  value={e.subjective?.[charId]?.note ?? ""}
                  aria-label="Subjective note"
                  onCommit={(v) =>
                    updateEvent(e.id, { subjective: { ...e.subjective, [charId]: { order: e.subjective?.[charId]?.order ?? i, note: v } } })
                  }
                />
              </div>
            );
          }}
        />
      )}
    </div>
  );
}

function IssuesView({ issues, events, onSelect }: { issues: NarrativeIssue[]; events: StoryEvent[]; onSelect: (id: ID) => void }) {
  const icon = { error: <AlertTriangle size={14} className="text-danger" />, warning: <AlertTriangle size={14} className="text-warn" />, info: <Info size={14} className="text-muted" /> };
  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <Notice className="mb-5">
        These checks use only the causes, orders and chapter links you recorded. They never change your story, and they do not analyse manuscript text.
      </Notice>
      {issues.length === 0 ? (
        <p className="text-sm text-muted">No causal inconsistencies found among {events.length} events.</p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {issues.map((iss, i) => (
            <li key={i}>
              <button onClick={() => onSelect(iss.eventId)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface">
                <span className="mt-0.5">{icon[iss.severity]}</span>
                <span className="text-sm">{iss.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventEditor({
  e,
  events,
  chapters,
  scenes,
  characters,
  tracks,
  issues,
  onAddTrack,
  onDeleted,
}: {
  e: StoryEvent;
  events: StoryEvent[];
  chapters: Chapter[];
  scenes: Scene[];
  characters: Character[];
  tracks: string[];
  issues: NarrativeIssue[];
  onAddTrack: (t: string) => void;
  onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [newTrack, setNewTrack] = useState("");
  const set = (p: Partial<StoryEvent>) => updateEvent(e.id, p);
  const others = [...events].filter((x) => x.id !== e.id).sort(byChrono);
  const chScenes = scenes.filter((s) => s.chapterId === e.chapterId);
  return (
    <div className="space-y-4">
      {issues.length > 0 && (
        <div className="space-y-1.5">
          {issues.map((i, k) => (
            <Notice key={k} tone={i.severity === "error" ? "danger" : i.severity === "warning" ? "warn" : "info"}>
              {i.message}
            </Notice>
          ))}
        </div>
      )}
      <Field label="Title">
        <BufferedInput value={e.title} onCommit={(v) => v.trim() && set({ title: v.trim() })} className="serif" />
      </Field>
      <Field label="Description">
        <BufferedInput multiline rows={3} value={e.description} onCommit={(v) => set({ description: v })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Story time">
          <BufferedInput value={e.storyTime} onCommit={(v) => set({ storyTime: v })} placeholder="e.g. 1998 夏" />
        </Field>
        <Field label="Location">
          <BufferedInput value={e.location} onCommit={(v) => set({ location: v })} />
        </Field>
      </div>
      <p className="text-xs text-muted">
        Chronological #{e.chronoOrder + 1} · Narrative #{e.narrativeOrder + 1} (drag on the timeline to change)
      </p>
      <Field label="Track (parallel timeline)">
        <Select value={e.track} onChange={(ev) => set({ track: ev.target.value })}>
          {tracks.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <form
          className="mt-1.5 flex gap-1.5"
          onSubmit={(ev) => {
            ev.preventDefault();
            const t = newTrack.trim();
            if (!t) return;
            onAddTrack(t);
            void set({ track: t });
            setNewTrack("");
          }}
        >
          <Input className="h-7 text-xs" value={newTrack} onChange={(ev) => setNewTrack(ev.target.value)} placeholder="New track…" aria-label="New track name" />
          <Button size="sm" type="submit" variant="ghost">
            Add
          </Button>
        </form>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Chapter">
          <Select value={e.chapterId ?? ""} onChange={(ev) => set({ chapterId: ev.target.value || null, sceneId: null })}>
            <option value="">—</option>
            {chapters.map((c, i) => (
              <option key={c.id} value={c.id}>
                {i + 1}. {c.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Scene">
          <Select value={e.sceneId ?? ""} onChange={(ev) => set({ sceneId: ev.target.value || null })} disabled={!chScenes.length}>
            <option value="">—</option>
            {chScenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Characters involved">
        <div className="flex flex-wrap gap-1.5">
          {characters.map((c) => {
            const on = e.characterIds.includes(c.id);
            return (
              <button
                key={c.id}
                aria-pressed={on}
                onClick={() => set({ characterIds: on ? e.characterIds.filter((x) => x !== c.id) : [...e.characterIds, c.id] })}
                className={cn("rounded border px-2 py-1 text-xs", on ? "border-accent bg-surface-2 text-ink" : "border-line text-muted hover:text-ink")}
              >
                {c.name}
              </button>
            );
          })}
          {characters.length === 0 && <span className="text-xs text-muted">No characters yet.</span>}
        </div>
      </Field>
      <Field label="Caused by" hint="Events that must happen before this one.">
        <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-line p-2">
          {others.length === 0 && <span className="text-xs text-muted">No other events.</span>}
          {others.map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={e.causeIds.includes(o.id)}
                onChange={(ev) => set({ causeIds: ev.target.checked ? [...e.causeIds, o.id] : e.causeIds.filter((x) => x !== o.id) })}
              />
              <span className="tabular-nums text-muted">#{o.chronoOrder + 1}</span>
              <span className="truncate">{o.title}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Consequences">
        <BufferedInput multiline rows={2} value={e.consequences} onCommit={(v) => set({ consequences: v })} />
      </Field>
      <Field label="Tags">
        <BufferedInput value={e.tags.join(", ")} onCommit={(v) => set({ tags: parseTags(v) })} placeholder="comma separated" />
      </Field>
      {e.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {e.tags.map((t) => (
            <Badge key={t}>#{t}</Badge>
          ))}
        </div>
      )}
      <SectionTitle className="pt-2">Danger zone</SectionTitle>
      <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
        <Trash2 size={13} /> Delete event
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete event?"
        danger
        confirmLabel="Delete"
        description={<>“{e.title}” will be removed from both timelines and from other events&apos; causes.</>}
        onConfirm={async () => {
          await deleteEvent(e.id);
          onDeleted();
        }}
      />
    </div>
  );
}
