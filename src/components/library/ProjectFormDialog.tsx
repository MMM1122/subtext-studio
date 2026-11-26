"use client";
import { useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { imageToCoverDataURL } from "@/lib/export/download";
import { toast } from "@/stores/ui";
import type { Project } from "@/types";

export type ProjectFormValues = Pick<Project, "title" | "author" | "genre" | "synopsis" | "cover" | "wordGoal">;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<ProjectFormValues>;
  onSubmit: (v: ProjectFormValues) => Promise<void> | void;
  mode: "create" | "edit";
}

/** Remounts the form each time it opens so it always starts from `initial`. */
export function ProjectFormDialog(props: Props) {
  if (!props.open) return null;
  return <ProjectForm {...props} />;
}

function ProjectForm({ open, onOpenChange, initial, onSubmit, mode }: Props) {
  const [v, setV] = useState<ProjectFormValues>(() => ({
    title: initial?.title ?? "",
    author: initial?.author ?? "",
    genre: initial?.genre ?? "",
    synopsis: initial?.synopsis ?? "",
    cover: initial?.cover ?? null,
    wordGoal: initial?.wordGoal ?? null,
  }));
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof ProjectFormValues>(k: K, val: ProjectFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "New novel project" : "Project details"}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={busy || !v.title.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await onSubmit({ ...v, title: v.title.trim() });
                onOpenChange(false);
              } catch (e) {
                toast(e instanceof Error ? e.message : "Could not save project", "error");
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "create" ? "Create project" : "Save"}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-[1fr_140px]"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="space-y-3">
          <Field label="Title">
            <Input autoFocus value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="书名 / Title" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Author">
              <Input value={v.author} onChange={(e) => set("author", e.target.value)} />
            </Field>
            <Field label="Genre">
              <Input value={v.genre} onChange={(e) => set("genre", e.target.value)} />
            </Field>
          </div>
          <Field label="Synopsis">
            <Textarea rows={4} value={v.synopsis} onChange={(e) => set("synopsis", e.target.value)} />
          </Field>
          <Field label="Manuscript goal (words / 字)">
            <Input
              type="number"
              min={0}
              value={v.wordGoal ?? ""}
              onChange={(e) => set("wordGoal", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
              placeholder="e.g. 80000"
            />
          </Field>
        </div>
        <div>
          <Field label="Cover (optional)">
            <div className="flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded border border-dashed border-line bg-surface">
              {v.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.cover} alt="Cover preview" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="text-muted" size={22} />
              )}
            </div>
            <div className="mt-2 flex gap-1">
              <label className="inline-flex h-7 flex-1 cursor-pointer items-center justify-center rounded-md border border-line text-xs hover:bg-surface">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      set("cover", await imageToCoverDataURL(f));
                    } catch {
                      toast("Could not read that image.", "error");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {v.cover && (
                <Button size="icon-sm" variant="ghost" onClick={() => set("cover", null)} aria-label="Remove cover">
                  <Trash2 size={13} />
                </Button>
              )}
            </div>
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
