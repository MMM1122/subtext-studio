"use client";
import { useEffect, useState, type ReactNode } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "./modifiers";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils/text";
import type { ID } from "@/types";

export const ROW_H = 64;
export const ROW_GAP = 8;

/**
 * A vertically sortable list with its own DnD context, so reordering one
 * timeline never affects another.
 */
export function SortableColumn({
  ids,
  label,
  onReorder,
  renderItem,
}: {
  ids: ID[];
  label: string;
  onReorder: (ids: ID[]) => void | Promise<void>;
  renderItem: (id: ID, index: number) => ReactNode;
}) {
  const [order, setOrder] = useState(ids);
  const key = ids.join(",");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- keep optimistic order in sync with persisted data
  useEffect(() => setOrder(key ? key.split(",") : []), [key]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const next = arrayMove(order, order.indexOf(String(e.active.id)), order.indexOf(String(e.over.id)));
    setOrder(next);
    void onReorder(next);
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ol aria-label={label} className="flex flex-col" style={{ gap: ROW_GAP }}>
          {order.map((id, i) => (
            <SortableRow key={id} id={id}>
              {renderItem(id, i)}
            </SortableRow>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, children }: { id: ID; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, height: ROW_H }}
      className={cn("relative flex items-stretch", isDragging && "z-20 opacity-90 shadow-lg")}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="flex w-5 shrink-0 cursor-grab items-center justify-center text-muted/50 hover:text-muted active:cursor-grabbing"
      >
        <GripVertical size={13} />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}
