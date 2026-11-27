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
    expect(await db.chapters.where("projectId").equals(dup.projectId).count()).toBe(10);
  });

  it("exports manuscripts as markdown and text", async () => {
    const demo = buildDemoBackup();
    await insertBackup(demo);
    const md = await buildManuscript(demo.project.id, "markdown");
    expect(md.startsWith("# 筝探")).toBe(true);
    expect(md).toContain("## 第一章 断弦");
    expect(md).toContain("### 推理板");
    const txt = await buildManuscript(demo.project.id, "text");
    expect(txt).toContain("雨下了一整夜");
    expect(txt).not.toContain("##");
  });
});

describe("demo seeding", () => {
  it("seeds exactly once under concurrent calls", async () => {
    const { seedDemoIfNeeded } = await import("@/lib/database/seed");
    await Promise.all([seedDemoIfNeeded(), seedDemoIfNeeded(), seedDemoIfNeeded()]);
    expect(await getDB().projects.count()).toBe(1);
  });

  it("adds a newer demo once to browsers seeded with an older one, without deleting anything", async () => {
    const { seedDemoIfNeeded } = await import("@/lib/database/seed");
    const { makeProject, DEFAULT_SETTINGS } = await import("@/lib/repositories/factories");
    const db = getDB();
    await db.projects.add(makeProject({ title: "Old demo" }));
    await db.settings.put({ ...DEFAULT_SETTINGS, demoSeeded: true });
    await seedDemoIfNeeded();
    await seedDemoIfNeeded();
    const titles = (await db.projects.toArray()).map((p) => p.title).sort();
    expect(titles).toEqual(["Old demo", "筝探"]);
  });
});

describe("demo content", () => {
  it("is internally consistent and demonstrates exactly one action warning", async () => {
    const { buildDemoBackup } = await import("@/lib/database/demo");
    const { checkCausality } = await import("@/features/narrative/logic");
    const { checkActions, indexKnowledge } = await import("@/features/knowledge/logic");
    const d = buildDemoBackup();
    expect(d.chapters).toHaveLength(10);
    const idx = new Map(d.chapters.map((c, i) => [c.id, i]));
    const issues = checkCausality(d.events, idx);
    expect(issues.filter((i) => i.severity !== "info")).toEqual([]);
    expect(new Set(d.events.map((e) => e.narrativeOrder)).size).toBe(d.events.length);
    const warnings = checkActions(d.actions, indexKnowledge(d.knowledge, idx), idx);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].action.description).toContain("22 点");
    expect(validateBackup(JSON.parse(JSON.stringify(d))).ok).toBe(true);
  });
});
