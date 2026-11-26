import {
  AUTHOR_AGENT,
  READER_AGENT,
  type CharacterAction,
  type ID,
  type KnowledgeLevel,
  type KnowledgeState,
  type StoryFact,
} from "@/types";

export const LEVELS: KnowledgeLevel[] = ["unknown", "known", "suspected", "misunderstood"];

export const LEVEL_LABEL: Record<KnowledgeLevel, string> = {
  unknown: "Unknown",
  known: "Known",
  suspected: "Suspected",
  misunderstood: "Misunderstood",
};

export const LEVEL_LABEL_ZH: Record<KnowledgeLevel, string> = {
  unknown: "未知",
  known: "已知",
  suspected: "怀疑",
  misunderstood: "错误认知",
};

export function nextLevel(level: KnowledgeLevel): KnowledgeLevel {
  return LEVELS[(LEVELS.indexOf(level) + 1) % LEVELS.length];
}

export interface ResolvedCell {
  level: KnowledgeLevel;
  /** The record that determines the level, if any. */
  record: KnowledgeState | null;
  /** True when the record was set in an earlier chapter (carried forward). */
  inherited: boolean;
}

export const cellKey = (factId: ID, agentId: ID) => `${factId}|${agentId}`;

/**
 * Index knowledge records per (fact, agent), sorted by chapter position then time.
 * Records attached to chapters that no longer exist are ignored.
 */
export function indexKnowledge(records: KnowledgeState[], chapterIndex: Map<ID, number>) {
  const map = new Map<string, KnowledgeState[]>();
  for (const r of records) {
    if (!chapterIndex.has(r.chapterId)) continue;
    const k = cellKey(r.factId, r.agentId);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => chapterIndex.get(a.chapterId)! - chapterIndex.get(b.chapterId)! || a.updatedAt - b.updatedAt);
  }
  return map;
}

/** Effective knowledge level for (fact, agent) as of chapter position `atIndex`. */
export function resolveCell(
  index: Map<string, KnowledgeState[]>,
  chapterIndex: Map<ID, number>,
  factId: ID,
  agentId: ID,
  atIndex: number,
): ResolvedCell {
  const list = index.get(cellKey(factId, agentId));
  if (!list) return { level: "unknown", record: null, inherited: false };
  let found: KnowledgeState | null = null;
  for (const r of list) {
    const idx = chapterIndex.get(r.chapterId)!;
    if (idx <= atIndex) found = r;
    else break;
  }
  if (!found) return { level: "unknown", record: null, inherited: false };
  return { level: found.level, record: found, inherited: chapterIndex.get(found.chapterId)! < atIndex };
}

/** Full history of a cell across chapters (for the inspector timeline). */
export function cellHistory(index: Map<string, KnowledgeState[]>, factId: ID, agentId: ID): KnowledgeState[] {
  return index.get(cellKey(factId, agentId)) ?? [];
}

export type DiscrepancyKind = "dramatic-irony" | "reader-in-dark" | "misbelief" | "author-gap";

export interface Discrepancy {
  kind: DiscrepancyKind;
  factId: ID;
  agentId: ID;
  detail: string;
}

export const DISCREPANCY_LABEL: Record<DiscrepancyKind, string> = {
  "dramatic-irony": "Dramatic irony — reader knows, character does not",
  "reader-in-dark": "Reader in the dark — character knows, reader does not",
  misbelief: "Misbelief — agent holds a mistaken understanding",
  "author-gap": "Author column not marked Known",
};

/** Compare character knowledge with reader knowledge at a given chapter position. */
export function findDiscrepancies(
  facts: StoryFact[],
  characterIds: ID[],
  index: Map<string, KnowledgeState[]>,
  chapterIndex: Map<ID, number>,
  atIndex: number,
  names: Record<ID, string> = {},
): Discrepancy[] {
  const out: Discrepancy[] = [];
  for (const f of facts) {
    const reader = resolveCell(index, chapterIndex, f.id, READER_AGENT, atIndex).level;
    for (const cId of characterIds) {
      const c = resolveCell(index, chapterIndex, f.id, cId, atIndex).level;
      const who = names[cId] ?? "Character";
      if (reader === "known" && c !== "known") {
        out.push({ kind: "dramatic-irony", factId: f.id, agentId: cId, detail: `Reader knows “${f.title}”; ${who} is ${c}.` });
      } else if (c === "known" && reader !== "known") {
        out.push({ kind: "reader-in-dark", factId: f.id, agentId: cId, detail: `${who} knows “${f.title}”; reader is ${reader}.` });
      }
      if (c === "misunderstood") {
        out.push({ kind: "misbelief", factId: f.id, agentId: cId, detail: `${who} misunderstands “${f.title}”.` });
      }
    }
    if (reader === "misunderstood") {
      out.push({ kind: "misbelief", factId: f.id, agentId: READER_AGENT, detail: `Reader is led to misunderstand “${f.title}”.` });
    }
  }
  return out;
}

export interface ActionWarning {
  action: CharacterAction;
  level: KnowledgeLevel;
  message: string;
}

const REQUIRES_OK: Record<CharacterAction["requires"], KnowledgeLevel[]> = {
  known: ["known"],
  aware: ["known", "suspected"],
  unknown: ["unknown", "misunderstood"],
};

export const REQUIRES_LABEL: Record<CharacterAction["requires"], string> = {
  known: "requires knowing",
  aware: "requires at least suspecting",
  unknown: "requires NOT knowing",
};

/** Checks explicitly recorded actions against explicitly recorded knowledge states. */
export function checkActions(
  actions: CharacterAction[],
  index: Map<string, KnowledgeState[]>,
  chapterIndex: Map<ID, number>,
): ActionWarning[] {
  const out: ActionWarning[] = [];
  for (const a of actions) {
    const at = chapterIndex.get(a.chapterId);
    if (at === undefined) continue;
    const { level } = resolveCell(index, chapterIndex, a.factId, a.characterId, at);
    if (!REQUIRES_OK[a.requires].includes(level)) {
      out.push({
        action: a,
        level,
        message: `Action ${REQUIRES_LABEL[a.requires]} the fact, but the recorded state at this chapter is “${LEVEL_LABEL[level]}”.`,
      });
    }
  }
  return out;
}

export function isSpecialAgent(id: ID) {
  return id === READER_AGENT || id === AUTHOR_AGENT;
}
