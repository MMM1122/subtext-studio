"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Grid3x3, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useActions, useChapters, useCharacters, useEvents, useFacts, useKnowledge } from "@/hooks/data";
import {
  addAction,
  addFact,
  deleteAction,
  deleteFact,
  deleteKnowledgeRecord,
  setKnowledge,
  updateAction,
  updateFact,
  updateKnowledgeRecord,
} from "@/lib/repositories/knowledge";
import {
  checkActions,
  cellHistory,
  DISCREPANCY_LABEL,
  findDiscrepancies,
  indexKnowledge,
  LEVELS,
  nextLevel,
  REQUIRES_LABEL,
  resolveCell,
  type Discrepancy,
} from "@/features/knowledge/logic";
import { Inspector, useCurrentProject } from "@/components/layout/ProjectShell";
import { Button } from "@/components/ui/button";
import { BufferedInput, Field, Input, Select } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge, EmptyState, Loading, Notice, SectionTitle, Tabs } from "@/components/ui/misc";
import { cn, truncate } from "@/lib/utils/text";
import { LEVEL_COLOR, LevelGlyph, LevelLabel } from "./levels";
import {
  AUTHOR_AGENT,
  READER_AGENT,
  type Chapter,
  type CharacterAction,
  type FactCategory,
  type ID,
  type KnowledgeLevel,
  type KnowledgeState,
  type StoryEvent,
  type StoryFact,
} from "@/types";

type View = "matrix" | "disclosure" | "actions";
type Selection = { kind: "cell"; factId: ID; agentId: ID } | { kind: "fact"; factId: ID } | null;

const CATEGORY_LABEL: Record<FactCategory, string> = { fact: "Fact", secret: "Secret", clue: "Clue", event: "Event" };

export function KnowledgeMatrix() {
  const project = useCurrentProject();
  const chapters = useChapters(project.id);
  const characters = useCharacters(project.id);
  const facts = useFacts(project.id);
  const records = useKnowledge(project.id);
  const actions = useActions(project.id);
  const events = useEvents(project.id);
  const [view, setView] = useState<View>("matrix");
  const [chapterPos, setChapterPos] = useState(0);
  const [sel, setSel] = useState<Selection>(null);
  const [hidden, setHidden] = useState<Set<ID>>(new Set());
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<KnowledgeLevel | "">("");
  const [showGaps, setShowGaps] = useState(true);
  const [newFact, setNewFact] = useState("");

  const chapterIndex = useMemo(() => new Map((chapters ?? []).map((c, i) => [c.id, i])), [chapters]);
  const index = useMemo(() => indexKnowledge(records ?? [], chapterIndex), [records, chapterIndex]);

  if (!chapters || !characters || !facts || !records || !actions || !events) return <Loading />;
  if (chapters.length === 0)
    return (
      <EmptyState icon={<Grid3x3 size={28} />} title="Add a chapter first">
        Knowledge states are anchored to chapters, so the matrix needs at least one chapter.
      </EmptyState>
    );

  const pos = Math.min(chapterPos, chapters.length - 1);
  const chapter = chapters[pos];
  const agents = [
    ...characters.filter((c) => !hidden.has(c.id)).map((c) => ({ id: c.id, name: c.name, color: c.color })),
    ...(hidden.has(READER_AGENT) ? [] : [{ id: READER_AGENT, name: "Reader 读者", color: "var(--accent)" }]),
    ...(hidden.has(AUTHOR_AGENT) ? [] : [{ id: AUTHOR_AGENT, name: "Author 作者", color: "var(--muted)" }]),
  ];
  const allAgents = [
    ...characters.map((c) => ({ id: c.id, name: c.name })),
    { id: READER_AGENT, name: "Reader 读者" },
    { id: AUTHOR_AGENT, name: "Author 作者" },
  ];
  const agentName = (id: ID) => allAgents.find((a) => a.id === id)?.name ?? "?";
  const names = Object.fromEntries(characters.map((c) => [c.id, c.name]));
  const discrepancies = findDiscrepancies(facts, characters.map((c) => c.id), index, chapterIndex, pos, names);
  const gapKey = new Set(discrepancies.map((d) => `${d.factId}|${d.agentId}`));
  const actionWarnings = checkActions(actions, index, chapterIndex);

  const visibleFacts = facts.filter((f) => {
    if (query && !(f.title + " " + f.description).toLowerCase().includes(query.toLowerCase())) return false;
    if (levelFilter) return agents.some((a) => resolveCell(index, chapterIndex, f.id, a.id, pos).level === levelFilter);
    return true;
  });

  const cycle = (factId: ID, agentId: ID) => {
    const cur = resolveCell(index, chapterIndex, factId, agentId, pos).level;
    void setKnowledge(project.id, factId, agentId, chapter.id, nextLevel(cur));
    setSel({ kind: "cell", factId, agentId });
  };

  const selectedFact = sel ? facts.find((f) => f.id === sel.factId) : undefined;

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3">
          <Tabs
            className="border-b-0"
            value={view}
            onChange={setView}
            items={[
              { value: "matrix", label: "Matrix" },
              { value: "disclosure", label: "Disclosure over time" },
              { value: "actions", label: `Action checks${actionWarnings.length ? ` (${actionWarnings.length})` : ""}` },
            ]}
          />
        </div>

        {/* Chapter rail */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface/40 px-4 py-2.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">As of chapter</span>
          <Button size="icon-sm" variant="ghost" disabled={pos === 0} onClick={() => setChapterPos(pos - 1)} aria-label="Previous chapter">
            <ChevronLeft size={15} />
          </Button>
          <ol className="flex items-center gap-1" aria-label="Chapters">
            {chapters.map((c, i) => (
              <li key={c.id}>
                <button
                  onClick={() => setChapterPos(i)}
                  aria-current={i === pos ? "step" : undefined}
                  title={c.title}
                  className={cn(
                    "h-7 min-w-7 rounded border px-2 text-xs tabular-nums transition-colors",
                    i === pos ? "border-accent bg-accent text-bg" : i < pos ? "border-line bg-surface-2 text-ink" : "border-line text-muted hover:text-ink",
                  )}
                >
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
          <Button size="icon-sm" variant="ghost" disabled={pos === chapters.length - 1} onClick={() => setChapterPos(pos + 1)} aria-label="Next chapter">
            <ChevronRight size={15} />
          </Button>
          <span className="serif truncate text-sm text-ink">{chapter.title}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {view === "matrix" && (
            <div className="px-4 py-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Input className="h-8 w-52" placeholder="Search facts…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search facts" />
                <Select className="h-8 w-44" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as KnowledgeLevel | "")} aria-label="Filter by state">
                  <option value="">Any state</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      Has “{l}”
                    </option>
                  ))}
                </Select>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input type="checkbox" checked={showGaps} onChange={(e) => setShowGaps(e.target.checked)} /> Highlight reader ↔ character gaps
                </label>
                <div className="ml-auto flex flex-wrap items-center gap-1">
                  {allAgents.map((a) => (
                    <button
                      key={a.id}
                      onClick={() =>
                        setHidden((h) => {
                          const n = new Set(h);
                          if (n.has(a.id)) n.delete(a.id);
                          else n.add(a.id);
                          return n;
                        })
                      }
                      aria-pressed={!hidden.has(a.id)}
                      className={cn("rounded border px-1.5 py-0.5 text-[11px]", hidden.has(a.id) ? "border-line text-muted/60 line-through" : "border-line text-ink")}
                    >
                      {truncate(a.name, 14)}
                    </button>
                  ))}
                </div>
              </div>

              {facts.length === 0 ? (
                <EmptyState title="No story facts yet">Add facts, secrets or clues below, then mark who knows what at each chapter.</EmptyState>
              ) : (
                <div className="overflow-x-auto rounded-md border border-line">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-surface/60">
                        <th scope="col" className="sticky left-0 z-10 min-w-[220px] border-b border-line bg-surface px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                          Story information
                        </th>
                        {agents.map((a) => (
                          <th key={a.id} scope="col" className="min-w-[120px] border-b border-l border-line px-2 py-2 text-left font-normal">
                            <span className="flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.color }} />
                              <span className={cn("truncate text-[13px]", a.id === READER_AGENT || a.id === AUTHOR_AGENT ? "font-medium" : "serif")}>{a.name}</span>
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleFacts.map((f) => (
                        <tr key={f.id} className="group">
                          <th scope="row" className="sticky left-0 z-10 border-b border-line bg-bg px-3 py-1.5 text-left font-normal">
                            <button onClick={() => setSel({ kind: "fact", factId: f.id })} className="block w-full text-left">
                              <span className="serif block text-[14px] leading-snug text-ink">{f.title}</span>
                              <span className="text-[10px] uppercase tracking-wider text-muted">{CATEGORY_LABEL[f.category]}</span>
                            </button>
                          </th>
                          {agents.map((a) => {
                            const r = resolveCell(index, chapterIndex, f.id, a.id, pos);
                            const isSel = sel?.kind === "cell" && sel.factId === f.id && sel.agentId === a.id;
                            const gap = showGaps && gapKey.has(`${f.id}|${a.id}`);
                            const setHere = !!r.record && !r.inherited;
                            return (
                              <td key={a.id} className="border-b border-l border-line p-0">
                                <button
                                  onClick={() => cycle(f.id, a.id)}
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    setSel({ kind: "cell", factId: f.id, agentId: a.id });
                                  }}
                                  aria-label={`${f.title} — ${a.name}: ${r.level}${r.inherited ? " (carried over)" : setHere ? " (set in this chapter)" : ""}. Click to change.`}
                                  title={r.record?.reason || (r.inherited ? "Carried over from an earlier chapter" : "Click to cycle · right-click for details")}
                                  className={cn(
                                    "relative flex h-11 w-full items-center gap-1.5 px-2 text-left text-xs transition-colors hover:bg-surface",
                                    isSel && "outline outline-2 -outline-offset-2 outline-accent",
                                    gap && "bg-warn/10",
                                  )}
                                >
                                  <span className={cn("flex items-center gap-1.5", r.inherited && "opacity-55")}>
                                    <LevelGlyph level={r.level} />
                                    <span className={r.level === "unknown" ? "text-muted/70" : "text-ink"}>{r.level === "unknown" ? "—" : r.level}</span>
                                  </span>
                                  {setHere && <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-accent" aria-hidden title="Changed in this chapter" />}
                                  {r.record?.reason && <span className="absolute bottom-1 right-1 text-[9px] text-muted" aria-hidden>¶</span>}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <form
                className="mt-3 flex max-w-xl gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newFact.trim()) return;
                  const f = await addFact(project.id, { title: newFact.trim() });
                  setNewFact("");
                  setSel({ kind: "fact", factId: f.id });
                }}
              >
                <Input value={newFact} onChange={(e) => setNewFact(e.target.value)} placeholder="New fact, secret or clue…" aria-label="New fact" className="h-8" />
                <Button type="submit" size="sm" variant="outline" className="h-8">
                  <Plus size={13} /> Add
                </Button>
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted">
                {LEVELS.map((l) => (
                  <LevelLabel key={l} level={l} />
                ))}
                <span className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-accent" /> set in this chapter
                </span>
                <span className="opacity-60">faded = carried over from an earlier chapter</span>
              </div>

              <DiscrepancyList items={discrepancies} facts={facts} agentName={agentName} onSelect={(d) => setSel({ kind: "cell", factId: d.factId, agentId: d.agentId })} />
            </div>
          )}

          {view === "disclosure" && <DisclosureView facts={facts} chapters={chapters} index={index} chapterIndex={chapterIndex} allAgents={allAgents} onPick={(i) => setChapterPos(i)} />}

          {view === "actions" && (
            <ActionsView
              projectId={project.id}
              actions={actions}
              chapters={chapters}
              facts={facts}
              characters={characters}
              warnings={new Map(actionWarnings.map((w) => [w.action.id, w.message]))}
              defaultChapterId={chapter.id}
            />
          )}
        </div>
      </section>

      <Inspector title={sel?.kind === "fact" ? "Story fact" : "Knowledge state"}>
        {sel?.kind === "cell" && selectedFact ? (
          <CellInspector
            key={`${sel.factId}|${sel.agentId}|${chapter.id}`}
            projectId={project.id}
            fact={selectedFact}
            agentId={sel.agentId}
            agentName={agentName(sel.agentId)}
            chapter={chapter}
            chapters={chapters}
            index={index}
            chapterIndex={chapterIndex}
            pos={pos}
            onJump={setChapterPos}
          />
        ) : sel?.kind === "fact" && selectedFact ? (
          <FactInspector key={selectedFact.id} fact={selectedFact} events={events} onDeleted={() => setSel(null)} />
        ) : (
          <div className="space-y-3 text-sm text-muted">
            <p>Click a cell to cycle its state at the current chapter. Right-click (or use the inspector) to record why.</p>
            <Notice>
              Each change is stored as a historical record anchored to a chapter. Editing chapter 3 never alters what was recorded for chapter 1 —
              later chapters inherit the most recent earlier state until you change it.
            </Notice>
          </div>
        )}
      </Inspector>
    </div>
  );
}

function DiscrepancyList({
  items,
  facts,
  agentName,
  onSelect,
}: {
  items: Discrepancy[];
  facts: StoryFact[];
  agentName: (id: ID) => string;
  onSelect: (d: Discrepancy) => void;
}) {
  const groups = (["dramatic-irony", "reader-in-dark", "misbelief"] as const).map((k) => ({ k, list: items.filter((d) => d.kind === k) }));
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-3">
      {groups.map(({ k, list }) => (
        <div key={k}>
          <SectionTitle>
            {DISCREPANCY_LABEL[k].split(" — ")[0]} ({list.length})
          </SectionTitle>
          <p className="mb-2 text-[11px] text-muted">{DISCREPANCY_LABEL[k].split(" — ")[1]}</p>
          {list.length === 0 ? (
            <p className="text-xs text-muted/70">None at this chapter.</p>
          ) : (
            <ul className="space-y-1">
              {list.map((d, i) => (
                <li key={i}>
                  <button onClick={() => onSelect(d)} className="w-full rounded px-1.5 py-1 text-left text-xs hover:bg-surface">
                    <span className="serif text-[13px] text-ink">{facts.find((f) => f.id === d.factId)?.title}</span>
                    <span className="block text-muted">{agentName(d.agentId)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function CellInspector({
  projectId,
  fact,
  agentId,
  agentName,
  chapter,
  chapters,
  index,
  chapterIndex,
  pos,
  onJump,
}: {
  projectId: ID;
  fact: StoryFact;
  agentId: ID;
  agentName: string;
  chapter: Chapter;
  chapters: Chapter[];
  index: Map<string, KnowledgeState[]>;
  chapterIndex: Map<ID, number>;
  pos: number;
  onJump: (i: number) => void;
}) {
  const r = resolveCell(index, chapterIndex, fact.id, agentId, pos);
  const history = cellHistory(index, fact.id, agentId);
  const here = r.record && !r.inherited ? r.record : null;
  return (
    <div className="space-y-5">
      <div>
        <p className="serif text-base leading-snug">{fact.title}</p>
        <p className="text-sm text-muted">{agentName}</p>
      </div>
      <div>
        <SectionTitle>At chapter {pos + 1}</SectionTitle>
        <div className="grid grid-cols-2 gap-1.5">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setKnowledge(projectId, fact.id, agentId, chapter.id, l)}
              aria-pressed={r.level === l}
              className={cn("rounded border px-2 py-1.5 text-left text-xs", r.level === l ? "border-accent bg-surface-2" : "border-line hover:bg-surface")}
            >
              <LevelLabel level={l} zh={false} />
            </button>
          ))}
        </div>
        {r.inherited && r.record && (
          <p className="mt-2 text-xs text-muted">Carried over from chapter {chapterIndex.get(r.record.chapterId)! + 1}. Choosing a state here records a change at this chapter only.</p>
        )}
      </div>
      {here && (
        <>
          <Field label="Why does this agent hold this state?">
            <BufferedInput multiline rows={3} value={here.reason} onCommit={(v) => updateKnowledgeRecord(here.id, { reason: v })} placeholder="Evidence, misdirection, what they saw…" />
          </Field>
          <Button size="sm" variant="ghost" onClick={() => deleteKnowledgeRecord(here.id)}>
            <RotateCcw size={13} /> Remove change at this chapter
          </Button>
        </>
      )}
      <div>
        <SectionTitle>History</SectionTitle>
        {history.length === 0 ? (
          <p className="text-xs text-muted">No recorded changes — Unknown throughout.</p>
        ) : (
          <ol className="relative space-y-3 border-l border-line pl-4">
            {history.map((h) => {
              const i = chapterIndex.get(h.chapterId)!;
              return (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-bg" style={{ background: LEVEL_COLOR[h.level] }} />
                  <button onClick={() => onJump(i)} className={cn("text-left text-xs", i === pos ? "text-ink" : "text-muted hover:text-ink")}>
                    <span className="tabular-nums">Ch {i + 1}</span> · {truncate(chapters[i]?.title ?? "", 22)}
                  </button>
                  <div className="text-sm">
                    <LevelLabel level={h.level} />
                  </div>
                  {h.reason && <p className="serif mt-0.5 text-xs leading-relaxed text-muted">{h.reason}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

function FactInspector({ fact, events, onDeleted }: { fact: StoryFact; events: StoryEvent[]; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="space-y-4">
      <Field label="Title">
        <BufferedInput value={fact.title} onCommit={(v) => v.trim() && updateFact(fact.id, { title: v.trim() })} className="serif" />
      </Field>
      <Field label="Category">
        <Select value={fact.category} onChange={(e) => updateFact(fact.id, { category: e.target.value as FactCategory })}>
          {(Object.keys(CATEGORY_LABEL) as FactCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description">
        <BufferedInput multiline rows={4} value={fact.description} onCommit={(v) => updateFact(fact.id, { description: v })} />
      </Field>
      <Field label="Linked timeline event">
        <Select value={fact.eventId ?? ""} onChange={(e) => updateFact(fact.id, { eventId: e.target.value || null })}>
          <option value="">—</option>
          {[...events]
            .sort((a, b) => a.chronoOrder - b.chronoOrder)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
        </Select>
      </Field>
      <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
        <Trash2 size={13} /> Delete fact
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this fact?"
        danger
        confirmLabel="Delete"
        description="All knowledge records and action checks for this fact will be deleted."
        onConfirm={async () => {
          await deleteFact(fact.id);
          onDeleted();
        }}
      />
    </div>
  );
}

function DisclosureView({
  facts,
  chapters,
  index,
  chapterIndex,
  allAgents,
  onPick,
}: {
  facts: StoryFact[];
  chapters: Chapter[];
  index: Map<string, KnowledgeState[]>;
  chapterIndex: Map<ID, number>;
  allAgents: { id: ID; name: string }[];
  onPick: (i: number) => void;
}) {
  const [agent, setAgent] = useState<ID>(READER_AGENT);
  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Field label="Agent" className="w-60">
          <Select value={agent} onChange={(e) => setAgent(e.target.value)}>
            {allAgents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <p className="max-w-lg text-xs text-muted">How each piece of information is disclosed to this agent across the book. A dot marks the chapter where you recorded a change.</p>
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-surface/60">
              <th scope="col" className="sticky left-0 z-10 min-w-[220px] border-b border-line bg-surface px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted">
                Information
              </th>
              {chapters.map((c, i) => (
                <th key={c.id} scope="col" className="border-b border-l border-line px-1 py-2 text-center text-xs font-normal">
                  <button onClick={() => onPick(i)} title={c.title} className="tabular-nums text-muted hover:text-ink">
                    {i + 1}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facts.map((f) => (
              <tr key={f.id}>
                <th scope="row" className="sticky left-0 z-10 border-b border-line bg-bg px-3 py-2 text-left font-normal">
                  <span className="serif text-[14px]">{f.title}</span>
                </th>
                {chapters.map((c, i) => {
                  const r = resolveCell(index, chapterIndex, f.id, agent, i);
                  return (
                    <td key={c.id} className="h-10 min-w-[64px] border-b border-l border-line p-0" title={`${c.title}: ${r.level}${r.record?.reason ? ` — ${r.record.reason}` : ""}`}>
                      <div className="relative flex h-full items-center justify-center" style={{ background: r.level === "unknown" ? undefined : `color-mix(in srgb, ${LEVEL_COLOR[r.level]} ${r.inherited ? 14 : 28}%, transparent)` }}>
                        <LevelGlyph level={r.level} />
                        {r.record && !r.inherited && <span className="absolute right-1 top-1 h-1 w-1 rounded-full bg-accent" />}
                        <span className="sr-only">{r.level}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionsView({
  projectId,
  actions,
  chapters,
  facts,
  characters,
  warnings,
  defaultChapterId,
}: {
  projectId: ID;
  actions: CharacterAction[];
  chapters: Chapter[];
  facts: StoryFact[];
  characters: { id: ID; name: string }[];
  warnings: Map<ID, string>;
  defaultChapterId: ID;
}) {
  const ci = new Map(chapters.map((c, i) => [c.id, i]));
  const sorted = [...actions].sort((a, b) => (ci.get(a.chapterId) ?? 0) - (ci.get(b.chapterId) ?? 0));
  const canAdd = characters.length > 0 && facts.length > 0;
  return (
    <div className="mx-auto max-w-4xl px-4 py-4">
      <Notice className="mb-4">
        Record what a character <em>does</em> that presupposes their knowledge (e.g. “lies about the letter” requires knowing it is forged). Subtext Studio
        compares these explicitly recorded actions with your recorded knowledge states. It does not read or analyse the manuscript text.
      </Notice>
      {canAdd ? (
        <Button
          size="sm"
          variant="outline"
          className="mb-4"
          onClick={() => addAction(projectId, { characterId: characters[0].id, chapterId: defaultChapterId, factId: facts[0].id, description: "" })}
        >
          <Plus size={13} /> Record action
        </Button>
      ) : (
        <p className="mb-4 text-sm text-muted">Add at least one character and one fact first.</p>
      )}
      <ul className="space-y-3">
        {sorted.map((a) => {
          const warn = warnings.get(a.id);
          return (
            <li key={a.id} className={cn("rounded-md border p-3", warn ? "border-warn/60" : "border-line")}>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Select value={a.characterId} onChange={(e) => updateAction(a.id, { characterId: e.target.value })} aria-label="Character">
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Select value={a.chapterId} onChange={(e) => updateAction(a.id, { chapterId: e.target.value })} aria-label="Chapter">
                  {chapters.map((c, i) => (
                    <option key={c.id} value={c.id}>
                      Ch {i + 1}. {truncate(c.title, 24)}
                    </option>
                  ))}
                </Select>
                <Select value={a.requires} onChange={(e) => updateAction(a.id, { requires: e.target.value as CharacterAction["requires"] })} aria-label="Requirement">
                  {(Object.keys(REQUIRES_LABEL) as CharacterAction["requires"][]).map((k) => (
                    <option key={k} value={k}>
                      {REQUIRES_LABEL[k]}
                    </option>
                  ))}
                </Select>
                <Button size="icon" variant="ghost" onClick={() => deleteAction(a.id)} aria-label="Delete action">
                  <Trash2 size={14} />
                </Button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_2fr]">
                <Select value={a.factId} onChange={(e) => updateAction(a.id, { factId: e.target.value })} aria-label="Fact">
                  {facts.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </Select>
                <BufferedInput value={a.description} onCommit={(v) => updateAction(a.id, { description: v })} placeholder="What the character does…" aria-label="Action description" />
              </div>
              {warn ? (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-ink">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0 text-warn" /> {warn}
                </p>
              ) : (
                <Badge className="mt-2">consistent with recorded knowledge</Badge>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
