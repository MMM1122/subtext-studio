import type { ID, StoryEvent } from "@/types";

export type IssueSeverity = "error" | "warning" | "info";

export interface NarrativeIssue {
  severity: IssueSeverity;
  eventId: ID;
  relatedId?: ID;
  message: string;
}

/** Renumber items 0..n-1 in the given order and return id → order. */
export function renumber<T extends { id: ID }>(items: T[]): Map<ID, number> {
  const m = new Map<ID, number>();
  items.forEach((it, i) => m.set(it.id, i));
  return m;
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const copy = list.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export const byChrono = (a: StoryEvent, b: StoryEvent) => a.chronoOrder - b.chronoOrder || a.createdAt - b.createdAt;
export const byNarrative = (a: StoryEvent, b: StoryEvent) =>
  a.narrativeOrder - b.narrativeOrder || a.createdAt - b.createdAt;

/**
 * Basic causal dependency checks. Reports problems; never rewrites anything.
 */
export function checkCausality(events: StoryEvent[], chapterIndex?: Map<ID, number>): NarrativeIssue[] {
  const issues: NarrativeIssue[] = [];
  const byId = new Map(events.map((e) => [e.id, e]));
  const chronoRank = renumber([...events].sort(byChrono));

  for (const e of events) {
    for (const cid of e.causeIds) {
      const c = byId.get(cid);
      if (!c) {
        issues.push({ severity: "warning", eventId: e.id, message: `“${e.title}” references a cause that no longer exists.` });
        continue;
      }
      if (cid === e.id) {
        issues.push({ severity: "error", eventId: e.id, message: `“${e.title}” is listed as its own cause.` });
        continue;
      }
      if (chronoRank.get(c.id)! > chronoRank.get(e.id)!) {
        issues.push({
          severity: "error",
          eventId: e.id,
          relatedId: c.id,
          message: `Cause “${c.title}” happens after its effect “${e.title}” in chronological time.`,
        });
      }
      if (c.narrativeOrder > e.narrativeOrder) {
        issues.push({
          severity: "info",
          eventId: e.id,
          relatedId: c.id,
          message: `Effect “${e.title}” is shown to readers before its cause “${c.title}” (a reveal structure — fine if intended).`,
        });
      }
    }
  }

  // Cycle detection (DFS over cause edges).
  const state = new Map<ID, 0 | 1 | 2>();
  const reported = new Set<ID>();
  const visit = (id: ID, stack: ID[]) => {
    state.set(id, 1);
    const e = byId.get(id);
    for (const cid of e?.causeIds ?? []) {
      if (!byId.has(cid) || cid === id) continue;
      const s = state.get(cid) ?? 0;
      if (s === 1) {
        const cycle = [...stack.slice(stack.indexOf(cid)), id];
        const key = [...cycle].sort().join(",");
        if (!reported.has(key)) {
          reported.add(key);
          issues.push({
            severity: "error",
            eventId: id,
            relatedId: cid,
            message: `Circular causality: ${cycle.map((x) => `“${byId.get(x)?.title}”`).join(" → ")}.`,
          });
        }
      } else if (s === 0) visit(cid, [...stack, id]);
    }
    state.set(id, 2);
  };
  for (const e of events) if (!state.get(e.id)) visit(e.id, []);

  // Narrative order vs chapter assignment.
  if (chapterIndex) {
    const placed = events
      .filter((e) => e.chapterId && chapterIndex.has(e.chapterId))
      .sort(byNarrative);
    for (let i = 1; i < placed.length; i++) {
      const prev = placed[i - 1];
      const cur = placed[i];
      if (chapterIndex.get(cur.chapterId!)! < chapterIndex.get(prev.chapterId!)!) {
        issues.push({
          severity: "warning",
          eventId: cur.id,
          relatedId: prev.id,
          message: `“${cur.title}” comes after “${prev.title}” in narrative order but is assigned to an earlier chapter.`,
        });
      }
    }
  }
  return issues;
}

export type NarrativeMarker = "linear" | "flashback" | "flash-forward";

/**
 * Classify each event's presentation relative to chronology, computed purely
 * from the author's two orderings.
 */
export function narrativeMarkers(events: StoryEvent[]): Map<ID, NarrativeMarker> {
  const result = new Map<ID, NarrativeMarker>();
  const chronoRank = renumber([...events].sort(byChrono));
  const narrative = [...events].sort(byNarrative);
  let maxSeen = -1;
  narrative.forEach((e, i) => {
    const r = chronoRank.get(e.id)!;
    if (i === 0) {
      // The opening event establishes the narrative frame (e.g. in medias res).
      result.set(e.id, "linear");
      maxSeen = r;
    } else if (r < maxSeen) {
      result.set(e.id, "flashback");
    } else {
      const skipsAhead =
        r > maxSeen + 1 &&
        narrative.slice(i + 1).some((later) => {
          const lr = chronoRank.get(later.id)!;
          return lr > maxSeen && lr < r;
        });
      result.set(e.id, skipsAhead ? "flash-forward" : "linear");
      maxSeen = Math.max(maxSeen, r);
    }
  });
  return result;
}

/** Kendall-tau-like distance: fraction of event pairs presented out of chronological order. */
export function nonlinearity(events: StoryEvent[]): number {
  const n = events.length;
  if (n < 2) return 0;
  const chronoRank = renumber([...events].sort(byChrono));
  const seq = [...events].sort(byNarrative).map((e) => chronoRank.get(e.id)!);
  let inversions = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (seq[i] > seq[j]) inversions++;
  return inversions / ((n * (n - 1)) / 2);
}
