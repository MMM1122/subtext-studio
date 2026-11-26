import { getDB } from "@/lib/database/db";
import { METRIC_KEYS, type Foreshadowing, type ID, type MetricKey, type ReaderExperienceMetric } from "@/types";
import { newId, now } from "@/lib/utils/id";

export function emptyMetricValues(): Record<MetricKey, number | null> {
  return Object.fromEntries(METRIC_KEYS.map((k) => [k, null])) as Record<MetricKey, number | null>;
}

/** Set one author-estimated metric value for a chapter (creates the record if needed). */
export async function setMetric(projectId: ID, chapterId: ID, key: MetricKey, value: number | null) {
  const db = getDB();
  const existing = await db.metrics.where("chapterId").equals(chapterId).filter((m) => !m.sceneId).first();
  const t = now();
  if (existing) {
    await db.metrics.update(existing.id, { values: { ...existing.values, [key]: value }, updatedAt: t });
    return;
  }
  const m: ReaderExperienceMetric = {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId,
    chapterId,
    sceneId: null,
    values: { ...emptyMetricValues(), [key]: value },
    source: "author",
    note: "",
  };
  await db.metrics.add(m);
}

export async function setMetricNote(id: ID, note: string) {
  await getDB().metrics.update(id, { note, updatedAt: now() });
}

export async function addForeshadowing(projectId: ID, p: Partial<Foreshadowing> = {}) {
  const t = now();
  const f: Foreshadowing = {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId,
    description: "New foreshadowing",
    introducedChapterId: null,
    expectedPayoffChapterId: null,
    actualPayoffChapterId: null,
    status: "planned",
    characterIds: [],
    eventIds: [],
    ...p,
  };
  await getDB().foreshadowing.add(f);
  return f;
}

export async function updateForeshadowing(id: ID, patch: Partial<Foreshadowing>) {
  await getDB().foreshadowing.update(id, { ...patch, updatedAt: now() });
}

export async function deleteForeshadowing(id: ID) {
  await getDB().foreshadowing.delete(id);
}
