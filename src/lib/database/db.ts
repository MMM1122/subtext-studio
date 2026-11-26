import Dexie, { type EntityTable } from "dexie";
import type {
  Chapter,
  Character,
  CharacterAction,
  CharacterRelationship,
  CharacterState,
  Foreshadowing,
  KnowledgeState,
  ManuscriptSnapshot,
  Note,
  Project,
  ReaderExperienceMetric,
  Scene,
  StoryEvent,
  StoryFact,
  UserSettings,
  WritingSession,
} from "@/types";

/** Bump when the IndexedDB schema changes; also written into backups. */
export const SCHEMA_VERSION = 1;
export const DB_NAME = "subtext-studio";

export class SubtextDB extends Dexie {
  projects!: EntityTable<Project, "id">;
  chapters!: EntityTable<Chapter, "id">;
  scenes!: EntityTable<Scene, "id">;
  characters!: EntityTable<Character, "id">;
  relationships!: EntityTable<CharacterRelationship, "id">;
  characterStates!: EntityTable<CharacterState, "id">;
  events!: EntityTable<StoryEvent, "id">;
  facts!: EntityTable<StoryFact, "id">;
  knowledge!: EntityTable<KnowledgeState, "id">;
  actions!: EntityTable<CharacterAction, "id">;
  foreshadowing!: EntityTable<Foreshadowing, "id">;
  metrics!: EntityTable<ReaderExperienceMetric, "id">;
  notes!: EntityTable<Note, "id">;
  snapshots!: EntityTable<ManuscriptSnapshot, "id">;
  sessions!: EntityTable<WritingSession, "id">;
  settings!: EntityTable<UserSettings, "id">;

  constructor(name = DB_NAME) {
    super(name);

    /*
     * Migration history. Never edit a released version's schema in place:
     * add a new `this.version(n)` block with `.stores()` deltas and an
     * optional `.upgrade(tx => ...)` data migration.
     */
    this.version(1).stores({
      projects: "id, updatedAt, archived",
      chapters: "id, projectId, [projectId+order], updatedAt",
      scenes: "id, projectId, chapterId, [chapterId+order], updatedAt",
      characters: "id, projectId, name",
      relationships: "id, projectId, sourceId, targetId",
      characterStates: "id, projectId, characterId, chapterId",
      events: "id, projectId, chapterId",
      facts: "id, projectId, [projectId+order]",
      knowledge: "id, projectId, factId, agentId, chapterId, [factId+agentId+chapterId]",
      actions: "id, projectId, characterId, chapterId, factId",
      foreshadowing: "id, projectId",
      metrics: "id, projectId, chapterId",
      notes: "id, projectId, pinned, updatedAt",
      snapshots: "id, projectId, docId, createdAt",
      sessions: "id, projectId, date, [projectId+date]",
      settings: "id",
    });
  }
}

let _db: SubtextDB | null = null;

/** Lazily construct the database (IndexedDB is only available in the browser). */
export function getDB(): SubtextDB {
  if (!_db) _db = new SubtextDB();
  return _db;
}

/** Test helper: swap the database instance (e.g. with a fresh fake-indexeddb DB). */
export function setDB(db: SubtextDB | null) {
  _db = db;
}

/** Tables that are scoped to a project (used for cascade delete & backups). */
export const PROJECT_TABLES = [
  "chapters",
  "scenes",
  "characters",
  "relationships",
  "characterStates",
  "events",
  "facts",
  "knowledge",
  "actions",
  "foreshadowing",
  "metrics",
  "notes",
  "snapshots",
  "sessions",
] as const;
export type ProjectTable = (typeof PROJECT_TABLES)[number];

/**
 * Typed partial update. Dexie's `UpdateSpec` key-path type recurses infinitely on
 * the nested rich-text document type, so updates are type-checked as `Partial<T>` here.
 */
export function patchRow<T>(table: unknown, id: string, changes: Partial<T>): Promise<number> {
  return (table as { update: (key: string, changes: unknown) => Promise<number> }).update(id, changes);
}
