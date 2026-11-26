"use client";
import { useMemo } from "react";
import type { Chapter, ID } from "@/types";

export function useChapterIndex(chapters: Chapter[] | undefined) {
  return useMemo(() => new Map<ID, number>((chapters ?? []).map((c, i) => [c.id, i])), [chapters]);
}
