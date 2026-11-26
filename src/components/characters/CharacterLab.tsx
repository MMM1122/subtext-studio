"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Plus, Trash2, Users, X } from "lucide-react";
import { useChapters, useCharacters, useCharacterStates, useRelationships } from "@/hooks/data";
import {
  addCharacter,
  addCharacterState,
  characterDependencies,
  deleteCharacter,
  deleteCharacterState,
  deleteRelationship,
  updateCharacter,
  updateCharacterState,
  updateRelationship,
} from "@/lib/repositories/characters";
import { ROLE_COLORS, PALETTE } from "@/lib/repositories/factories";
import { useCurrentProject, Inspector } from "@/components/layout/ProjectShell";
import { Button } from "@/components/ui/button";
import { BufferedInput, Field, Input, Select } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dot, EmptyState, Loading, Notice, SectionTitle, Tabs } from "@/components/ui/misc";
import { cn } from "@/lib/utils/text";
import { newId } from "@/lib/utils/id";
import type { Chapter, Character, CharacterRelationship, CharacterRole, CharacterState, ID } from "@/types";

const RelationshipGraph = dynamic(() => import("./RelationshipGraph").then((m) => m.RelationshipGraph), {
  ssr: false,
  loading: () => <Loading label="Loading graph…" />,
});
const StateChart = dynamic(() => import("@/components/analytics/StateChart").then((m) => m.StateChart), { ssr: false, loading: () => <Loading /> });

const ROLES: CharacterRole[] = ["protagonist", "deuteragonist", "antagonist", "supporting", "minor", "other"];

const PROFILE_SECTIONS: { title: string; fields: { key: keyof Character; label: string; hint?: string }[] }[] = [
  {
    title: "Surface",
    fields: [
      { key: "appearance", label: "Appearance" },
      { key: "background", label: "Background" },
      { key: "personality", label: "Personality" },
    ],
  },
  {
    title: "Drive",
    fields: [
      { key: "goals", label: "Goals", hint: "What they consciously want" },
      { key: "motivations", label: "Motivations", hint: "Why they want it" },
      { key: "fears", label: "Fears" },
      { key: "values", label: "Values" },
    ],
  },
  {
    title: "Conflict",
    fields: [
      { key: "internalConflicts", label: "Internal conflicts" },
      { key: "externalConflicts", label: "External conflicts" },
    ],
  },
  {
    title: "Interior",
    fields: [
      { key: "memories", label: "Memories" },
      { key: "beliefs", label: "Beliefs" },
      { key: "secrets", label: "Secrets" },
    ],
  },
  {
    title: "Change",
    fields: [
      { key: "arc", label: "Character arc" },
      { key: "notes", label: "Notes" },
    ],
  },
];

type Tab = "graph" | "profile" | "states";

export function CharacterLab() {
  const project = useCurrentProject();
  const characters = useCharacters(project.id);
  const relationships = useRelationships(project.id);
  const states = useCharacterStates(project.id);
  const chapters = useChapters(project.id);
  const [tab, setTab] = useState<Tab>("graph");
  const [selectedId, setSelectedId] = useState<ID | null>(null);
  const [edgeId, setEdgeId] = useState<ID | null>(null);
  const [deleting, setDeleting] = useState<{ c: Character; deps: Awaited<ReturnType<typeof characterDependencies>> } | null>(null);

  if (!characters || !relationships || !states || !chapters) return <Loading />;
  const cast = [...characters].sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name));
  const selected = characters.find((c) => c.id === selectedId) ?? null;
  const edge = relationships.find((r) => r.id === edgeId) ?? null;

  const create = async () => {
    const c = await addCharacter(project.id, { name: `Character ${characters.length + 1}` });
    setSelectedId(c.id);
    if (tab === "graph") setTab("profile");
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="hidden w-56 shrink-0 flex-col border-r border-line md:flex">
        <div className="flex h-11 items-center justify-between border-b border-line px-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Cast</span>
          <Button size="icon-sm" variant="ghost" onClick={create} aria-label="Add character">
            <Plus size={15} />
          </Button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto py-2" aria-label="Characters">
          {cast.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  setSelectedId(c.id);
                  setEdgeId(null);
                }}
                aria-current={c.id === selectedId ? "true" : undefined}
                className={cn("flex w-full items-center gap-2 px-4 py-2 text-left", c.id === selectedId ? "bg-surface-2" : "hover:bg-surface")}
              >
                <Dot color={c.color} />
                <span className="min-w-0 flex-1">
                  <span className="serif block truncate text-[14px]">{c.name}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-muted">{c.role}</span>
                </span>
              </button>
            </li>
          ))}
          {characters.length === 0 && <li className="px-4 py-4 text-sm text-muted">No characters yet.</li>}
        </ul>
      </div>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Tabs
            className="border-b-0"
            value={tab}
            onChange={setTab}
            items={[
              { value: "graph", label: "Relationship graph" },
              { value: "profile", label: "Profile" },
              { value: "states", label: "State history" },
            ]}
          />
          <Select
            className="ml-auto h-8 w-40 md:hidden"
            aria-label="Select character"
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
          >
            <option value="">Choose…</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="outline" className="ml-auto hidden md:inline-flex" onClick={create}>
            <Plus size={13} /> Character
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {characters.length === 0 ? (
            <EmptyState icon={<Users size={28} />} title="No characters yet" action={<Button variant="primary" onClick={create}>Create a character</Button>}>
              Build your cast, then draw connections between them on the relationship graph.
            </EmptyState>
          ) : tab === "graph" ? (
            <div className="relative h-full">
              <RelationshipGraph
                projectId={project.id}
                characters={characters}
                relationships={relationships}
                selectedCharacter={selectedId}
                selectedEdge={edgeId}
                onSelectCharacter={setSelectedId}
                onSelectEdge={setEdgeId}
              />
              <p className="pointer-events-none absolute left-3 top-3 rounded bg-bg/80 px-2 py-1 text-[11px] text-muted">
                Drag between handles to connect · click a line to edit
              </p>
            </div>
          ) : !selected ? (
            <EmptyState title="Select a character">Choose someone from the cast list.</EmptyState>
          ) : tab === "profile" ? (
            <ProfileForm key={selected.id} c={selected} />
          ) : (
            <StatesView
              key={selected.id}
              c={selected}
              states={states.filter((s) => s.characterId === selected.id)}
              chapters={chapters}
              projectId={project.id}
              StateChart={StateChart}
            />
          )}
        </div>
      </section>

      <Inspector title={edge ? "Relationship" : "Character"}>
        {edge ? (
          <EdgeEditor key={edge.id} rel={edge} characters={characters} onClose={() => setEdgeId(null)} />
        ) : selected ? (
          <CharacterSummary
            c={selected}
            relationships={relationships.filter((r) => r.sourceId === selected.id || r.targetId === selected.id)}
            characters={characters}
            onEdge={setEdgeId}
            onDelete={async () => setDeleting({ c: selected, deps: await characterDependencies(selected.id) })}
          />
        ) : (
          <p className="text-sm text-muted">Select a character or a relationship line.</p>
        )}
      </Inspector>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete character?"
        danger
        confirmLabel="Delete"
        description={<>“{deleting?.c.name}” will be removed from this project.</>}
        onConfirm={async () => {
          if (!deleting) return;
          await deleteCharacter(deleting.c.id);
          setSelectedId(null);
        }}
      >
        {deleting && (
          <ul className="space-y-1 text-sm text-muted">
            <li>· {deleting.deps.relationships} relationship(s) deleted</li>
            <li>· {deleting.deps.states} state snapshot(s) deleted</li>
            <li>· {deleting.deps.knowledge} knowledge record(s) deleted</li>
            <li>· {deleting.deps.actions} recorded action(s) deleted</li>
            <li>· Removed from timeline events and foreshadowing (they are kept)</li>
          </ul>
        )}
      </ConfirmDialog>
    </div>
  );
}

function ProfileForm({ c }: { c: Character }) {
  const set = (patch: Partial<Character>) => updateCharacter(c.id, patch);
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-[1fr_180px_120px]">
          <Field label="Name">
            <BufferedInput value={c.name} onCommit={(v) => v.trim() && set({ name: v.trim() })} className="serif text-lg" />
          </Field>
          <Field label="Role">
            <Select value={c.role} onChange={(e) => set({ role: e.target.value as CharacterRole, color: ROLE_COLORS[e.target.value as CharacterRole] })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Colour">
            <div className="flex h-9 flex-wrap items-center gap-1.5">
              {PALETTE.map((col) => (
                <button
                  key={col}
                  onClick={() => set({ color: col })}
                  aria-label={`Colour ${col}`}
                  aria-pressed={c.color === col}
                  className={cn("h-4 w-4 rounded-full border", c.color === col ? "border-ink" : "border-transparent")}
                  style={{ background: col }}
                />
              ))}
            </div>
          </Field>
        </div>
        {PROFILE_SECTIONS.map((sec) => (
          <section key={sec.title} className="mb-8">
            <h2 className="serif mb-3 border-b border-line pb-1 text-lg text-ink">{sec.title}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {sec.fields.map((f) => (
                <Field key={f.key} label={f.label} hint={f.hint}>
                  <BufferedInput multiline rows={3} value={String(c[f.key] ?? "")} onCommit={(v) => set({ [f.key]: v } as Partial<Character>)} />
                </Field>
              ))}
            </div>
          </section>
        ))}
        <section className="mb-8">
          <h2 className="serif mb-3 border-b border-line pb-1 text-lg text-ink">Custom fields</h2>
          <div className="space-y-2">
            {c.customFields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[160px_1fr_auto] items-start gap-2">
                <BufferedInput
                  value={f.label}
                  aria-label="Field label"
                  onCommit={(v) => set({ customFields: c.customFields.map((x, j) => (j === i ? { ...x, label: v } : x)) })}
                />
                <BufferedInput
                  value={f.value}
                  aria-label="Field value"
                  multiline
                  rows={1}
                  onCommit={(v) => set({ customFields: c.customFields.map((x, j) => (j === i ? { ...x, value: v } : x)) })}
                />
                <Button size="icon" variant="ghost" aria-label="Remove field" onClick={() => set({ customFields: c.customFields.filter((_, j) => j !== i) })}>
                  <X size={14} />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => set({ customFields: [...c.customFields, { id: newId(), label: "New field", value: "" }] })}>
              <Plus size={13} /> Add field
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatesView({
  c,
  states,
  chapters,
  projectId,
  StateChart,
}: {
  c: Character;
  states: CharacterState[];
  chapters: Chapter[];
  projectId: ID;
  StateChart: React.ComponentType<{ states: CharacterState[]; chapters: Chapter[] }>;
}) {
  const [chapterId, setChapterId] = useState(chapters[0]?.id ?? "");
  const idx = new Map(chapters.map((ch, i) => [ch.id, i]));
  const sorted = states.filter((s) => idx.has(s.chapterId)).sort((a, b) => idx.get(a.chapterId)! - idx.get(b.chapterId)!);
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Notice className="mb-6">
          State snapshots record how <em>you</em> imagine {c.name} at a point in the story. Variables are author-defined (e.g. “trust in Iris = 6”)
          — they are creative notes, not psychological measurements.
        </Notice>
        <div className="mb-6 flex flex-wrap items-end gap-2">
          <Field label="Add snapshot at chapter" className="min-w-[240px] flex-1">
            <Select value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
              {chapters.map((ch, i) => (
                <option key={ch.id} value={ch.id}>
                  {i + 1}. {ch.title}
                </option>
              ))}
            </Select>
          </Field>
          <Button
            variant="outline"
            disabled={!chapterId}
            onClick={() => {
              const prev = [...sorted].reverse().find((s) => idx.get(s.chapterId)! <= idx.get(chapterId)!);
              void addCharacterState(projectId, c.id, chapterId, {
                variables: (prev?.variables ?? []).map((v) => ({ ...v, id: newId() })),
              });
            }}
          >
            <Plus size={14} /> Add snapshot
          </Button>
        </div>
        {sorted.some((s) => s.variables.some((v) => v.value.trim() !== "" && !isNaN(Number(v.value)))) && (
          <div className="mb-8">
            <SectionTitle>Numeric variables across chapters (author-defined)</SectionTitle>
            <StateChart states={sorted} chapters={chapters} />
          </div>
        )}
        {sorted.length === 0 ? (
          <p className="text-sm text-muted">No snapshots yet.</p>
        ) : (
          <ol className="relative space-y-6 border-l border-line pl-6">
            {sorted.map((s) => (
              <li key={s.id} className="relative">
                <span className="absolute -left-[29px] top-1.5 h-2 w-2 rounded-full" style={{ background: c.color }} />
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="serif text-[15px]">
                    {idx.get(s.chapterId)! + 1}. {chapters[idx.get(s.chapterId)!]?.title}
                  </span>
                  <Button size="icon-sm" variant="ghost" aria-label="Delete snapshot" onClick={() => deleteCharacterState(s.id)}>
                    <Trash2 size={13} />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Summary">
                    <BufferedInput multiline rows={2} value={s.summary} onCommit={(v) => updateCharacterState(s.id, { summary: v })} />
                  </Field>
                  <Field label="Emotional state">
                    <BufferedInput multiline rows={2} value={s.emotionalState} onCommit={(v) => updateCharacterState(s.id, { emotionalState: v })} />
                  </Field>
                </div>
                <div className="mt-3 space-y-1.5">
                  {s.variables.map((v, i) => (
                    <div key={v.id} className="grid grid-cols-[1fr_120px_auto] gap-2">
                      <BufferedInput
                        value={v.name}
                        aria-label="Variable name"
                        placeholder="Variable"
                        onCommit={(val) => updateCharacterState(s.id, { variables: s.variables.map((x, j) => (j === i ? { ...x, name: val } : x)) })}
                      />
                      <BufferedInput
                        value={v.value}
                        aria-label="Variable value"
                        placeholder="Value"
                        onCommit={(val) => updateCharacterState(s.id, { variables: s.variables.map((x, j) => (j === i ? { ...x, value: val } : x)) })}
                      />
                      <Button size="icon" variant="ghost" aria-label="Remove variable" onClick={() => updateCharacterState(s.id, { variables: s.variables.filter((_, j) => j !== i) })}>
                        <X size={13} />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => updateCharacterState(s.id, { variables: [...s.variables, { id: newId(), name: "", value: "" }] })}>
                    <Plus size={12} /> Variable
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function CharacterSummary({
  c,
  relationships,
  characters,
  onEdge,
  onDelete,
}: {
  c: Character;
  relationships: CharacterRelationship[];
  characters: Character[];
  onEdge: (id: ID) => void;
  onDelete: () => void;
}) {
  const name = (id: ID) => characters.find((x) => x.id === id)?.name ?? "?";
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Dot color={c.color} />
          <h3 className="serif text-xl">{c.name}</h3>
        </div>
        <p className="text-xs uppercase tracking-wider text-muted">{c.role}</p>
      </div>
      {c.goals && (
        <div>
          <SectionTitle>Wants</SectionTitle>
          <p className="serif text-sm leading-relaxed">{c.goals}</p>
        </div>
      )}
      {c.secrets && (
        <div>
          <SectionTitle>Secret</SectionTitle>
          <p className="serif text-sm leading-relaxed">{c.secrets}</p>
        </div>
      )}
      <div>
        <SectionTitle>Relationships</SectionTitle>
        {relationships.length === 0 ? (
          <p className="text-xs text-muted">None yet — connect nodes on the graph.</p>
        ) : (
          <ul className="space-y-1">
            {relationships.map((r) => (
              <li key={r.id}>
                <button onClick={() => onEdge(r.id)} className="w-full rounded px-1.5 py-1 text-left text-sm hover:bg-surface">
                  {name(r.sourceId)} {r.direction === "mutual" ? "↔" : "→"} {name(r.targetId)}
                  <span className="block text-xs text-muted">{r.type}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button variant="danger" size="sm" onClick={onDelete}>
        <Trash2 size={13} /> Delete character…
      </Button>
    </div>
  );
}

function EdgeEditor({ rel, characters, onClose }: { rel: CharacterRelationship; characters: Character[]; onClose: () => void }) {
  const name = (id: ID) => characters.find((x) => x.id === id)?.name ?? "?";
  const set = (p: Partial<CharacterRelationship>) => updateRelationship(rel.id, p);
  return (
    <div className="space-y-4">
      <p className="serif text-base">
        {name(rel.sourceId)} {rel.direction === "mutual" ? "↔" : "→"} {name(rel.targetId)}
      </p>
      <Field label="Relationship type">
        <BufferedInput value={rel.type} onCommit={(v) => set({ type: v.trim() || "related" })} placeholder="e.g. rivals, mentor, 姐妹" />
      </Field>
      <Field label="Direction">
        <Select value={rel.direction} onChange={(e) => set({ direction: e.target.value as CharacterRelationship["direction"] })}>
          <option value="forward">
            One-way ({name(rel.sourceId)} → {name(rel.targetId)})
          </option>
          <option value="mutual">Mutual (↔)</option>
        </Select>
        {rel.direction === "forward" && (
          <Button size="sm" variant="ghost" className="mt-1" onClick={() => set({ sourceId: rel.targetId, targetId: rel.sourceId })}>
            Reverse direction
          </Button>
        )}
      </Field>
      <Field label="Description">
        <BufferedInput multiline rows={4} value={rel.description} onCommit={(v) => set({ description: v })} />
      </Field>
      <Field label={`Strength (author-defined)${rel.strength === null ? " — not set" : `: ${rel.strength}/10`}`}>
        <div className="flex items-center gap-2">
          <Input type="range" min={1} max={10} value={rel.strength ?? 5} onChange={(e) => set({ strength: Number(e.target.value) })} className="h-6 border-none px-0" aria-label="Strength" />
          {rel.strength !== null && (
            <Button size="sm" variant="ghost" onClick={() => set({ strength: null })}>
              Clear
            </Button>
          )}
        </div>
      </Field>
      <div className="flex gap-2 pt-2">
        <Button
          variant="danger"
          size="sm"
          onClick={async () => {
            await deleteRelationship(rel.id);
            onClose();
          }}
        >
          <Trash2 size={13} /> Delete relationship
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}
