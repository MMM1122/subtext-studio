"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

interface UIState {
  sidebarCollapsed: boolean;
  inspectorOpen: boolean;
  binderOpen: boolean;
  focusMode: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  toggleSidebar: () => void;
  toggleInspector: () => void;
  setInspector: (open: boolean) => void;
  toggleBinder: () => void;
  setFocusMode: (on: boolean) => void;
  setSaveStatus: (s: SaveStatus) => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      inspectorOpen: true,
      binderOpen: true,
      focusMode: false,
      saveStatus: "idle",
      lastSavedAt: null,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
      setInspector: (open) => set({ inspectorOpen: open }),
      toggleBinder: () => set((s) => ({ binderOpen: !s.binderOpen })),
      setFocusMode: (on) => set({ focusMode: on }),
      setSaveStatus: (saveStatus) => set(saveStatus === "saved" ? { saveStatus, lastSavedAt: Date.now() } : { saveStatus }),
    }),
    {
      name: "subtext-ui",
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed, inspectorOpen: s.inspectorOpen, binderOpen: s.binderOpen }),
    },
  ),
);

interface Toast {
  id: number;
  message: string;
  tone: "info" | "error" | "success";
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
}

let toastId = 0;
export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (message, tone = "info") => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, message, tone }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), tone === "error" ? 7000 : 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string, tone?: Toast["tone"]) => useToasts.getState().push(message, tone);
