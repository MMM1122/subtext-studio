import { getDB } from "@/lib/database/db";
import type { UserSettings } from "@/types";
import { DEFAULT_SETTINGS } from "./factories";

export async function getSettings(): Promise<UserSettings> {
  const s = await getDB().settings.get("settings");
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export async function updateSettings(patch: Partial<UserSettings>) {
  const db = getDB();
  const current = await getSettings();
  await db.settings.put({ ...current, ...patch, id: "settings", updatedAt: Date.now() });
}
