"use client";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import {
  Activity,
  Download,
  FileText,
  Grid3x3,
  Library,
  Lightbulb,
  Maximize2,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  PenLine,
  Settings,
  Users,
  Waypoints,
} from "lucide-react";
import { useProject } from "@/hooks/data";
import { useUI } from "@/stores/ui";
import { cn } from "@/lib/utils/text";
import { Button } from "@/components/ui/button";
import { EmptyState, Loading } from "@/components/ui/misc";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { ThemeToggle } from "./ThemeToggle";
import { SaveIndicator } from "./SaveIndicator";
import { downloadBackup, downloadManuscript } from "@/features/projects/actions";
import type { Project } from "@/types";

const ProjectContext = createContext<Project | null>(null);

export function useCurrentProject(): Project {
  const p = useContext(ProjectContext);
  if (!p) throw new Error("useCurrentProject must be used inside ProjectShell");
  return p;
}

export const MODULES = [
  { slug: "write", label: "Writing Studio", short: "Write", icon: PenLine },
  { slug: "characters", label: "Character Lab", short: "Characters", icon: Users },
  { slug: "timeline", label: "Narrative Lab", short: "Narrative", icon: Waypoints },
  { slug: "knowledge", label: "Knowledge Matrix", short: "Knowledge", icon: Grid3x3 },
  { slug: "reader", label: "Reader Lab", short: "Reader", icon: Activity },
  { slug: "notes", label: "Idea Vault", short: "Ideas", icon: Lightbulb },
] as const;

export function ProjectShell({ children }: { children: ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, toggleInspector, inspectorOpen, focusMode, setFocusMode } = useUI();
  const current = MODULES.find((m) => pathname.includes(`/${m.slug}`));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
      } else if (mod && e.key === ".") {
        e.preventDefault();
        toggleInspector();
      } else if (mod && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        setFocusMode(!useUI.getState().focusMode);
      } else if (e.key === "Escape" && useUI.getState().focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar, toggleInspector, setFocusMode]);

  useEffect(() => {
    if (project?.title) document.title = `${current?.label ?? "Project"} · ${project.title}`;
  }, [project?.title, current?.label]);

  // On narrow screens the inspector is an overlay — start closed.
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) useUI.getState().setInspector(false);
  }, []);

  // Leave focus mode when navigating away.
  useEffect(() => {
    if (!pathname.includes("/write")) setFocusMode(false);
  }, [pathname, setFocusMode]);

  if (project === undefined) return <Loading label="Opening project…" />;
  if (project === null)
    return (
      <EmptyState
        title="Project not found"
        action={
          <Link href="/library" className="text-sm text-accent-ink underline">
            Back to the library
          </Link>
        }
      >
        It may have been deleted, or it lives in another browser. Projects are stored locally per browser.
      </EmptyState>
    );

  return (
    <ProjectContext.Provider value={project}>
      <div className="flex h-dvh flex-col overflow-hidden">
        {!focusMode && (
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-bg px-3">
            <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} aria-label="Toggle navigation (Ctrl+\)" title="Toggle navigation (Ctrl+\)">
              <PanelLeft size={16} />
            </Button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
              <Link href="/library" className="hidden text-muted hover:text-ink sm:inline">
                Library
              </Link>
              <span className="hidden text-line sm:inline">/</span>
              <span className="serif truncate text-ink">{project.title}</span>
              {current && (
                <>
                  <span className="text-line">/</span>
                  <span className="hidden truncate text-muted md:inline">{current.label}</span>
                </>
              )}
            </nav>
            <div className="ml-auto flex items-center gap-1">
              {current?.slug === "write" && <SaveIndicator />}
              {current?.slug === "write" && (
                <Button variant="ghost" size="icon-sm" onClick={() => setFocusMode(true)} aria-label="Focus mode (Ctrl+Shift+F)" title="Focus mode (Ctrl+Shift+F)">
                  <Maximize2 size={15} />
                </Button>
              )}
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Export">
                    <MoreHorizontal size={16} />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem icon={<Download size={14} />} onSelect={() => downloadBackup(project.id)}>
                    Export backup (.json)
                  </MenuItem>
                  <MenuItem icon={<FileText size={14} />} onSelect={() => downloadManuscript(project.id, "markdown")}>
                    Export manuscript (.md)
                  </MenuItem>
                  <MenuItem icon={<FileText size={14} />} onSelect={() => downloadManuscript(project.id, "text")}>
                    Export manuscript (.txt)
                  </MenuItem>
                </MenuContent>
              </Menu>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={toggleInspector}
                aria-pressed={inspectorOpen}
                aria-label="Toggle inspector (Ctrl+.)"
                title="Toggle inspector (Ctrl+.)"
              >
                <PanelRight size={16} />
              </Button>
            </div>
          </header>
        )}
        <div className="flex min-h-0 flex-1">
          {!focusMode && (
            <nav
              aria-label="Project modules"
              className={cn(
                "flex shrink-0 flex-col border-r border-line bg-surface/40 py-3 transition-[width]",
                sidebarCollapsed ? "w-[52px]" : "w-[52px] md:w-52",
              )}
            >
              <ul className="space-y-0.5 px-2">
                {MODULES.map((m) => {
                  const active = current?.slug === m.slug;
                  const Icon = m.icon;
                  return (
                    <li key={m.slug}>
                      <Link
                        href={`/projects/${project.id}/${m.slug}`}
                        aria-current={active ? "page" : undefined}
                        title={m.label}
                        className={cn(
                          "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors",
                          active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface hover:text-ink",
                        )}
                      >
                        <Icon size={16} className={active ? "text-accent-ink" : undefined} />
                        <span className={cn("truncate", sidebarCollapsed ? "sr-only" : "sr-only md:not-sr-only")}>{m.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <ul className="mt-auto space-y-0.5 border-t border-line px-2 pt-3">
                <li>
                  <Link href="/library" title="Library" className="flex h-9 items-center gap-3 rounded-md px-2.5 text-sm text-muted hover:bg-surface hover:text-ink">
                    <Library size={16} />
                    <span className={cn(sidebarCollapsed ? "sr-only" : "sr-only md:not-sr-only")}>Library</span>
                  </Link>
                </li>
                <li>
                  <Link href="/settings" title="Settings" className="flex h-9 items-center gap-3 rounded-md px-2.5 text-sm text-muted hover:bg-surface hover:text-ink">
                    <Settings size={16} />
                    <span className={cn(sidebarCollapsed ? "sr-only" : "sr-only md:not-sr-only")}>Settings</span>
                  </Link>
                </li>
              </ul>
            </nav>
          )}
          <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </ProjectContext.Provider>
  );
}

/** Right-hand contextual inspector, shared by all modules. */
export function Inspector({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  const { inspectorOpen, setInspector, focusMode } = useUI();
  if (!inspectorOpen || focusMode) return null;
  return (
    <aside
      aria-label={title}
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex w-[min(360px,92vw)] flex-col border-l border-line bg-bg shadow-xl lg:static lg:z-auto lg:w-80 lg:shadow-none",
        className,
      )}
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{title}</h2>
        <Button variant="ghost" size="icon-sm" onClick={() => setInspector(false)} aria-label="Close inspector">
          <PanelRight size={14} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}
