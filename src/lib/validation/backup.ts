import { z } from "zod";
import { SCHEMA_VERSION } from "@/lib/database/db";

export const BACKUP_FORMAT = "subtext-studio/project";

const str = z.string();
const id = z.string().min(1);
const ts = z.number().finite();
const nullableId = id.nullable().optional();

const base = { id, createdAt: ts, updatedAt: ts };
const richDoc = z.looseObject({ type: z.string() });

export const projectSchema = z.looseObject({
  ...base,
  title: str,
  author: str.default(""),
  genre: str.default(""),
  synopsis: str.default(""),
  cover: str.nullable().optional(),
  archived: z.boolean().default(false),
  lastDocId: nullableId,
  wordGoal: z.number().nullable().optional(),
  tracks: z.array(str).optional(),
});

const chapterSchema = z.looseObject({
  ...base,
  projectId: id,
  title: str,
  order: z.number(),
  status: z.enum(["draft", "revising", "complete"]).default("draft"),
  doc: richDoc,
  text: str.default(""),
  wordCount: z.number().default(0),
  notes: str.default(""),
});

const sceneSchema = z.looseObject({
  ...base,
  projectId: id,
  chapterId: id,
  title: str,
  order: z.number(),
  summary: str.default(""),
  doc: richDoc,
  text: str.default(""),
  wordCount: z.number().default(0),
});

const characterSchema = z.looseObject({
  ...base,
  projectId: id,
  name: str,
  role: str.default("supporting"),
  customFields: z.array(z.looseObject({ id, label: str, value: str })).default([]),
  position: z.object({ x: z.number(), y: z.number() }).default({ x: 100, y: 100 }),
});

const relationshipSchema = z.looseObject({
  ...base,
  projectId: id,
  sourceId: id,
  targetId: id,
  type: str.default("related"),
  direction: z.enum(["forward", "mutual"]).default("forward"),
  description: str.default(""),
  strength: z.number().min(1).max(10).nullable().default(null),
});

const characterStateSchema = z.looseObject({
  ...base,
  projectId: id,
  characterId: id,
  chapterId: id,
  sceneId: nullableId,
  summary: str.default(""),
  emotionalState: str.default(""),
  variables: z.array(z.looseObject({ id, name: str, value: str })).default([]),
});

const eventSchema = z.looseObject({
  ...base,
  projectId: id,
  title: str,
  description: str.default(""),
  storyTime: str.default(""),
  chronoOrder: z.number(),
  narrativeOrder: z.number(),
  chapterId: nullableId,
  sceneId: nullableId,
  characterIds: z.array(id).default([]),
  location: str.default(""),
  causeIds: z.array(id).default([]),
  consequences: str.default(""),
  tags: z.array(str).default([]),
  track: str.default("Main"),
  subjective: z.record(str, z.object({ order: z.number(), note: str.default("") })).default({}),
});

const factSchema = z.looseObject({
  ...base,
  projectId: id,
  title: str,
  description: str.default(""),
  category: z.enum(["fact", "secret", "clue", "event"]).default("fact"),
  order: z.number(),
  eventId: nullableId,
});

const knowledgeSchema = z.looseObject({
  ...base,
  projectId: id,
  factId: id,
  agentId: id,
  chapterId: id,
  sceneId: nullableId,
  level: z.enum(["unknown", "known", "suspected", "misunderstood"]),
  reason: str.default(""),
});

const actionSchema = z.looseObject({
  ...base,
  projectId: id,
  characterId: id,
  chapterId: id,
  factId: id,
  description: str.default(""),
  requires: z.enum(["known", "unknown", "aware"]).default("known"),
});

const foreshadowingSchema = z.looseObject({
  ...base,
  projectId: id,
  description: str,
  introducedChapterId: nullableId,
  expectedPayoffChapterId: nullableId,
  actualPayoffChapterId: nullableId,
  status: z.enum(["planned", "planted", "reinforced", "paid-off", "abandoned"]).default("planned"),
  characterIds: z.array(id).default([]),
  eventIds: z.array(id).default([]),
});

const metricSchema = z.looseObject({
  ...base,
  projectId: id,
  chapterId: id,
  sceneId: nullableId,
  values: z.record(str, z.number().min(0).max(10).nullable()),
  source: z.enum(["author", "ai"]).default("author"),
  note: str.default(""),
});

const noteSchema = z.looseObject({
  ...base,
  projectId: id,
  title: str.default(""),
  body: str.default(""),
  kind: z.enum(["idea", "dialogue", "research", "question", "visual", "plot"]).default("idea"),
  tags: z.array(str).default([]),
  pinned: z.boolean().default(false),
  chapterIds: z.array(id).default([]),
  reference: str.default(""),
  convertedTo: z.object({ kind: z.enum(["character", "event", "scene"]), id }).nullable().optional(),
});

const snapshotSchema = z.looseObject({
  ...base,
  projectId: id,
  docKind: z.enum(["chapter", "scene"]),
  docId: id,
  label: str.default(""),
  doc: richDoc,
  text: str.default(""),
  wordCount: z.number().default(0),
  automatic: z.boolean().default(false),
});

const sessionSchema = z.looseObject({
  ...base,
  projectId: id,
  date: str,
  wordsAdded: z.number().default(0),
  wordsRemoved: z.number().default(0),
});

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.number().int().min(1),
  exportedAt: str,
  app: str.optional(),
  project: projectSchema,
  chapters: z.array(chapterSchema).default([]),
  scenes: z.array(sceneSchema).default([]),
  characters: z.array(characterSchema).default([]),
  relationships: z.array(relationshipSchema).default([]),
  characterStates: z.array(characterStateSchema).default([]),
  events: z.array(eventSchema).default([]),
  facts: z.array(factSchema).default([]),
  knowledge: z.array(knowledgeSchema).default([]),
  actions: z.array(actionSchema).default([]),
  foreshadowing: z.array(foreshadowingSchema).default([]),
  metrics: z.array(metricSchema).default([]),
  notes: z.array(noteSchema).default([]),
  snapshots: z.array(snapshotSchema).default([]),
  sessions: z.array(sessionSchema).default([]),
});

export type ValidatedBackup = z.infer<typeof backupSchema>;

/**
 * Upgrade older backup payloads to the current schema version.
 * Add a `case` for each future schema bump.
 */
export function migrateBackup(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") throw new Error("Backup file is not a JSON object.");
  const data = { ...(raw as Record<string, unknown>) };
  const version = typeof data.schemaVersion === "number" ? data.schemaVersion : NaN;
  if (!Number.isFinite(version)) throw new Error("Backup is missing a schemaVersion.");
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `This backup was created by a newer version of Subtext Studio (schema ${version}). Please update the app before importing.`,
    );
  }
  // switch (version) { case 1: /* migrate 1 → 2 */ data.schemaVersion = 2; }
  return data;
}

export function validateBackup(raw: unknown): { ok: true; data: ValidatedBackup } | { ok: false; error: string } {
  try {
    const migrated = migrateBackup(raw);
    const parsed = backupSchema.safeParse(migrated);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return {
        ok: false,
        error: `Invalid backup: ${first?.path.join(".") || "root"} — ${first?.message ?? "unknown error"}`,
      };
    }
    return { ok: true, data: parsed.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
