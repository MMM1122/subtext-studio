import { getDB, patchRow } from "@/lib/database/db";
import type { Chapter, DocRef, ID, ManuscriptSnapshot, RichDoc, Scene } from "@/types";
import { dateKey, newId, now } from "@/lib/utils/id";
import { makeChapter, makeScene } from "./factories";
import { touchProject } from "./projects";

export async function listChapters(projectId: ID): Promise<Chapter[]> {
  return getDB().chapters.where("[projectId+order]").between([projectId, -Infinity], [projectId, Infinity]).toArray();
}

export async function listScenes(chapterId: ID): Promise<Scene[]> {
  return getDB().scenes.where("[chapterId+order]").between([chapterId, -Infinity], [chapterId, Infinity]).toArray();
}

export async function addChapter(projectId: ID, title?: string): Promise<Chapter> {
  const db = getDB();
  const count = await db.chapters.where("projectId").equals(projectId).count();
  const chapter = makeChapter(projectId, count, title ? { title } : {});
  await db.chapters.add(chapter);
  await touchProject(projectId);
  return chapter;
}

export async function updateChapter(id: ID, patch: Partial<Chapter>) {
  const db = getDB();
  await patchRow<Chapter>(db.chapters, id, { ...patch, updatedAt: now() });
  const c = await db.chapters.get(id);
  if (c) await touchProject(c.projectId);
}

/** Persist a new chapter order. `orderedIds` must contain every chapter of the project. */
export async function reorderChapters(projectId: ID, orderedIds: ID[]) {
  const db = getDB();
  await db.transaction("rw", db.chapters, async () => {
    const existing = await db.chapters.where("projectId").equals(projectId).toArray();
    const known = new Set(existing.map((c) => c.id));
    const ids = orderedIds.filter((id) => known.has(id));
    // Append any chapter missing from the list so nothing is lost.
    for (const c of existing.sort((a, b) => a.order - b.order)) if (!ids.includes(c.id)) ids.push(c.id);
    await Promise.all(ids.map((id, i) => db.chapters.update(id, { order: i })));
  });
  await touchProject(projectId);
}

export async function reorderScenes(chapterId: ID, orderedIds: ID[]) {
  const db = getDB();
  await db.transaction("rw", db.scenes, async () => {
    await Promise.all(orderedIds.map((id, i) => db.scenes.update(id, { order: i, chapterId })));
  });
}

export async function duplicateChapter(id: ID): Promise<Chapter | null> {
  const db = getDB();
  const src = await db.chapters.get(id);
  if (!src) return null;
  const t = now();
  const copy: Chapter = { ...src, id: newId(), title: `${src.title} (copy)`, order: src.order + 1, createdAt: t, updatedAt: t };
  const scenes = await db.scenes.where("chapterId").equals(id).toArray();
  await db.transaction("rw", db.chapters, db.scenes, async () => {
    const later = await db.chapters.where("projectId").equals(src.projectId).filter((c) => c.order > src.order).toArray();
    await Promise.all(later.map((c) => db.chapters.update(c.id, { order: c.order + 1 })));
    await db.chapters.add(copy);
    await db.scenes.bulkAdd(scenes.map((s) => ({ ...s, id: newId(), chapterId: copy.id, createdAt: t, updatedAt: t })));
  });
  await touchProject(src.projectId);
  return copy;
}

export interface ChapterDependencies {
  scenes: number;
  snapshots: number;
  knowledge: number;
  states: number;
  metrics: number;
  actions: number;
}

export async function chapterDependencies(id: ID): Promise<ChapterDependencies> {
  const db = getDB();
  const sceneIds = (await db.scenes.where("chapterId").equals(id).primaryKeys()) as ID[];
  const [snapshots, knowledge, states, metrics, actions] = await Promise.all([
    db.snapshots.where("docId").anyOf([id, ...sceneIds]).count(),
    db.knowledge.where("chapterId").equals(id).count(),
    db.characterStates.where("chapterId").equals(id).count(),
    db.metrics.where("chapterId").equals(id).count(),
    db.actions.where("chapterId").equals(id).count(),
  ]);
  return { scenes: sceneIds.length, snapshots, knowledge, states, metrics, actions };
}

/**
 * Delete a chapter and its dependent records. Links from events, notes and
 * foreshadowing are cleared (not deleted).
 */
export async function deleteChapter(id: ID) {
  const db = getDB();
  const chapter = await db.chapters.get(id);
  if (!chapter) return;
  await db.transaction(
    "rw",
    [db.chapters, db.scenes, db.snapshots, db.knowledge, db.characterStates, db.metrics, db.actions, db.events, db.notes, db.foreshadowing, db.projects],
    async () => {
      const sceneIds = (await db.scenes.where("chapterId").equals(id).primaryKeys()) as ID[];
      await db.snapshots.where("docId").anyOf([id, ...sceneIds]).delete();
      await db.scenes.where("chapterId").equals(id).delete();
      await db.knowledge.where("chapterId").equals(id).delete();
      await db.characterStates.where("chapterId").equals(id).delete();
      await db.metrics.where("chapterId").equals(id).delete();
      await db.actions.where("chapterId").equals(id).delete();
      await db.events.where("chapterId").equals(id).modify({ chapterId: null, sceneId: null });
      await db.notes
        .where("projectId")
        .equals(chapter.projectId)
        .modify((n) => {
          n.chapterIds = n.chapterIds.filter((c) => c !== id);
        });
      await db.foreshadowing
        .where("projectId")
        .equals(chapter.projectId)
        .modify((f) => {
          if (f.introducedChapterId === id) f.introducedChapterId = null;
          if (f.expectedPayoffChapterId === id) f.expectedPayoffChapterId = null;
          if (f.actualPayoffChapterId === id) f.actualPayoffChapterId = null;
        });
      await db.chapters.delete(id);
      const rest = await db.chapters.where("projectId").equals(chapter.projectId).sortBy("order");
      await Promise.all(rest.map((c, i) => db.chapters.update(c.id, { order: i })));
      const project = await db.projects.get(chapter.projectId);
      if (project && (project.lastDocId === id || sceneIds.includes(project.lastDocId ?? ""))) {
        await db.projects.update(project.id, { lastDocId: rest[0]?.id ?? null });
      }
    },
  );
  await touchProject(chapter.projectId);
}

export async function addScene(chapterId: ID, title?: string): Promise<Scene | null> {
  const db = getDB();
  const chapter = await db.chapters.get(chapterId);
  if (!chapter) return null;
  const count = await db.scenes.where("chapterId").equals(chapterId).count();
  const scene = makeScene(chapter.projectId, chapterId, count, title ? { title } : {});
  await db.scenes.add(scene);
  await touchProject(chapter.projectId);
  return scene;
}

export async function updateScene(id: ID, patch: Partial<Scene>) {
  const db = getDB();
  await patchRow<Scene>(db.scenes, id, { ...patch, updatedAt: now() });
}

export async function deleteScene(id: ID) {
  const db = getDB();
  const scene = await db.scenes.get(id);
  if (!scene) return;
  await db.transaction("rw", [db.scenes, db.snapshots, db.events, db.knowledge, db.characterStates, db.metrics, db.projects], async () => {
    await db.snapshots.where("docId").equals(id).delete();
    await db.events.where("projectId").equals(scene.projectId).modify((e) => {
      if (e.sceneId === id) e.sceneId = null;
    });
    await db.knowledge.where("chapterId").equals(scene.chapterId).modify((k) => {
      if (k.sceneId === id) k.sceneId = null;
    });
    await db.characterStates.where("chapterId").equals(scene.chapterId).modify((s) => {
      if (s.sceneId === id) s.sceneId = null;
    });
    await db.metrics.where("chapterId").equals(scene.chapterId).modify((m) => {
      if (m.sceneId === id) m.sceneId = null;
    });
    await db.scenes.delete(id);
    const rest = await db.scenes.where("chapterId").equals(scene.chapterId).sortBy("order");
    await Promise.all(rest.map((s, i) => db.scenes.update(s.id, { order: i })));
    const project = await db.projects.get(scene.projectId);
    if (project?.lastDocId === id) await db.projects.update(project.id, { lastDocId: scene.chapterId });
  });
}

export async function getDoc(ref: DocRef): Promise<Chapter | Scene | undefined> {
  const db = getDB();
  return ref.kind === "chapter" ? db.chapters.get(ref.id) : db.scenes.get(ref.id);
}

/** Record net word changes for daily writing statistics. */
export async function recordWritingDelta(projectId: ID, delta: number) {
  if (!delta) return;
  const db = getDB();
  const date = dateKey();
  const existing = await db.sessions.where("[projectId+date]").equals([projectId, date]).first();
  const t = now();
  if (existing) {
    await db.sessions.update(existing.id, {
      wordsAdded: existing.wordsAdded + Math.max(0, delta),
      wordsRemoved: existing.wordsRemoved + Math.max(0, -delta),
      updatedAt: t,
    });
  } else {
    await db.sessions.add({
      id: newId(),
      createdAt: t,
      updatedAt: t,
      projectId,
      date,
      wordsAdded: Math.max(0, delta),
      wordsRemoved: Math.max(0, -delta),
    });
  }
}

/** Save editor content for a chapter or scene. Returns false if the document no longer exists. */
export async function saveDocContent(ref: DocRef, doc: RichDoc, text: string, wordCount: number): Promise<boolean> {
  const db = getDB();
  const existing = await getDoc(ref);
  if (!existing) return false;
  const t = now();
  const patch = { doc, text, wordCount, updatedAt: t };
  if (ref.kind === "chapter") await patchRow<Chapter>(db.chapters, ref.id, patch);
  else await patchRow<Scene>(db.scenes, ref.id, patch);
  await recordWritingDelta(existing.projectId, wordCount - existing.wordCount);
  await touchProject(existing.projectId, { lastDocId: ref.id });
  return true;
}

export async function createSnapshot(ref: DocRef, label: string, automatic = false): Promise<ManuscriptSnapshot | null> {
  const db = getDB();
  const d = await getDoc(ref);
  if (!d) return null;
  const t = now();
  const snap: ManuscriptSnapshot = {
    id: newId(),
    createdAt: t,
    updatedAt: t,
    projectId: d.projectId,
    docKind: ref.kind,
    docId: ref.id,
    label: label.trim() || new Date(t).toLocaleString(),
    doc: d.doc,
    text: d.text,
    wordCount: d.wordCount,
    automatic,
  };
  await db.snapshots.add(snap);
  return snap;
}

/**
 * Restore a snapshot. The current content is first saved as an automatic
 * snapshot so a restore never silently destroys text.
 */
export async function restoreSnapshot(snapshotId: ID): Promise<boolean> {
  const db = getDB();
  const snap = await db.snapshots.get(snapshotId);
  if (!snap) return false;
  const ref: DocRef = { kind: snap.docKind, id: snap.docId };
  const backup = await createSnapshot(ref, `Before restoring “${snap.label}”`, true);
  if (!backup) return false;
  const t = now();
  const patch = { doc: snap.doc, text: snap.text, wordCount: snap.wordCount, updatedAt: t };
  if (ref.kind === "chapter") await patchRow<Chapter>(db.chapters, ref.id, patch);
  else await patchRow<Scene>(db.scenes, ref.id, patch);
  await touchProject(snap.projectId);
  return true;
}

export async function deleteSnapshot(id: ID) {
  await getDB().snapshots.delete(id);
}
