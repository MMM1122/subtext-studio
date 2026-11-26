import type { Chapter, Foreshadowing, ID } from "@/types";

export interface ForeshadowingIssue {
  id: ID;
  severity: "warning" | "info";
  message: string;
}

export function checkForeshadowing(items: Foreshadowing[], chapters: Chapter[]): ForeshadowingIssue[] {
  const idx = new Map(chapters.map((c, i) => [c.id, i]));
  const byId = new Map(chapters.map((c) => [c.id, c]));
  const out: ForeshadowingIssue[] = [];
  for (const f of items) {
    const intro = f.introducedChapterId ? idx.get(f.introducedChapterId) : undefined;
    const expected = f.expectedPayoffChapterId ? idx.get(f.expectedPayoffChapterId) : undefined;
    const actual = f.actualPayoffChapterId ? idx.get(f.actualPayoffChapterId) : undefined;
    const label = `“${f.description.slice(0, 40)}”`;
    if (intro !== undefined && expected !== undefined && expected < intro)
      out.push({ id: f.id, severity: "warning", message: `${label}: expected payoff comes before it is introduced.` });
    if (intro !== undefined && actual !== undefined && actual < intro)
      out.push({ id: f.id, severity: "warning", message: `${label}: actual payoff comes before it is introduced.` });
    if (f.status === "paid-off" && actual === undefined)
      out.push({ id: f.id, severity: "info", message: `${label}: marked paid off but no payoff chapter recorded.` });
    if (actual !== undefined && f.status !== "paid-off" && f.status !== "abandoned")
      out.push({ id: f.id, severity: "info", message: `${label}: payoff chapter recorded but status is “${f.status}”.` });
    if (
      expected !== undefined &&
      actual === undefined &&
      (f.status === "planted" || f.status === "reinforced") &&
      byId.get(f.expectedPayoffChapterId!)?.status === "complete"
    )
      out.push({
        id: f.id,
        severity: "warning",
        message: `${label}: expected payoff chapter is marked complete, but no payoff is recorded.`,
      });
  }
  return out;
}

export const METRIC_LABEL = {
  emotionalIntensity: "Emotional intensity",
  tension: "Narrative tension",
  suspense: "Suspense",
  uncertainty: "Uncertainty",
  informationDensity: "Information density",
  pacing: "Pacing",
} as const;
