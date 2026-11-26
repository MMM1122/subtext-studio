import { getDB } from "@/lib/database/db";
import type { ID, Note } from "@/types";
import { now } from "@/lib/utils/id";
import { docFromPlainText } from "@/lib/utils/rich";
import { countText } from "@/lib/utils/text";
import { makeNote } from "./factories";
import { addCharacter } from "./characters";
import { addEvent } from "./narrative";
import { addScene } from "./manuscript";
import { touchProject } from "./projects";

export async function addNote(projectId: ID, p: Partial<Note> = {}) {
  const n = makeNote(projectId, p);
  await getDB().notes.add(n);
  await touchProject(projectId);
  return n;
}

export async function updateNote(id: ID, patch: Partial<Note>) {
  await getDB().notes.update(id, { ...patch, updatedAt: now() });
}

export async function deleteNote(id: ID) {
  await getDB().notes.delete(id);
}

export function noteTitle(n: Note): string {
  return n.title.trim() || n.body.trim().split("\n")[0]?.slice(0, 60) || "Untitled note";
}

/**
 * Convert an idea into a story entity. The note is kept (marked as converted)
 * so nothing is lost.
 */
export async function convertNote(note: Note, kind: "character" | "event" | "scene", chapterId?: ID) {
  const title = noteTitle(note);
  let id: ID;
  if (kind === "character") {
    const c = await addCharacter(note.projectId, { name: title, notes: note.body });
    id = c.id;
  } else if (kind === "event") {
    const e = await addEvent(note.projectId, { title, description: note.body, tags: note.tags, chapterId: chapterId ?? null });
    id = e.id;
  } else {
    if (!chapterId) throw new Error("Choose a chapter for the new scene.");
    const s = await addScene(chapterId, title);
    if (!s) throw new Error("Chapter not found.");
    const doc = docFromPlainText(note.body);
    const text = note.body;
    await getDB().scenes.update(s.id, { summary: note.body.slice(0, 280), doc, text, wordCount: countText(text).total });
    id = s.id;
  }
  await updateNote(note.id, { convertedTo: { kind, id } });
  return id;
}
