/**
 * Core domain types for Subtext Studio.
 * Every persisted entity has a stable string id and created/updated timestamps (ms since epoch).
 */

export type ID = string;

export interface BaseEntity {
  id: ID;
  createdAt: number;
  updatedAt: number;
}

/** Minimal structural type for Tiptap / ProseMirror JSON documents. */
export interface RichDoc {
  type: string;
  attrs?: Record<string, unknown>;
  // readonly arrays keep Dexie's key-path types from recursing infinitely
  content?: readonly RichDoc[];
  marks?: readonly { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}

export interface Project extends BaseEntity {
  title: string;
  author: string;
  genre: string;
  synopsis: string;
  /** Optional cover image stored as a (small) data URL. */
  cover?: string | null;
  archived: boolean;
  /** Last edited document (chapter or scene) for "continue writing". */
  lastDocId?: ID | null;
  /** Total manuscript target in words (CJK characters count as words). */
  wordGoal?: number | null;
  /** Labels for parallel narrative tracks, e.g. "Present", "1998". */
  tracks?: string[];
  isDemo?: boolean;
}

export type ChapterStatus = "draft" | "revising" | "complete";

export interface Chapter extends BaseEntity {
  projectId: ID;
  title: string;
  order: number;
  status: ChapterStatus;
  doc: RichDoc;
  /** Cached plain text, used for search, counts and export. */
  text: string;
  wordCount: number;
  notes: string;
  wordGoal?: number | null;
}

export interface Scene extends BaseEntity {
  projectId: ID;
  chapterId: ID;
  title: string;
  order: number;
  summary: string;
  doc: RichDoc;
  text: string;
  wordCount: number;
}

export type CharacterRole = "protagonist" | "antagonist" | "deuteragonist" | "supporting" | "minor" | "other";

export interface CustomField {
  id: ID;
  label: string;
  value: string;
}

export interface Character extends BaseEntity {
  projectId: ID;
  name: string;
  role: CharacterRole;
  color: string;
  appearance: string;
  background: string;
  personality: string;
  goals: string;
  motivations: string;
  fears: string;
  values: string;
  internalConflicts: string;
  externalConflicts: string;
  memories: string;
  beliefs: string;
  secrets: string;
  arc: string;
  notes: string;
  customFields: CustomField[];
  position: { x: number; y: number };
}

export interface CharacterRelationship extends BaseEntity {
  projectId: ID;
  sourceId: ID;
  targetId: ID;
  type: string;
  /** "forward" = source → target, "mutual" = both directions. */
  direction: "forward" | "mutual";
  description: string;
  /** Optional author-defined strength 1–10. null = unspecified. */
  strength: number | null;
}

/** Author-defined variable inside a character state snapshot (no standardized scales). */
export interface StateVariable {
  id: ID;
  name: string;
  /** Numeric values are charted; text values are shown as-is. */
  value: string;
}

export interface CharacterState extends BaseEntity {
  projectId: ID;
  characterId: ID;
  chapterId: ID;
  sceneId?: ID | null;
  summary: string;
  emotionalState: string;
  variables: StateVariable[];
}

export interface StoryEvent extends BaseEntity {
  projectId: ID;
  title: string;
  description: string;
  /** Free-form story time, e.g. "Spring 1998" or "Day 3, night". */
  storyTime: string;
  chronoOrder: number;
  narrativeOrder: number;
  chapterId?: ID | null;
  sceneId?: ID | null;
  characterIds: ID[];
  location: string;
  /** Events that cause this event. */
  causeIds: ID[];
  consequences: string;
  tags: string[];
  /** Parallel timeline / narrative track label. */
  track: string;
  /** Author-defined subjective ordering per character (characterId → order). */
  subjective: Record<ID, { order: number; note: string }>;
}

export type FactCategory = "fact" | "secret" | "clue" | "event";

export interface StoryFact extends BaseEntity {
  projectId: ID;
  title: string;
  description: string;
  category: FactCategory;
  order: number;
  eventId?: ID | null;
}

export type KnowledgeLevel = "unknown" | "known" | "suspected" | "misunderstood";

/** Special agent ids alongside character ids. */
export const READER_AGENT = "__reader__";
export const AUTHOR_AGENT = "__author__";

/**
 * Historical knowledge record: from `chapterId` onward (until superseded),
 * `agentId` holds `level` regarding `factId`.
 */
export interface KnowledgeState extends BaseEntity {
  projectId: ID;
  factId: ID;
  agentId: ID;
  chapterId: ID;
  sceneId?: ID | null;
  level: KnowledgeLevel;
  reason: string;
}

/**
 * An explicitly recorded character action that presupposes a knowledge level.
 * Used for optional consistency warnings (no text analysis involved).
 */
export interface CharacterAction extends BaseEntity {
  projectId: ID;
  characterId: ID;
  chapterId: ID;
  factId: ID;
  description: string;
  requires: "known" | "unknown" | "aware";
}

export type ForeshadowingStatus = "planned" | "planted" | "reinforced" | "paid-off" | "abandoned";

export interface Foreshadowing extends BaseEntity {
  projectId: ID;
  description: string;
  introducedChapterId?: ID | null;
  expectedPayoffChapterId?: ID | null;
  actualPayoffChapterId?: ID | null;
  status: ForeshadowingStatus;
  characterIds: ID[];
  eventIds: ID[];
}

export const METRIC_KEYS = [
  "emotionalIntensity",
  "tension",
  "suspense",
  "uncertainty",
  "informationDensity",
  "pacing",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export interface ReaderExperienceMetric extends BaseEntity {
  projectId: ID;
  chapterId: ID;
  sceneId?: ID | null;
  /** Values 0–10, or null when not estimated. */
  values: Record<MetricKey, number | null>;
  /** Provenance: always author-estimated in this version. */
  source: "author" | "ai";
  note: string;
}

export type NoteKind = "idea" | "dialogue" | "research" | "question" | "visual" | "plot";

export interface Note extends BaseEntity {
  projectId: ID;
  title: string;
  body: string;
  kind: NoteKind;
  tags: string[];
  pinned: boolean;
  chapterIds: ID[];
  /** Optional URL for a visual or research reference. */
  reference: string;
  convertedTo?: { kind: "character" | "event" | "scene"; id: ID } | null;
}

export interface ManuscriptSnapshot extends BaseEntity {
  projectId: ID;
  docKind: "chapter" | "scene";
  docId: ID;
  label: string;
  doc: RichDoc;
  text: string;
  wordCount: number;
  automatic: boolean;
}

export interface WritingSession extends BaseEntity {
  projectId: ID;
  /** Local date key YYYY-MM-DD. */
  date: string;
  wordsAdded: number;
  wordsRemoved: number;
}

export type ThemeMode = "light" | "dark" | "system";

export interface UserSettings {
  id: "settings";
  theme: ThemeMode;
  editorFontSize: number;
  editorLineHeight: number;
  editorWidth: number;
  dailyWordGoal: number;
  /** Explicit consent to send manuscript excerpts to the configured AI provider. */
  aiConsent: boolean;
  demoSeeded: boolean;
  updatedAt: number;
}

export type DocRef = { kind: "chapter" | "scene"; id: ID };
