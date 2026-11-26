import { getDB, PROJECT_TABLES } from "@/lib/database/db";
import type { ID, Project } from "@/types";
import { now } from "@/lib/utils/id";
import { makeChapter, makeProject } from "./factories";

export async function touchProject(projectId: ID, patch: Partial<Project> = {}) {
  await getDB().projects.update(projectId, { ...patch, updatedAt: now() });
}

export async function createProject(input: Partial<Project>): Promise<Project> {
  const db = getDB();
  const project = makeProject({ ...input, title: input.title?.trim() || "Untitled Novel" });
  const chapter = makeChapter(project.id, 0, { title: "Chapter 1" });
  project.lastDocId = chapter.id;
  await db.transaction("rw", db.projects, db.chapters, async () => {
    await db.projects.add(project);
    await db.chapters.add(chapter);
  });
  return project;
}

export async function updateProject(id: ID, patch: Partial<Project>) {
  await getDB().projects.update(id, { ...patch, updatedAt: now() });
}

export async function setArchived(id: ID, archived: boolean) {
  await updateProject(id, { archived });
}

/** Permanently delete a project and every entity scoped to it, atomically. */
export async function deleteProject(id: ID) {
  const db = getDB();
  const tables = [db.projects, ...PROJECT_TABLES.map((t) => db.table(t))];
  await db.transaction("rw", tables, async () => {
    for (const t of PROJECT_TABLES) {
      await db.table(t).where("projectId").equals(id).delete();
    }
    await db.projects.delete(id);
  });
}

export async function projectWordCount(projectId: ID): Promise<number> {
  const db = getDB();
  const [chapters, scenes] = await Promise.all([
    db.chapters.where("projectId").equals(projectId).toArray(),
    db.scenes.where("projectId").equals(projectId).toArray(),
  ]);
  return chapters.reduce((s, c) => s + c.wordCount, 0) + scenes.reduce((s, c) => s + c.wordCount, 0);
}
