import { getDB } from "@/lib/database/db";
import type { ID, StoryEvent } from "@/types";
import { now } from "@/lib/utils/id";
import { makeEvent } from "./factories";
import { touchProject } from "./projects";

export async function addEvent(projectId: ID, p: Partial<StoryEvent> = {}): Promise<StoryEvent> {
  const db = getDB();
  const all = await db.events.where("projectId").equals(projectId).toArray();
  const maxC = all.reduce((m, e) => Math.max(m, e.chronoOrder), -1);
  const maxN = all.reduce((m, e) => Math.max(m, e.narrativeOrder), -1);
  const ev = makeEvent(projectId, maxC + 1, maxN + 1, p);
  await db.events.add(ev);
  await touchProject(projectId);
  return ev;
}

export async function updateEvent(id: ID, patch: Partial<StoryEvent>) {
  await getDB().events.update(id, { ...patch, updatedAt: now() });
}

/** Reorder ONLY the chronological axis. Narrative order is untouched. */
export async function reorderChronological(orderedIds: ID[]) {
  const db = getDB();
  await db.transaction("rw", db.events, async () => {
    await Promise.all(orderedIds.map((id, i) => db.events.update(id, { chronoOrder: i })));
  });
}

/** Reorder ONLY the narrative (presentation) axis. Chronology is untouched. */
export async function reorderNarrative(orderedIds: ID[]) {
  const db = getDB();
  await db.transaction("rw", db.events, async () => {
    await Promise.all(orderedIds.map((id, i) => db.events.update(id, { narrativeOrder: i })));
  });
}

/** Reorder a character's subjective timeline. */
export async function reorderSubjective(characterId: ID, orderedIds: ID[]) {
  const db = getDB();
  await db.transaction("rw", db.events, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.events.where("id").equals(orderedIds[i]).modify((e) => {
        e.subjective = { ...(e.subjective ?? {}) };
        e.subjective[characterId] = { order: i, note: e.subjective[characterId]?.note ?? "" };
      });
    }
  });
}

export async function deleteEvent(id: ID) {
  const db = getDB();
  const ev = await db.events.get(id);
  if (!ev) return;
  await db.transaction("rw", [db.events, db.facts, db.foreshadowing], async () => {
    await db.events.where("projectId").equals(ev.projectId).modify((e) => {
      e.causeIds = e.causeIds.filter((c) => c !== id);
    });
    await db.facts.where("projectId").equals(ev.projectId).modify((f) => {
      if (f.eventId === id) f.eventId = null;
    });
    await db.foreshadowing.where("projectId").equals(ev.projectId).modify((f) => {
      f.eventIds = f.eventIds.filter((x) => x !== id);
    });
    await db.events.delete(id);
    const rest = await db.events.where("projectId").equals(ev.projectId).toArray();
    const chrono = [...rest].sort((a, b) => a.chronoOrder - b.chronoOrder);
    const narr = [...rest].sort((a, b) => a.narrativeOrder - b.narrativeOrder);
    await Promise.all(chrono.map((e, i) => db.events.update(e.id, { chronoOrder: i })));
    await Promise.all(narr.map((e, i) => db.events.update(e.id, { narrativeOrder: i })));
  });
  await touchProject(ev.projectId);
}
