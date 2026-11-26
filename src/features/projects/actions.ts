"use client";
import { exportProjectBackup, importProjectBackup, type ImportReport } from "@/lib/export/backup";
import { buildManuscript, type ManuscriptFormat } from "@/lib/export/manuscript";
import { downloadFile, readFileAsText } from "@/lib/export/download";
import { getDB } from "@/lib/database/db";
import { slugify } from "@/lib/utils/text";
import { dateKey } from "@/lib/utils/id";
import type { ID } from "@/types";

export async function downloadBackup(projectId: ID) {
  const backup = await exportProjectBackup(projectId);
  const name = `${slugify(backup.project.title)}-backup-${dateKey()}.subtext.json`;
  downloadFile(name, JSON.stringify(backup, null, 2), "application/json");
}

export async function downloadManuscript(projectId: ID, format: ManuscriptFormat) {
  const project = await getDB().projects.get(projectId);
  const text = await buildManuscript(projectId, format, { includeSynopsis: false });
  const ext = format === "markdown" ? "md" : "txt";
  downloadFile(`${slugify(project?.title ?? "manuscript")}.${ext}`, text, format === "markdown" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8");
}

export async function importBackupFile(file: File): Promise<ImportReport> {
  if (file.size > 200 * 1024 * 1024) throw new Error("File is too large to be a Subtext Studio backup.");
  const text = await readFileAsText(file);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  // Whole-library export: import each project as a new project.
  if (raw && typeof raw === "object" && (raw as { format?: string }).format === "subtext-studio/library") {
    const list = (raw as { projects?: unknown[] }).projects ?? [];
    if (!Array.isArray(list) || list.length === 0) throw new Error("This library file contains no projects.");
    let last: ImportReport | null = null;
    let dropped = 0;
    for (const p of list) {
      last = await importProjectBackup(p);
      dropped += last.dropped;
    }
    return { ...last!, title: `${list.length} project(s)`, dropped };
  }
  return importProjectBackup(raw);
}

/** Export every project in one file (array of project backups). */
export async function downloadAllBackups() {
  const projects = await getDB().projects.toArray();
  const all = await Promise.all(projects.map((p) => exportProjectBackup(p.id)));
  downloadFile(`subtext-studio-library-${dateKey()}.json`, JSON.stringify({ format: "subtext-studio/library", projects: all }, null, 2), "application/json");
}
