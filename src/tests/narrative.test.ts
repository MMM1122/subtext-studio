import { describe, expect, it } from "vitest";
import { createProject } from "@/lib/repositories/projects";
import { addEvent, deleteEvent, reorderChronological, reorderNarrative, updateEvent } from "@/lib/repositories/narrative";
import { getDB } from "@/lib/database/db";
import { checkCausality, narrativeMarkers, nonlinearity } from "@/features/narrative/logic";

describe("dual timeline", () => {
  it("reorders narrative order without touching chronology (and vice versa)", async () => {
    const p = await createProject({ title: "T" });
    const a = await addEvent(p.id, { title: "A" });
    const b = await addEvent(p.id, { title: "B" });
    const c = await addEvent(p.id, { title: "C" });
    await reorderNarrative([c.id, a.id, b.id]);
    let all = await getDB().events.toArray();
    const get = (id: string) => all.find((e) => e.id === id)!;
    expect([get(a.id).chronoOrder, get(b.id).chronoOrder, get(c.id).chronoOrder]).toEqual([0, 1, 2]);
    expect([get(a.id).narrativeOrder, get(b.id).narrativeOrder, get(c.id).narrativeOrder]).toEqual([1, 2, 0]);

    await reorderChronological([b.id, a.id, c.id]);
    all = await getDB().events.toArray();
    expect([get(a.id).narrativeOrder, get(b.id).narrativeOrder, get(c.id).narrativeOrder]).toEqual([1, 2, 0]);
    expect(all.find((e) => e.id === b.id)!.chronoOrder).toBe(0);
  });

  it("detects causes that occur after their effects, and cycles", async () => {
    const p = await createProject({ title: "T" });
    const a = await addEvent(p.id, { title: "A" });
    const b = await addEvent(p.id, { title: "B" });
    await updateEvent(a.id, { causeIds: [b.id] });
    let events = await getDB().events.toArray();
    expect(checkCausality(events).some((i) => i.severity === "error" && i.message.includes("happens after"))).toBe(true);

    await updateEvent(b.id, { causeIds: [a.id] });
    events = await getDB().events.toArray();
    expect(checkCausality(events).some((i) => i.message.startsWith("Circular"))).toBe(true);
  });

  it("removes dangling cause references on delete", async () => {
    const p = await createProject({ title: "T" });
    const a = await addEvent(p.id, { title: "A" });
    const b = await addEvent(p.id, { title: "B", causeIds: [] });
    await updateEvent(b.id, { causeIds: [a.id] });
    await deleteEvent(a.id);
    const rest = await getDB().events.toArray();
    expect(rest).toHaveLength(1);
    expect(rest[0].causeIds).toEqual([]);
    expect(rest[0].chronoOrder).toBe(0);
  });

  it("classifies flashbacks from the two orderings", async () => {
    const p = await createProject({ title: "T" });
    const a = await addEvent(p.id, { title: "past" });
    const b = await addEvent(p.id, { title: "present1" });
    const c = await addEvent(p.id, { title: "present2" });
    await reorderNarrative([b.id, c.id, a.id]);
    const events = await getDB().events.toArray();
    const markers = narrativeMarkers(events);
    expect(markers.get(a.id)).toBe("flashback");
    expect(markers.get(b.id)).toBe("linear"); // opening frame, not a flash-forward
    expect(nonlinearity(events)).toBeCloseTo(2 / 3);
  });

  it("detects flash-forwards that skip ahead and later return", async () => {
    const p = await createProject({ title: "T" });
    const a = await addEvent(p.id, { title: "a" });
    const b = await addEvent(p.id, { title: "b" });
    const c = await addEvent(p.id, { title: "c" });
    const d = await addEvent(p.id, { title: "d" });
    await reorderNarrative([a.id, c.id, b.id, d.id]);
    const markers = narrativeMarkers(await getDB().events.toArray());
    expect(markers.get(c.id)).toBe("flash-forward");
    expect(markers.get(b.id)).toBe("flashback");
    expect(markers.get(d.id)).toBe("linear");
  });
});
