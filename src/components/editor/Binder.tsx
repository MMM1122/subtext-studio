"use client";
import { useEffect, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Copy, FilePlus, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { Chapter, ChapterStatus, DocRef, ID, Scene } from "@/types";
import {
  addChapter,
  addScene,
  chapterDependencies,
  deleteChapter,
  deleteScene,
  duplicateChapter,
  reorderChapters,
  reorderScenes,
  updateChapter,
  updateScene,
  type ChapterDependencies,
} from "@/lib/repositories/manuscript";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { cn, formatCount } from "@/lib/utils/text";
import { toast } from "@/stores/ui";

export const STATUS_COLOR: Record<ChapterStatus, string> = {
  draft: "var(--c-stone)",
  revising: "var(--c-sand)",
  complete: "var(--c-sage)",
};
export const STATUS_LABEL: Record<ChapterStatus, string> = { draft: "Draft", revising: "Revising", complete: "Complete" };

function useSyncedOrder<T extends { id: ID }>(items: T[]) {
  const [ids, setIds] = useState(items.map((i) => i.id));
  const key = items.map((i) => i.id).join(",");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- keep optimistic order in sync with persisted data
  useEffect(() => setIds(key ? key.split(",") : []), [key]);
  return [ids, setIds] as const;
}

export function Binder({
  projectId,
  chapters,
  scenes,
  selected,
  onSelect,
}: {
  projectId: ID;
  chapters: Chapter[];
  scenes: Scene[];
  selected: DocRef | null;
  onSelect: (ref: DocRef) => void;
}) {
  const [order, setOrder] = useSyncedOrder(chapters);
  const [expanded, setExpanded] = useState<Set<ID>>(() => new Set(selected?.kind === "scene" ? [scenes.find((s) => s.id === selected.id)?.chapterId ?? ""] : []));
  const [renaming, setRenaming] = useState<ID | null>(null);
  const [toDelete, setToDelete] = useState<{ kind: "chapter" | "scene"; id: ID; title: string; deps?: ChapterDependencies } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(chapters.map((c) => [c.id, c]));

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(order, order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id)));
    setOrder(next);
    await reorderChapters(projectId, next);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Manuscript</span>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Add chapter"
          title="Add chapter"
          onClick={async () => {
            const c = await addChapter(projectId);
            onSelect({ kind: "chapter", id: c.id });
            setRenaming(c.id);
          }}
        >
          <Plus size={15} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ul aria-label="Chapters">
              {order.map((id, i) => {
                const ch = byId.get(id);
                if (!ch) return null;
                const chScenes = scenes.filter((s) => s.chapterId === id);
                return (
                  <ChapterRow
                    key={id}
                    index={i}
                    chapter={ch}
                    scenes={chScenes}
                    expanded={expanded.has(id)}
                    selected={selected}
                    renaming={renaming}
                    setRenaming={setRenaming}
                    onToggle={() =>
                      setExpanded((s) => {
                        const n = new Set(s);
                        if (n.has(id)) n.delete(id);
                        else n.add(id);
                        return n;
                      })
                    }
                    onSelect={onSelect}
                    onAddScene={async () => {
                      const sc = await addScene(id);
                      if (sc) {
                        setExpanded((s) => new Set(s).add(id));
                        onSelect({ kind: "scene", id: sc.id });
                        setRenaming(sc.id);
                      }
                    }}
                    onDuplicate={async () => {
                      const c = await duplicateChapter(id);
                      if (c) toast(`Duplicated “${ch.title}”.`);
                    }}
                    onDelete={async () => setToDelete({ kind: "chapter", id, title: ch.title, deps: await chapterDependencies(id) })}
                    onDeleteScene={(s) => setToDelete({ kind: "scene", id: s.id, title: s.title })}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
        {chapters.length === 0 && <p className="px-4 py-6 text-sm text-muted">No chapters yet. Use + to add one.</p>}
      </div>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.kind}?`}
        danger
        confirmLabel="Delete"
        description={<>“{toDelete?.title}” will be permanently deleted from this browser.</>}
        onConfirm={async () => {
          if (!toDelete) return;
          const wasSelected = selected?.id === toDelete.id;
          if (toDelete.kind === "chapter") await deleteChapter(toDelete.id);
          else await deleteScene(toDelete.id);
          if (wasSelected) {
            const first = chapters.find((c) => c.id !== toDelete.id);
            if (first) onSelect({ kind: "chapter", id: first.id });
          }
          toast(`${toDelete.kind === "chapter" ? "Chapter" : "Scene"} deleted.`);
        }}
      >
        {toDelete?.deps && (
          <ul className="space-y-1 text-sm text-muted">
            {toDelete.deps.scenes > 0 && <li>· {toDelete.deps.scenes} scene(s) inside it will be deleted</li>}
            {toDelete.deps.snapshots > 0 && <li>· {toDelete.deps.snapshots} version snapshot(s) will be deleted</li>}
            {toDelete.deps.knowledge > 0 && <li>· {toDelete.deps.knowledge} knowledge record(s) anchored to it will be deleted</li>}
            {toDelete.deps.states > 0 && <li>· {toDelete.deps.states} character state snapshot(s) will be deleted</li>}
            {toDelete.deps.metrics > 0 && <li>· its reader-experience estimates will be deleted</li>}
            {toDelete.deps.actions > 0 && <li>· {toDelete.deps.actions} recorded action(s) will be deleted</li>}
            <li>· Timeline events, notes and foreshadowing linked to it are kept but unlinked</li>
          </ul>
        )}
      </ConfirmDialog>
    </div>
  );
}

function InlineRename({ value, onDone }: { value: string; onDone: (v: string | null) => void }) {
  const [v, setV] = useState(value);
  return (
    <input
      autoFocus
      className="h-7 w-full rounded border border-accent bg-bg px-1.5 text-sm focus:outline-none"
      value={v}
      aria-label="Rename"
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onDone(v.trim() || null)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) onDone(v.trim() || null);
        if (e.key === "Escape") onDone(null);
      }}
    />
  );
}

function ChapterRow({
  chapter,
  index,
  scenes,
  expanded,
  selected,
  renaming,
  setRenaming,
  onToggle,
  onSelect,
  onAddScene,
  onDuplicate,
  onDelete,
  onDeleteScene,
}: {
  chapter: Chapter;
  index: number;
  scenes: Scene[];
  expanded: boolean;
  selected: DocRef | null;
  renaming: ID | null;
  setRenaming: (id: ID | null) => void;
  onToggle: () => void;
  onSelect: (r: DocRef) => void;
  onAddScene: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDeleteScene: (s: Scene) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({ id: chapter.id });
  const active = selected?.kind === "chapter" && selected.id === chapter.id;
  const words = chapter.wordCount + scenes.reduce((s, x) => s + x.wordCount, 0);
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-80")}
    >
      <div className={cn("group flex items-center gap-1 px-1.5", active ? "bg-surface-2" : "hover:bg-surface")}>
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${chapter.title}`}
          className="flex h-8 w-5 cursor-grab items-center justify-center text-muted/50 hover:text-muted active:cursor-grabbing"
        >
          <GripVertical size={13} />
        </button>
        <button onClick={onToggle} aria-label={expanded ? "Collapse scenes" : "Expand scenes"} aria-expanded={expanded} className="flex h-8 w-4 items-center text-muted">
          {scenes.length > 0 ? expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} /> : <span className="w-[13px]" />}
        </button>
        {renaming === chapter.id ? (
          <InlineRename
            value={chapter.title}
            onDone={(v) => {
              if (v) void updateChapter(chapter.id, { title: v });
              setRenaming(null);
            }}
          />
        ) : (
          <button
            onClick={() => onSelect({ kind: "chapter", id: chapter.id })}
            onDoubleClick={() => setRenaming(chapter.id)}
            aria-current={active ? "true" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
          >
            <span className="w-4 shrink-0 text-right text-[11px] tabular-nums text-muted">{index + 1}</span>
            <span className={cn("serif truncate text-[14px]", active ? "text-ink" : "text-ink/85")}>{chapter.title}</span>
          </button>
        )}
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[chapter.status] }} title={STATUS_LABEL[chapter.status]} />
        <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-muted">{words ? formatCount(words) : ""}</span>
        <Menu>
          <MenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" className="opacity-60 group-hover:opacity-100 focus:opacity-100" aria-label={`Actions for ${chapter.title}`}>
              <MoreHorizontal size={14} />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem icon={<Pencil size={14} />} onSelect={() => setRenaming(chapter.id)}>
              Rename
            </MenuItem>
            <MenuItem icon={<FilePlus size={14} />} onSelect={onAddScene}>
              Add scene
            </MenuItem>
            <MenuItem icon={<Copy size={14} />} onSelect={onDuplicate}>
              Duplicate
            </MenuItem>
            <MenuSeparator />
            {(Object.keys(STATUS_LABEL) as ChapterStatus[]).map((s) => (
              <MenuItem key={s} onSelect={() => updateChapter(chapter.id, { status: s })} icon={<span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[s] }} />}>
                {STATUS_LABEL[s]}
                {chapter.status === s ? " ✓" : ""}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem icon={<Trash2 size={14} />} danger onSelect={onDelete}>
              Delete…
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      {expanded && scenes.length > 0 && (
        <SceneList scenes={scenes} chapterId={chapter.id} selected={selected} onSelect={onSelect} renaming={renaming} setRenaming={setRenaming} onDelete={onDeleteScene} />
      )}
    </li>
  );
}

function SceneList({
  scenes,
  chapterId,
  selected,
  onSelect,
  renaming,
  setRenaming,
  onDelete,
}: {
  scenes: Scene[];
  chapterId: ID;
  selected: DocRef | null;
  onSelect: (r: DocRef) => void;
  renaming: ID | null;
  setRenaming: (id: ID | null) => void;
  onDelete: (s: Scene) => void;
}) {
  const [order, setOrder] = useSyncedOrder(scenes);
  const byId = new Map(scenes.map((s) => [s.id, s]));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={async (e) => {
        if (!e.over || e.active.id === e.over.id) return;
        const next = arrayMove(order, order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id)));
        setOrder(next);
        await reorderScenes(chapterId, next);
      }}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul aria-label="Scenes">
          {order.map((id) => {
            const s = byId.get(id);
            return s ? <SceneRow key={id} scene={s} selected={selected} onSelect={onSelect} renaming={renaming} setRenaming={setRenaming} onDelete={onDelete} /> : null;
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SceneRow({
  scene,
  selected,
  onSelect,
  renaming,
  setRenaming,
  onDelete,
}: {
  scene: Scene;
  selected: DocRef | null;
  onSelect: (r: DocRef) => void;
  renaming: ID | null;
  setRenaming: (id: ID | null) => void;
  onDelete: (s: Scene) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, setActivatorNodeRef } = useSortable({ id: scene.id });
  const active = selected?.kind === "scene" && selected.id === scene.id;
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }}>
      <div className={cn("group flex items-center gap-1 pl-8 pr-1.5", active ? "bg-surface-2" : "hover:bg-surface")}>
        <button ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={`Reorder ${scene.title}`} className="flex h-7 w-4 cursor-grab items-center text-muted/40 hover:text-muted">
          <GripVertical size={12} />
        </button>
        {renaming === scene.id ? (
          <InlineRename
            value={scene.title}
            onDone={(v) => {
              if (v) void updateScene(scene.id, { title: v });
              setRenaming(null);
            }}
          />
        ) : (
          <button
            onClick={() => onSelect({ kind: "scene", id: scene.id })}
            onDoubleClick={() => setRenaming(scene.id)}
            className="min-w-0 flex-1 truncate py-1 text-left text-[13px] text-muted hover:text-ink"
          >
            <span className={active ? "text-ink" : undefined}>{scene.title}</span>
          </button>
        )}
        <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-muted">{scene.wordCount ? formatCount(scene.wordCount) : ""}</span>
        <Menu>
          <MenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" className="opacity-50 group-hover:opacity-100 focus:opacity-100" aria-label={`Actions for ${scene.title}`}>
              <MoreHorizontal size={13} />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem icon={<Pencil size={14} />} onSelect={() => setRenaming(scene.id)}>
              Rename
            </MenuItem>
            <MenuItem icon={<Trash2 size={14} />} danger onSelect={() => onDelete(scene)}>
              Delete…
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </li>
  );
}
