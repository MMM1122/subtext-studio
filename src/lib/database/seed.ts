import { getDB, PROJECT_TABLES } from "./db";
import { buildDemoBackup } from "./demo";
import { insertBackup } from "@/lib/export/backup";
import { DEFAULT_SETTINGS } from "@/lib/repositories/factories";

let seeding: Promise<boolean> | null = null;

/**
 * Seed the demo project once, on first launch with an empty library.
 * Atomic (single transaction) and idempotent, so concurrent calls — React
 * Strict Mode, multiple tabs — can never create duplicates.
 */
export function seedDemoIfNeeded(): Promise<boolean> {
  if (!seeding) {
    const db = getDB();
    seeding = db
      .transaction("rw", [db.settings, db.projects, ...PROJECT_TABLES.map((t) => db.table(t))], async () => {
        const settings = { ...DEFAULT_SETTINGS, ...((await db.settings.get("settings")) ?? {}) };
        if (settings.demoSeeded) return false;
        const empty = (await db.projects.count()) === 0;
        if (empty) await insertBackup(buildDemoBackup());
        await db.settings.put({ ...settings, demoSeeded: true, updatedAt: Date.now() });
        return empty;
      })
      .catch((e) => {
        seeding = null;
        throw e;
      });
  }
  return seeding;
}

export async function addDemoProject() {
  const demo = buildDemoBackup();
  await insertBackup(demo);
  return demo.project.id;
}
