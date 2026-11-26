"use client";
import { create } from "zustand";
import type { Editor } from "@tiptap/react";
import type { DocRef } from "@/types";

/** Shares the active editor instance with the inspector (snapshots, AI). */
interface EditorBridge {
  editor: Editor | null;
  docRef: DocRef | null;
  /** Force-save any pending changes immediately. */
  flush: (() => Promise<void>) | null;
  set: (p: Partial<Pick<EditorBridge, "editor" | "docRef" | "flush">>) => void;
}

export const useEditorBridge = create<EditorBridge>()((set) => ({
  editor: null,
  docRef: null,
  flush: null,
  set: (p) => set(p),
}));
