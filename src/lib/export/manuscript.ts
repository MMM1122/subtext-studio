import { getDB } from "@/lib/database/db";
import type { ID } from "@/types";
import { docToMarkdown, docToPlainText } from "@/lib/utils/rich";

export type ManuscriptFormat = "markdown" | "text";

export interface ManuscriptOptions {
  includeSceneTitles?: boolean;
  includeSynopsis?: boolean;
}

/** Build the full manuscript (chapters in order, scenes after their chapter body). */
export async function buildManuscript(projectId: ID, format: ManuscriptFormat, opts: ManuscriptOptions = {}): Promise<string> {
  const db = getDB();
  const project = await db.projects.get(projectId);
  if (!project) throw new Error("Project not found.");
  const chapters = await db.chapters.where("projectId").equals(projectId).sortBy("order");
  const scenes = await db.scenes.where("projectId").equals(projectId).toArray();
  const md = format === "markdown";
  const parts: string[] = [];

  if (md) {
    parts.push(`# ${project.title}`);
    if (project.author) parts.push(`*${project.author}*`);
    if (opts.includeSynopsis && project.synopsis) parts.push(`> ${project.synopsis.replace(/\n/g, "\n> ")}`);
  } else {
    parts.push(project.title.toUpperCase());
    if (project.author) parts.push(project.author);
    if (opts.includeSynopsis && project.synopsis) parts.push(project.synopsis);
  }

  for (const ch of chapters) {
    parts.push(md ? `## ${ch.title}` : `\n\n${ch.title}\n${"=".repeat(Math.min(40, ch.title.length * 2))}`);
    const body = md ? docToMarkdown(ch.doc, 2) : docToPlainText(ch.doc);
    if (body) parts.push(body);
    const chScenes = scenes.filter((s) => s.chapterId === ch.id).sort((a, b) => a.order - b.order);
    for (const s of chScenes) {
      if (opts.includeSceneTitles !== false) parts.push(md ? `### ${s.title}` : `— ${s.title} —`);
      else parts.push(md ? "* * *" : "* * *");
      const sb = md ? docToMarkdown(s.doc, 3) : docToPlainText(s.doc);
      if (sb) parts.push(sb);
    }
  }
  return parts.join("\n\n").trim() + "\n";
}
