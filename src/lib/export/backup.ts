import { getDB, PROJECT_TABLES, SCHEMA_VERSION } from "@/lib/database/db";
import { BACKUP_FORMAT, validateBackup, type ValidatedBackup } from "@/lib/validation/backup";
import {
  AUTHOR_AGENT,
  READER_AGENT,
  type Chapter,
  type Character,
  type CharacterAction,
  type CharacterRelationship,
  type CharacterState,
  type Foreshadowing,
  type ID,
  type KnowledgeState,
  type ManuscriptSnapshot,
  type Note,
  type Project,
  type ReaderExperienceMetric,
  type Scene,
  type StoryEvent,
  type StoryFact,
  type WritingSession,
} from "@/types";
import { newId, now } from "@/lib/utils/id";

export interface ProjectBackup {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  app: string;
  project: Project;
  chapters: Chapter[];
  scenes: Scene[];
  characters: Character[];
  relationships: CharacterRelationship[];
  characterStates: CharacterState[];
  events: StoryEvent[];
  facts: StoryFact[];
  knowledge: KnowledgeState[];
  actions: CharacterAction[];
  foreshadowing: Foreshadowing[];
  metrics: ReaderExperienceMetric[];
  notes: Note[];
  snapshots: ManuscriptSnapshot[];
  sessions: WritingSession[];
}

export async function exportProjectBackup(projectId: ID): Promise<ProjectBackup> {
  const db = getDB();
  const project = await db.projects.get(projectId);
  if (!project) throw new Error("Project not found.");
  const entries = await Promise.all(
    PROJECT_TABLES.map(async (t) => [t, await db.table(t).where("projectId").equals(projectId).toArray()] as const),
  );
  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: "Subtext Studio",
    project,
    ...(Object.fromEntries(entries) as Omit<ProjectBackup, "format" | "schemaVersion" | "exportedAt" | "app" | "project">),
  };
}

export interface ImportReport {
  projectId: ID;
  title: string;
  counts: Record<string, number>;
  dropped: number;
}

/**
 * Re-key every entity of a validated backup with fresh ids so that importing
 * never overwrites or collides with existing projects. References that point
 * outside the backup are cleared; records whose required parent is missing are dropped.
 */
export function remapBackup(data: ValidatedBackup, options: { titleSuffix?: string } = {}): { backup: ProjectBackup; dropped: number } {
  const map = new Map<ID, ID>();
  const fresh = (old: ID) => {
    const n = newId();
    map.set(old, n);
    return n;
  };
  const ref = (old: ID | null | undefined): ID | null => (old && map.has(old) ? map.get(old)! : null);
  const refs = (olds: ID[] | undefined) => (olds ?? []).map((o) => map.get(o)).filter((x): x is ID => !!x);
  const agent = (old: ID) => (old === READER_AGENT || old === AUTHOR_AGENT ? old : ref(old));
  let dropped = 0;
  const keep = <T,>(arr: (T | null)[]) => {
    const out = arr.filter((x): x is T => x !== null);
    dropped += arr.length - out.length;
    return out;
  };

  const t = now();
  const pid = fresh(data.project.id);
  // Assign ids to every entity first so cross references resolve regardless of order.
  const assign = <T extends { id: ID }>(arr: T[]) => arr.map((x) => ({ ...x, _new: fresh(x.id) }));
  const chapters = assign(data.chapters);
  const scenes = assign(data.scenes);
  const characters = assign(data.characters);
  const relationships = assign(data.relationships);
  const states = assign(data.characterStates);
  const events = assign(data.events);
  const facts = assign(data.facts);
  const knowledge = assign(data.knowledge);
  const actions = assign(data.actions);
  const fores = assign(data.foreshadowing);
  const metrics = assign(data.metrics);
  const notes = assign(data.notes);
  const snapshots = assign(data.snapshots);
  const sessions = assign(data.sessions);

  const strip = <T extends { _new: ID }>(x: T) => {
    const { _new, ...rest } = x;
    return { ...rest, id: _new, projectId: pid };
  };

  const project = {
    ...(data.project as unknown as Project),
    id: pid,
    title: data.project.title + (options.titleSuffix ?? ""),
    lastDocId: ref(data.project.lastDocId),
    isDemo: false,
    updatedAt: t,
  } as Project;

  const backup: ProjectBackup = {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date(t).toISOString(),
    app: "Subtext Studio",
    project,
    chapters: chapters.map((c) => strip(c) as unknown as Chapter),
    scenes: keep(
      scenes.map((s) => {
        const chapterId = ref(s.chapterId);
        return chapterId ? ({ ...strip(s), chapterId } as unknown as Scene) : null;
      }),
    ),
    characters: characters.map((c) => strip(c) as unknown as Character),
    relationships: keep(
      relationships.map((r) => {
        const sourceId = ref(r.sourceId);
        const targetId = ref(r.targetId);
        return sourceId && targetId ? ({ ...strip(r), sourceId, targetId } as unknown as CharacterRelationship) : null;
      }),
    ),
    characterStates: keep(
      states.map((s) => {
        const characterId = ref(s.characterId);
        const chapterId = ref(s.chapterId);
        return characterId && chapterId
          ? ({ ...strip(s), characterId, chapterId, sceneId: ref(s.sceneId) } as unknown as CharacterState)
          : null;
      }),
    ),
    events: events.map((e) => {
      const subjective: StoryEvent["subjective"] = {};
      for (const [k, v] of Object.entries(e.subjective ?? {})) {
        const nk = ref(k);
        if (nk) subjective[nk] = v;
      }
      return {
        ...strip(e),
        chapterId: ref(e.chapterId),
        sceneId: ref(e.sceneId),
        characterIds: refs(e.characterIds),
        causeIds: refs(e.causeIds),
        subjective,
      } as unknown as StoryEvent;
    }),
    facts: facts.map((f) => ({ ...strip(f), eventId: ref(f.eventId) }) as unknown as StoryFact),
    knowledge: keep(
      knowledge.map((k) => {
        const factId = ref(k.factId);
        const agentId = agent(k.agentId);
        const chapterId = ref(k.chapterId);
        return factId && agentId && chapterId
          ? ({ ...strip(k), factId, agentId, chapterId, sceneId: ref(k.sceneId) } as unknown as KnowledgeState)
          : null;
      }),
    ),
    actions: keep(
      actions.map((a) => {
        const characterId = ref(a.characterId);
        const chapterId = ref(a.chapterId);
        const factId = ref(a.factId);
        return characterId && chapterId && factId
          ? ({ ...strip(a), characterId, chapterId, factId } as unknown as CharacterAction)
          : null;
      }),
    ),
    foreshadowing: fores.map(
      (f) =>
        ({
          ...strip(f),
          introducedChapterId: ref(f.introducedChapterId),
          expectedPayoffChapterId: ref(f.expectedPayoffChapterId),
          actualPayoffChapterId: ref(f.actualPayoffChapterId),
          characterIds: refs(f.characterIds),
          eventIds: refs(f.eventIds),
        }) as unknown as Foreshadowing,
    ),
    metrics: keep(
      metrics.map((m) => {
        const chapterId = ref(m.chapterId);
        return chapterId ? ({ ...strip(m), chapterId, sceneId: ref(m.sceneId) } as unknown as ReaderExperienceMetric) : null;
      }),
    ),
    notes: notes.map((n) => {
      const convertedId = n.convertedTo ? ref(n.convertedTo.id) : null;
      return {
        ...strip(n),
        chapterIds: refs(n.chapterIds),
        convertedTo: n.convertedTo && convertedId ? { kind: n.convertedTo.kind, id: convertedId } : null,
      } as unknown as Note;
    }),
    snapshots: keep(
      snapshots.map((s) => {
        const docId = ref(s.docId);
        return docId ? ({ ...strip(s), docId } as unknown as ManuscriptSnapshot) : null;
      }),
    ),
    sessions: sessions.map((s) => strip(s) as unknown as WritingSession),
  };
  return { backup, dropped };
}

/** Insert a remapped backup as a brand-new project inside one transaction. */
export async function insertBackup(backup: ProjectBackup) {
  const db = getDB();
  const tables = [db.projects, ...PROJECT_TABLES.map((t) => db.table(t))];
  await db.transaction("rw", tables, async () => {
    await db.projects.add(backup.project);
    for (const t of PROJECT_TABLES) {
      const rows = backup[t] as unknown[];
      if (rows.length) await db.table(t).bulkAdd(rows);
    }
  });
}

/** Validate, re-key and insert a backup. Existing projects are never touched. */
export async function importProjectBackup(raw: unknown, options: { titleSuffix?: string } = {}): Promise<ImportReport> {
  const result = validateBackup(raw);
  if (!result.ok) throw new Error(result.error);
  const db = getDB();
  const clash = await db.projects.filter((p) => p.title === result.data.project.title).count();
  const suffix = options.titleSuffix ?? (clash > 0 ? " (restored)" : "");
  const { backup, dropped } = remapBackup(result.data, { titleSuffix: suffix });
  await insertBackup(backup);
  const counts: Record<string, number> = {};
  for (const t of PROJECT_TABLES) counts[t] = backup[t].length;
  return { projectId: backup.project.id, title: backup.project.title, counts, dropped };
}

export async function duplicateProject(projectId: ID): Promise<ImportReport> {
  const backup = await exportProjectBackup(projectId);
  return importProjectBackup(JSON.parse(JSON.stringify(backup)), { titleSuffix: " (copy)" });
}
