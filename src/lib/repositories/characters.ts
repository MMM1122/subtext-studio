import { getDB } from "@/lib/database/db";
import type { Character, CharacterRelationship, CharacterState, ID } from "@/types";
import { newId, now } from "@/lib/utils/id";
import { makeCharacter } from "./factories";
import { touchProject } from "./projects";

export async function addCharacter(projectId: ID, p: Partial<Character> = {}): Promise<Character> {
  const c = makeCharacter(projectId, p);
  await getDB().characters.add(c);
  await touchProject(projectId);
  return c;
}

export async function updateCharacter(id: ID, patch: Partial<Character>) {
  await getDB().characters.update(id, { ...patch, updatedAt: now() });
}

export async function characterDependencies(id: ID) {
  const db = getDB();
  const [relationships, states, knowledge, actions] = await Promise.all([
    db.relationships.where("sourceId").equals(id).count().then(async (a) => a + (await db.relationships.where("targetId").equals(id).count())),
    db.characterStates.where("characterId").equals(id).count(),
    db.knowledge.where("agentId").equals(id).count(),
    db.actions.where("characterId").equals(id).count(),
  ]);
  return { relationships, states, knowledge, actions };
}

/** Delete a character, its relationships, states and knowledge records; unlink it elsewhere. */
export async function deleteCharacter(id: ID) {
  const db = getDB();
  const c = await db.characters.get(id);
  if (!c) return;
  await db.transaction(
    "rw",
    [db.characters, db.relationships, db.characterStates, db.knowledge, db.actions, db.events, db.foreshadowing],
    async () => {
      await db.relationships.where("sourceId").equals(id).delete();
      await db.relationships.where("targetId").equals(id).delete();
      await db.characterStates.where("characterId").equals(id).delete();
      await db.knowledge.where("agentId").equals(id).delete();
      await db.actions.where("characterId").equals(id).delete();
      await db.events.where("projectId").equals(c.projectId).modify((e) => {
        e.characterIds = e.characterIds.filter((x) => x !== id);
        if (e.subjective?.[id]) delete e.subjective[id];
      });
      await db.foreshadowing.where("projectId").equals(c.projectId).modify((f) => {
        f.characterIds = f.characterIds.filter((x) => x !== id);
      });
      await db.characters.delete(id);
    },
  );
  await touchProject(c.projectId);
}

export async function addRelationship(projectId: ID, sourceId: ID, targetId: ID, p: Partial<CharacterRelationship> = {}) {
  const t = now();
  const rel: CharacterRelationship = {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId,
    sourceId,
    targetId,
    type: "related",
    direction: "forward",
    description: "",
    strength: null,
    ...p,
  };
  await getDB().relationships.add(rel);
  return rel;
}

export async function updateRelationship(id: ID, patch: Partial<CharacterRelationship>) {
  await getDB().relationships.update(id, { ...patch, updatedAt: now() });
}

export async function deleteRelationship(id: ID) {
  await getDB().relationships.delete(id);
}

export async function addCharacterState(projectId: ID, characterId: ID, chapterId: ID, p: Partial<CharacterState> = {}) {
  const t = now();
  const s: CharacterState = {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId,
    characterId,
    chapterId,
    sceneId: null,
    summary: "",
    emotionalState: "",
    variables: [],
    ...p,
  };
  await getDB().characterStates.add(s);
  return s;
}

export async function updateCharacterState(id: ID, patch: Partial<CharacterState>) {
  await getDB().characterStates.update(id, { ...patch, updatedAt: now() });
}

export async function deleteCharacterState(id: ID) {
  await getDB().characterStates.delete(id);
}
