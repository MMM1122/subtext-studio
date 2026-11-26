import type {
  Chapter,
  Character,
  CharacterRole,
  ID,
  Note,
  Project,
  Scene,
  StoryEvent,
  StoryFact,
  UserSettings,
} from "@/types";
import { EMPTY_DOC } from "@/lib/utils/rich";
import { newId, now } from "@/lib/utils/id";

export const ROLE_COLORS: Record<CharacterRole, string> = {
  protagonist: "var(--c-sage)",
  deuteragonist: "var(--c-teal)",
  antagonist: "var(--c-clay)",
  supporting: "var(--c-slate)",
  minor: "var(--c-stone)",
  other: "var(--c-plum)",
};

export const PALETTE = [
  "var(--c-sage)",
  "var(--c-clay)",
  "var(--c-slate)",
  "var(--c-sand)",
  "var(--c-plum)",
  "var(--c-moss)",
  "var(--c-teal)",
  "var(--c-stone)",
];

export function makeProject(p: Partial<Project> = {}): Project {
  const t = now();
  return {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    title: "Untitled Novel",
    author: "",
    genre: "",
    synopsis: "",
    cover: null,
    archived: false,
    lastDocId: null,
    wordGoal: null,
    tracks: ["Main"],
    ...p,
  };
}

export function makeChapter(projectId: ID, order: number, p: Partial<Chapter> = {}): Chapter {
  const t = now();
  return {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId,
    title: `Chapter ${order + 1}`,
    order,
    status: "draft",
    doc: EMPTY_DOC,
    text: "",
    wordCount: 0,
    notes: "",
    wordGoal: null,
    ...p,
  };
}

export function makeScene(projectId: ID, chapterId: ID, order: number, p: Partial<Scene> = {}): Scene {
  const t = now();
  return {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId,
    chapterId,
    title: `Scene ${order + 1}`,
    order,
    summary: "",
    doc: EMPTY_DOC,
    text: "",
    wordCount: 0,
    ...p,
  };
}

export function makeCharacter(projectId: ID, p: Partial<Character> = {}): Character {
  const t = now();
  const role = p.role ?? "supporting";
  return {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId,
    name: "New character",
    role,
    color: ROLE_COLORS[role],
    appearance: "",
    background: "",
    personality: "",
    goals: "",
    motivations: "",
    fears: "",
    values: "",
    internalConflicts: "",
    externalConflicts: "",
    memories: "",
    beliefs: "",
    secrets: "",
    arc: "",
    notes: "",
    customFields: [],
    position: { x: 80 + Math.random() * 360, y: 60 + Math.random() * 260 },
    ...p,
  };
}

export function makeEvent(projectId: ID, chronoOrder: number, narrativeOrder: number, p: Partial<StoryEvent> = {}): StoryEvent {
  const t = now();
  return {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId,
    title: "New event",
    description: "",
    storyTime: "",
    chronoOrder,
    narrativeOrder,
    chapterId: null,
    sceneId: null,
    characterIds: [],
    location: "",
    causeIds: [],
    consequences: "",
    tags: [],
    track: "Main",
    subjective: {},
    ...p,
  };
}

export function makeFact(projectId: ID, order: number, p: Partial<StoryFact> = {}): StoryFact {
  const t = now();
  return {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId,
    title: "New fact",
    description: "",
    category: "fact",
    order,
    eventId: null,
    ...p,
  };
}

export function makeNote(projectId: ID, p: Partial<Note> = {}): Note {
  const t = now();
  return {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId,
    title: "",
    body: "",
    kind: "idea",
    tags: [],
    pinned: false,
    chapterIds: [],
    reference: "",
    convertedTo: null,
    ...p,
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  id: "settings",
  theme: "system",
  editorFontSize: 19,
  editorLineHeight: 1.9,
  editorWidth: 720,
  dailyWordGoal: 1000,
  aiConsent: false,
  demoSeeded: false,
  updatedAt: 0,
};
