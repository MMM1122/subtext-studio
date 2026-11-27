import { getDB, PROJECT_TABLES } from "./db";
import { buildDemoBackup, DEMO_VERSION } from "./demo";
import { insertBackup } from "@/lib/export/backup";
import { DEFAULT_SETTINGS } from "@/lib/repositories/factories";

/** One in-flight/finished seeding per database instance. */
const seeding = new WeakMap<object, Promise<boolean>>();

/**
 * Seed the demo project once, on first launch with an empty library.
 * Atomic (single transaction) and idempotent, so concurrent calls — React
 * Strict Mode, multiple tabs — can never create duplicates.
 */
export function seedDemoIfNeeded(): Promise<boolean> {
  const db = getDB();
  let job = seeding.get(db);
  if (!job) {
    job = db
      .transaction("rw", [db.settings, db.projects, ...PROJECT_TABLES.map((t) => db.table(t))], async () => {
        const settings = { ...DEFAULT_SETTINGS, ...((await db.settings.get("settings")) ?? {}) };
        const save = () => db.settings.put({ ...settings, demoSeeded: true, demoVersion: DEMO_VERSION, updatedAt: Date.now() });
        if (!settings.demoSeeded) {
          // First launch: add the demo only to an empty library.
          const empty = (await db.projects.count()) === 0;
          if (empty) await insertBackup(buildDemoBackup());
          await save();
          return empty;
        }
        if ((settings.demoVersion ?? 1) < DEMO_VERSION) {
          // A newer demo shipped: add it once. Older demos and user projects are never touched.
          await insertBackup(buildDemoBackup());
          await save();
          return true;
        }
        return false;
      })
      .catch((e) => {
        seeding.delete(db);
        throw e;
      });
    seeding.set(db, job);
  }
  return job;
}

export async function addDemoProject() {
  const demo = buildDemoBackup();
  await insertBackup(demo);
  return demo.project.id;
}
