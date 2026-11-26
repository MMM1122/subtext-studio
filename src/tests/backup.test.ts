import { describe, expect, it } from "vitest";
import { getDB } from "@/lib/database/db";
import { buildDemoBackup } from "@/lib/database/demo";
import { duplicateProject, exportProjectBackup, importProjectBackup, insertBackup } from "@/lib/export/backup";
import { validateBackup } from "@/lib/validation/backup";
import { deleteProject } from "@/lib/repositories/projects";
import { buildManuscript } from "@/lib/export/manuscript";

describe("backup & restore", () => {
  it("round-trips a project into a new project without touching the original", async () => {
    const demo = buildDemoBackup();
    await insertBackup(demo);
    const exported = await exportProjectBackup(demo.project.id);
    const json = JSON.parse(JSON.stringify(exported));
    const report = await importProjectBackup(json);
    expect(report.projectId).not.toBe(demo.project.id);
    expect(report.title).toContain("(restored)");
    expect(report.dropped).toBe(0);

    const db = getDB();
    expect(await db.projects.count()).toBe(2);
    const orig = await db.knowledge.where("projectId").equals(demo.project.id).count();
    const copy = await db.knowledge.where("projectId").equals(report.projectId).count();
    expect(copy).toBe(orig);

    // All references in the copy point inside the copy.
    const copyChapters = new Set((await db.chapters.where("projectId").equals(report.projectId).toArray()).map((c) => c.id));
    const copyKnowledge = await db.knowledge.where("projectId").equals(report.projectId).toArray();
    expect(copyKnowledge.every((k) => copyChapters.has(k.chapterId))).toBe(true);
    const copyEvents = await db.events.where("projectId").equals(report.projectId).toArray();
    const copyEventIds = new Set(copyEvents.map((e) => e.id));
    expect(copyEvents.every((e) => e.causeIds.every((c) => copyEventIds.has(c)))).toBe(true);
  });

  it("rejects invalid or future backups", () => {
    expect(validateBackup({ foo: 1 }).ok).toBe(false);
    expect(validateBackup({ ...buildDemoBackup(), schemaVersion: 999 }).ok).toBe(false);
    const bad = JSON.parse(JSON.stringify(buildDemoBackup()));
    bad.chapters[0].doc = "not a doc";
    expect(validateBackup(bad).ok).toBe(false);
  });

  it("duplicates and cascade-deletes projects", async () => {
    const demo = buildDemoBackup();
    await insertBackup(demo);
    const dup = await duplicateProject(demo.project.id);
    expect(dup.title).toContain("(copy)");
    await deleteProject(demo.project.id);
    const db = getDB();
    expect(await db.chapters.where("projectId").equals(demo.project.id).count()).toBe(0);
    expect(await db.knowledge.where("projectId").equals(demo.project.id).count()).toBe(0);
    expect(await db.chapters.where("projectId").equals(dup.projectId).count()).toBe(4);
  });

  it("exports manuscripts as markdown and text", async () => {
    const demo = buildDemoBackup();
    await insertBackup(demo);
    const md = await buildManuscript(demo.project.id, "markdown");
    expect(md.startsWith("# 灯下时刻")).toBe(true);
    expect(md).toContain("## 第一章");
    expect(md).toContain("### 钟楼楼梯");
    const txt = await buildManuscript(demo.project.id, "text");
    expect(txt).toContain("雾是从海上来的");
    expect(txt).not.toContain("##");
  });
});

describe("demo seeding", () => {
  it("seeds exactly once under concurrent calls", async () => {
    const { seedDemoIfNeeded } = await import("@/lib/database/seed");
    await Promise.all([seedDemoIfNeeded(), seedDemoIfNeeded(), seedDemoIfNeeded()]);
    expect(await getDB().projects.count()).toBe(1);
  });
});
