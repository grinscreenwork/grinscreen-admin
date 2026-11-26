"use client";

import { useId, useState, useTransition } from "react";
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
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/cn";

export type SortableEntry = { id: string; label: string; content: React.ReactNode };
type Result = { ok: true } | { ok: false; error: string };

function Row({ entry }: { entry: SortableEntry }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex items-stretch rounded-xl border border-border bg-surface",
        isDragging && "z-20 border-brand-bright/60 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.9)]",
      )}
    >
      {/* Only the handle starts a drag, so buttons and links inside the row keep working. */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${entry.label}. Press space, then use the arrow keys to move it, and space again to drop it.`}
        className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-xl text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg active:cursor-grabbing sm:w-11"
      >
        <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
          <circle cx="4" cy="3" r="1.5" />
          <circle cx="10" cy="3" r="1.5" />
          <circle cx="4" cy="9" r="1.5" />
          <circle cx="10" cy="9" r="1.5" />
          <circle cx="4" cy="15" r="1.5" />
          <circle cx="10" cy="15" r="1.5" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">{entry.content}</div>
    </li>
  );
}

/**
 * A list you can reorder by dragging (mouse, touch or keyboard). The first row is first on the website.
 * The new order is saved as soon as you drop.
 */
export function SortableList({
  items,
  onReorder,
  hint = "Drag a row by its handle to reorder. The first one shows first on the website.",
}: {
  items: SortableEntry[];
  onReorder: (ids: string[]) => Promise<Result>;
  hint?: string;
}) {
  const incomingKey = items.map((i) => i.id).join("|");
  const [seenKey, setSeenKey] = useState(incomingKey);
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const [status, setStatus] = useState<{ kind: "saving" | "saved" | "error"; text: string } | null>(null);
  const [, start] = useTransition();
  const dndId = useId(); // stable between server and browser (dnd-kit's own counter is not, which causes a hydration mismatch)

  // A reel/poster was added or deleted elsewhere: follow the server's list.
  if (seenKey !== incomingKey) {
    setSeenKey(incomingKey);
    setOrder(items.map((i) => i.id));
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered = order.map((id) => byId.get(id)).filter((e): e is SortableEntry => !!e);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const previous = order;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setOrder(next); // show the result immediately
    setStatus({ kind: "saving", text: "Saving order…" });
    start(async () => {
      const res = await onReorder(next);
      if (res.ok) setStatus({ kind: "saved", text: "Order saved. The website will show it in this order." });
      else {
        setOrder(previous);
        setStatus({ kind: "error", text: res.error });
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        <p className="text-fg-muted">{hint}</p>
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "min-h-4",
            status?.kind === "error" ? "text-danger" : status?.kind === "saved" ? "text-brand-bright" : "text-fg-muted",
          )}
        >
          {status?.text}
        </p>
      </div>
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
            {ordered.map((entry) => (
              <Row key={entry.id} entry={entry} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}
