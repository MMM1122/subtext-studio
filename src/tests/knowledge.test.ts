import { describe, expect, it } from "vitest";
import { createProject } from "@/lib/repositories/projects";
import { addChapter, listChapters } from "@/lib/repositories/manuscript";
import { addFact, setKnowledge, addAction } from "@/lib/repositories/knowledge";
import { addCharacter } from "@/lib/repositories/characters";
import { getDB } from "@/lib/database/db";
import { checkActions, findDiscrepancies, indexKnowledge, resolveCell } from "@/features/knowledge/logic";
import { READER_AGENT } from "@/types";

async function setup() {
  const p = await createProject({ title: "K" });
  await addChapter(p.id);
  await addChapter(p.id);
  await addChapter(p.id);
  const chapters = await listChapters(p.id);
  const c = await addCharacter(p.id, { name: "A" });
  const f = await addFact(p.id, { title: "secret" });
  return { p, chapters, c, f };
}

describe("knowledge matrix history", () => {
  it("carries state forward and never rewrites earlier chapters", async () => {
    const { p, chapters, c, f } = await setup();
    const idx = new Map(chapters.map((ch, i) => [ch.id, i]));
    await setKnowledge(p.id, f.id, c.id, chapters[1].id, "suspected");
    await setKnowledge(p.id, f.id, c.id, chapters[3].id, "known");

    const recs = await getDB().knowledge.toArray();
    const index = indexKnowledge(recs, idx);
    expect(resolveCell(index, idx, f.id, c.id, 0).level).toBe("unknown");
    expect(resolveCell(index, idx, f.id, c.id, 1)).toMatchObject({ level: "suspected", inherited: false });
    expect(resolveCell(index, idx, f.id, c.id, 2)).toMatchObject({ level: "suspected", inherited: true });
    expect(resolveCell(index, idx, f.id, c.id, 3).level).toBe("known");

    // Changing the later chapter must not alter chapter 1's record.
    await setKnowledge(p.id, f.id, c.id, chapters[3].id, "misunderstood");
    const recs2 = await getDB().knowledge.toArray();
    expect(recs2).toHaveLength(2);
    const index2 = indexKnowledge(recs2, idx);
    expect(resolveCell(index2, idx, f.id, c.id, 1).level).toBe("suspected");
    expect(resolveCell(index2, idx, f.id, c.id, 3).level).toBe("misunderstood");
  });

  it("finds reader/character discrepancies", async () => {
    const { p, chapters, c, f } = await setup();
    const idx = new Map(chapters.map((ch, i) => [ch.id, i]));
    await setKnowledge(p.id, f.id, READER_AGENT, chapters[0].id, "known");
    const index = indexKnowledge(await getDB().knowledge.toArray(), idx);
    const d = findDiscrepancies([f], [c.id], index, idx, 0);
    expect(d.map((x) => x.kind)).toContain("dramatic-irony");
  });

  it("warns when recorded actions conflict with recorded knowledge", async () => {
    const { p, chapters, c, f } = await setup();
    const idx = new Map(chapters.map((ch, i) => [ch.id, i]));
    await setKnowledge(p.id, f.id, c.id, chapters[2].id, "known");
    await addAction(p.id, { characterId: c.id, chapterId: chapters[1].id, factId: f.id, requires: "known" });
    await addAction(p.id, { characterId: c.id, chapterId: chapters[2].id, factId: f.id, requires: "known" });
    const db = getDB();
    const warnings = checkActions(await db.actions.toArray(), indexKnowledge(await db.knowledge.toArray(), idx), idx);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].action.chapterId).toBe(chapters[1].id);
  });
});
