import { describe, expect, it } from "vitest";
import { getDB } from "@/lib/database/db";
import { createProject } from "@/lib/repositories/projects";
import {
  addChapter,
  addScene,
  createSnapshot,
  deleteChapter,
  duplicateChapter,
  listChapters,
  reorderChapters,
  restoreSnapshot,
  saveDocContent,
} from "@/lib/repositories/manuscript";
import { setKnowledge, addFact } from "@/lib/repositories/knowledge";
import { addEvent } from "@/lib/repositories/narrative";
import { docFromParagraphs } from "@/lib/utils/rich";

describe("chapters", () => {
  it("creates, reorders, duplicates and deletes chapters safely", async () => {
    const p = await createProject({ title: "M" });
    const c2 = await addChapter(p.id, "Two");
    const c3 = await addChapter(p.id, "Three");
    let list = await listChapters(p.id);
    expect(list.map((c) => c.title)).toEqual(["Chapter 1", "Two", "Three"]);

    await reorderChapters(p.id, [c3.id, list[0].id, c2.id]);
    list = await listChapters(p.id);
    expect(list.map((c) => c.title)).toEqual(["Three", "Chapter 1", "Two"]);

    const dup = await duplicateChapter(c3.id);
    list = await listChapters(p.id);
    expect(list.map((c) => c.id)[1]).toBe(dup!.id);

    const f = await addFact(p.id);
    await setKnowledge(p.id, f.id, "__reader__", c3.id, "known");
    const ev = await addEvent(p.id, { chapterId: c3.id });
    await addScene(c3.id, "S");
    await deleteChapter(c3.id);
    const db = getDB();
    list = await listChapters(p.id);
    expect(list.map((c) => c.order)).toEqual([0, 1, 2]);
    expect(await db.scenes.where("chapterId").equals(c3.id).count()).toBe(0);
    expect(await db.knowledge.count()).toBe(0);
    expect((await db.events.get(ev.id))!.chapterId).toBeNull();
  });

  it("saves content, tracks writing deltas and restores snapshots without loss", async () => {
    const p = await createProject({ title: "S" });
    const [c] = await listChapters(p.id);
    const ref = { kind: "chapter" as const, id: c.id };
    await saveDocContent(ref, docFromParagraphs(["first version"]), "first version", 2);
    const snap = await createSnapshot(ref, "v1");
    await saveDocContent(ref, docFromParagraphs(["second version longer"]), "second version longer", 3);
    expect(await restoreSnapshot(snap!.id)).toBe(true);

    const db = getDB();
    expect((await db.chapters.get(c.id))!.text).toBe("first version");
    const snaps = await db.snapshots.where("docId").equals(c.id).toArray();
    expect(snaps.some((s) => s.automatic && s.text === "second version longer")).toBe(true);
    const sessions = await db.sessions.toArray();
    expect(sessions[0].wordsAdded).toBe(3);
  });
});
