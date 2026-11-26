import "fake-indexeddb/auto";
import { beforeEach } from "vitest";
import { SubtextDB, setDB } from "@/lib/database/db";

let n = 0;
beforeEach(async () => {
  // Fresh, isolated database per test.
  const db = new SubtextDB(`test-${Date.now()}-${n++}`);
  await db.open();
  setDB(db);
});
