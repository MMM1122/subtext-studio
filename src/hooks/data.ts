"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { getDB } from "@/lib/database/db";
import { DEFAULT_SETTINGS } from "@/lib/repositories/factories";
import type { ID } from "@/types";

/** Reactive reads from IndexedDB. `undefined` means "still loading". */

export function useSettings() {
  return useLiveQuery(async () => ({ ...DEFAULT_SETTINGS, ...((await getDB().settings.get("settings")) ?? {}) }), [], undefined);
}

export function useProject(projectId: ID) {
  return useLiveQuery(async () => (await getDB().projects.get(projectId)) ?? null, [projectId]);
}

export function useChapters(projectId: ID) {
  return useLiveQuery(() => getDB().chapters.where("projectId").equals(projectId).sortBy("order"), [projectId]);
}

export function useScenes(projectId: ID) {
  return useLiveQuery(() => getDB().scenes.where("projectId").equals(projectId).sortBy("order"), [projectId]);
}

export function useCharacters(projectId: ID) {
  return useLiveQuery(() => getDB().characters.where("projectId").equals(projectId).sortBy("createdAt"), [projectId]);
}

export function useRelationships(projectId: ID) {
  return useLiveQuery(() => getDB().relationships.where("projectId").equals(projectId).toArray(), [projectId]);
}

export function useCharacterStates(projectId: ID) {
  return useLiveQuery(() => getDB().characterStates.where("projectId").equals(projectId).toArray(), [projectId]);
}

export function useEvents(projectId: ID) {
  return useLiveQuery(() => getDB().events.where("projectId").equals(projectId).toArray(), [projectId]);
}

export function useFacts(projectId: ID) {
  return useLiveQuery(() => getDB().facts.where("projectId").equals(projectId).sortBy("order"), [projectId]);
}

export function useKnowledge(projectId: ID) {
  return useLiveQuery(() => getDB().knowledge.where("projectId").equals(projectId).toArray(), [projectId]);
}

export function useActions(projectId: ID) {
  return useLiveQuery(() => getDB().actions.where("projectId").equals(projectId).toArray(), [projectId]);
}

export function useForeshadowing(projectId: ID) {
  return useLiveQuery(() => getDB().foreshadowing.where("projectId").equals(projectId).sortBy("createdAt"), [projectId]);
}

export function useMetrics(projectId: ID) {
  return useLiveQuery(() => getDB().metrics.where("projectId").equals(projectId).toArray(), [projectId]);
}

export function useNotes(projectId: ID) {
  return useLiveQuery(() => getDB().notes.where("projectId").equals(projectId).toArray(), [projectId]);
}

export function useSnapshots(docId: ID | null) {
  return useLiveQuery(
    async () => (docId ? (await getDB().snapshots.where("docId").equals(docId).sortBy("createdAt")).reverse() : []),
    [docId],
  );
}

export function useSessions(projectId: ID) {
  return useLiveQuery(() => getDB().sessions.where("projectId").equals(projectId).sortBy("date"), [projectId]);
}
