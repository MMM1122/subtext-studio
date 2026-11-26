"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Copy,
  Download,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { getDB } from "@/lib/database/db";
import { createProject, deleteProject, setArchived, updateProject } from "@/lib/repositories/projects";
import { duplicateProject } from "@/lib/export/backup";
import { addDemoProject } from "@/lib/database/seed";
import { downloadBackup, downloadManuscript, importBackupFile } from "@/features/projects/actions";
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { EmptyState, Loading, Notice, SectionTitle, Tabs } from "@/components/ui/misc";
import { Input } from "@/components/ui/field";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { toast } from "@/stores/ui";
import { formatCount, relativeTime, truncate } from "@/lib/utils/text";
import { dateKey } from "@/lib/utils/id";
import type { Project } from "@/types";

function useLibrary() {
  return useLiveQuery(async () => {
    const db = getDB();
    const [projects, chapters, scenes, sessions] = await Promise.all([
      db.projects.orderBy("updatedAt").reverse().toArray(),
      db.chapters.toArray(),
      db.scenes.toArray(),
      db.sessions.where("date").equals(dateKey()).toArray(),
    ]);
    const words = new Map<string, number>();
    const chapterCount = new Map<string, number>();
    for (const c of chapters) {
      words.set(c.projectId, (words.get(c.projectId) ?? 0) + c.wordCount);
      chapterCount.set(c.projectId, (chapterCount.get(c.projectId) ?? 0) + 1);
    }
    for (const s of scenes) words.set(s.projectId, (words.get(s.projectId) ?? 0) + s.wordCount);
    const docs = [...chapters, ...scenes].sort((a, b) => b.updatedAt - a.updatedAt);
    const titles = new Map(projects.map((p) => [p.id, p.title]));
    const recent = docs.filter((d) => titles.has(d.projectId)).slice(0, 6);
    const today = sessions.reduce((s, x) => s + x.wordsAdded, 0);
    return { projects, words, chapterCount, recent, titles, today };
  }, []);
}

export function LibraryView() {
  const data = useLibrary();
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!data) return <Loading />;
  const list = data.projects.filter(
    (p) => (tab === "archived" ? p.archived : !p.archived) && (!query || (p.title + p.author + p.genre).toLowerCase().includes(query.toLowerCase())),
  );
  const archivedCount = data.projects.filter((p) => p.archived).length;

  return (
    <div className="min-h-screen">
      <GlobalHeader />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Library</p>
            <h1 className="serif mt-1 text-3xl text-ink">Your manuscripts</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload size={15} /> Import backup
            </Button>
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus size={15} /> New project
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              aria-label="Import project backup"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  const r = await importBackupFile(f);
                  toast(`Imported “${r.title}”${r.dropped ? ` (${r.dropped} orphaned records skipped)` : ""}.`, "success");
                } catch (err) {
                  toast(err instanceof Error ? err.message : "Import failed.", "error");
                }
              }}
            />
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <Tabs
                value={tab}
                onChange={setTab}
                items={[
                  { value: "active", label: "Active" },
                  { value: "archived", label: `Archived${archivedCount ? ` (${archivedCount})` : ""}` },
                ]}
              />
              <Input
                className="h-8 max-w-[220px]"
                placeholder="Filter projects…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Filter projects"
              />
            </div>

            {list.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={28} />}
                title={tab === "archived" ? "No archived projects" : "The shelves are empty"}
                action={
                  tab === "active" && (
                    <div className="flex gap-2">
                      <Button variant="primary" onClick={() => setCreating(true)}>
                        <Plus size={15} /> New project
                      </Button>
                      <Button
                        variant="outline"
                        onClick={async () => {
                          await addDemoProject();
                          toast("Demo project added.");
                        }}
                      >
                        <Sparkles size={15} /> Add demo project
                      </Button>
                    </div>
                  )
                }
              >
                {tab === "active" ? "Start a new novel, import a backup, or open the demonstration project." : null}
              </EmptyState>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {list.map((p) => (
                  <li key={p.id}>
                    <ProjectCard
                      project={p}
                      words={data.words.get(p.id) ?? 0}
                      chapters={data.chapterCount.get(p.id) ?? 0}
                      onOpen={() => router.push(`/projects/${p.id}/write`)}
                      onEdit={() => setEditing(p)}
                      onDelete={() => {
                        setDeleteText("");
                        setDeleting(p);
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="space-y-8">
            <div>
              <SectionTitle>Today</SectionTitle>
              <p className="serif text-3xl text-ink">{formatCount(data.today)}</p>
              <p className="text-xs text-muted">words / 字 written today across projects</p>
            </div>
            <div>
              <SectionTitle>Recent activity</SectionTitle>
              {data.recent.length === 0 ? (
                <p className="text-sm text-muted">Nothing edited yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.recent.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/projects/${d.projectId}/write?doc=${d.id}`}
                        className="group block rounded-md px-1 py-0.5 hover:bg-surface"
                      >
                        <span className="block truncate text-sm text-ink group-hover:text-accent-ink">{d.title}</span>
                        <span className="block truncate text-xs text-muted">
                          {truncate(data.titles.get(d.projectId) ?? "", 28)} · {relativeTime(d.updatedAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Notice>
              Everything you write is stored only in this browser (IndexedDB). Clearing site data or using another browser
              means it won&apos;t be there. Export a JSON backup regularly from each project&apos;s menu.
            </Notice>
          </aside>
        </div>
      </main>

      <ProjectFormDialog
        mode="create"
        open={creating}
        onOpenChange={setCreating}
        onSubmit={async (v) => {
          const p = await createProject(v);
          router.push(`/projects/${p.id}/write`);
        }}
      />
      <ProjectFormDialog
        mode="edit"
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        initial={editing ?? undefined}
        onSubmit={async (v) => {
          if (editing) await updateProject(editing.id, v);
        }}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete project permanently?"
        danger
        confirmLabel="Delete forever"
        description={
          <>
            “{deleting?.title}” and all of its chapters, characters, timelines, notes and snapshots will be removed from
            this browser. This cannot be undone. Consider exporting a backup first.
          </>
        }
        onConfirm={async () => {
          if (!deleting) return;
          if (deleteText.trim() !== "DELETE") {
            toast("Type DELETE to confirm.", "error");
            throw new Error("not confirmed");
          }
          await deleteProject(deleting.id);
          toast("Project deleted.");
        }}
      >
        <div className="space-y-3">
          <Button variant="outline" size="sm" onClick={() => deleting && downloadBackup(deleting.id)}>
            <Download size={13} /> Export backup first
          </Button>
          <Input value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder="Type DELETE to confirm" aria-label="Type DELETE to confirm" />
        </div>
      </ConfirmDialog>
    </div>
  );
}

function ProjectCard({
  project: p,
  words,
  chapters,
  onOpen,
  onEdit,
  onDelete,
}: {
  project: Project;
  words: number;
  chapters: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const goal = p.wordGoal ?? 0;
  const pct = goal ? Math.min(100, Math.round((words / goal) * 100)) : null;
  return (
    <article className="group flex h-full gap-4 rounded-md border border-line bg-surface/50 p-4 transition-colors hover:border-accent/60">
      <button
        onClick={onOpen}
        className="flex aspect-[2/3] w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-line bg-bg"
        aria-label={`Open ${p.title}`}
      >
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="serif px-1 text-center text-[11px] leading-tight text-muted">{truncate(p.title, 30)}</span>
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onOpen} className="min-w-0 text-left">
            <h2 className="serif truncate text-lg leading-snug text-ink group-hover:text-accent-ink">{p.title}</h2>
            <p className="truncate text-xs text-muted">{[p.author, p.genre].filter(Boolean).join(" · ") || "—"}</p>
          </button>
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Project actions">
                <MoreHorizontal size={16} />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon={<Pencil size={14} />} onSelect={onEdit}>
                Edit details
              </MenuItem>
              <MenuItem
                icon={<Copy size={14} />}
                onSelect={async () => {
                  const r = await duplicateProject(p.id);
                  toast(`Created “${r.title}”.`);
                }}
              >
                Duplicate
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={<Download size={14} />} onSelect={() => downloadBackup(p.id)}>
                Export backup (.json)
              </MenuItem>
              <MenuItem icon={<FileText size={14} />} onSelect={() => downloadManuscript(p.id, "markdown")}>
                Export manuscript (.md)
              </MenuItem>
              <MenuItem icon={<FileText size={14} />} onSelect={() => downloadManuscript(p.id, "text")}>
                Export manuscript (.txt)
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                icon={p.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                onSelect={() => setArchived(p.id, !p.archived)}
              >
                {p.archived ? "Restore from archive" : "Archive"}
              </MenuItem>
              <MenuItem icon={<Trash2 size={14} />} danger onSelect={onDelete}>
                Delete…
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
        {p.synopsis && <p className="serif mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{p.synopsis}</p>}
        <div className="mt-auto pt-3">
          {pct !== null && (
            <div className="mb-2 h-[3px] w-full overflow-hidden rounded bg-line" aria-label={`${pct}% of goal`}>
              <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {formatCount(words)} words · {chapters} ch.
            </span>
            <span>{relativeTime(p.updatedAt)}</span>
          </div>
          <Link
            href={`/projects/${p.id}/write${p.lastDocId ? `?doc=${p.lastDocId}` : ""}`}
            className="mt-2 inline-block text-xs text-accent-ink underline-offset-2 hover:underline"
          >
            Continue writing →
          </Link>
        </div>
      </div>
    </article>
  );
}
