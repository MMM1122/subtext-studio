import { getDB } from "@/lib/database/db";
import type { CharacterAction, ID, KnowledgeLevel, KnowledgeState, StoryFact } from "@/types";
import { newId, now } from "@/lib/utils/id";
import { makeFact } from "./factories";
import { touchProject } from "./projects";

export async function addFact(projectId: ID, p: Partial<StoryFact> = {}): Promise<StoryFact> {
  const db = getDB();
  const count = await db.facts.where("projectId").equals(projectId).count();
  const f = makeFact(projectId, count, p);
  await db.facts.add(f);
  await touchProject(projectId);
  return f;
}

export async function updateFact(id: ID, patch: Partial<StoryFact>) {
  await getDB().facts.update(id, { ...patch, updatedAt: now() });
}

export async function reorderFacts(orderedIds: ID[]) {
  const db = getDB();
  await db.transaction("rw", db.facts, async () => {
    await Promise.all(orderedIds.map((id, i) => db.facts.update(id, { order: i })));
  });
}

export async function deleteFact(id: ID) {
  const db = getDB();
  await db.transaction("rw", [db.facts, db.knowledge, db.actions], async () => {
    await db.knowledge.where("factId").equals(id).delete();
    await db.actions.where("factId").equals(id).delete();
    await db.facts.delete(id);
  });
}

/**
 * Set an agent's knowledge level for a fact AT a specific chapter.
 * Creates or updates only the record anchored to that chapter; records for
 * other chapters (earlier or later) are never modified.
 */
export async function setKnowledge(
  projectId: ID,
  factId: ID,
  agentId: ID,
  chapterId: ID,
  level: KnowledgeLevel,
  reason?: string,
): Promise<KnowledgeState> {
  const db = getDB();
  const existing = await db.knowledge.where("[factId+agentId+chapterId]").equals([factId, agentId, chapterId]).first();
  const t = now();
  if (existing) {
    const patch: Partial<KnowledgeState> = { level, updatedAt: t };
    if (reason !== undefined) patch.reason = reason;
    await db.knowledge.update(existing.id, patch);
    return { ...existing, ...patch };
  }
  const rec: KnowledgeState = {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId,
    factId,
    agentId,
    chapterId,
    sceneId: null,
    level,
    reason: reason ?? "",
  };
  await db.knowledge.add(rec);
  return rec;
}

export async function updateKnowledgeRecord(id: ID, patch: Partial<KnowledgeState>) {
  await getDB().knowledge.update(id, { ...patch, updatedAt: now() });
}

/** Remove the record at a chapter so the state is inherited from earlier chapters again. */
export async function deleteKnowledgeRecord(id: ID) {
  await getDB().knowledge.delete(id);
}

export async function addAction(projectId: ID, p: Omit<Partial<CharacterAction>, "projectId"> & { characterId: ID; chapterId: ID; factId: ID }) {
  const t = now();
  const a: CharacterAction = {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId,
    description: "",
    requires: "known",
    ...p,
  };
  await getDB().actions.add(a);
  return a;
}

export async function updateAction(id: ID, patch: Partial<CharacterAction>) {
  await getDB().actions.update(id, { ...patch, updatedAt: now() });
}

export async function deleteAction(id: ID) {
  await getDB().actions.delete(id);
}
