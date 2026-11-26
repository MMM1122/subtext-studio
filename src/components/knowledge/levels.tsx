"use client";
import type { KnowledgeLevel } from "@/types";
import { LEVEL_LABEL, LEVEL_LABEL_ZH } from "@/features/knowledge/logic";
import { cn } from "@/lib/utils/text";

export const LEVEL_COLOR: Record<KnowledgeLevel, string> = {
  unknown: "var(--line)",
  known: "var(--c-sage)",
  suspected: "var(--c-sand)",
  misunderstood: "var(--c-clay)",
};

/** Shape + colour + text, so state is never conveyed by colour alone. */
export function LevelGlyph({ level, size = 12 }: { level: KnowledgeLevel; size?: number }) {
  const c = LEVEL_COLOR[level];
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      {level === "known" && <circle cx={r} cy={r} r={r - 1} fill={c} />}
      {level === "suspected" && (
        <>
          <circle cx={r} cy={r} r={r - 1.5} fill="none" stroke={c} strokeWidth={1.5} />
          <path d={`M${r} 1.5 A ${r - 1.5} ${r - 1.5} 0 0 1 ${r} ${size - 1.5} Z`} fill={c} />
        </>
      )}
      {level === "misunderstood" && (
        <>
          <circle cx={r} cy={r} r={r - 1.5} fill="none" stroke={c} strokeWidth={1.5} />
          <path d={`M${r * 0.55} ${r * 0.55} L${size - r * 0.55} ${size - r * 0.55} M${size - r * 0.55} ${r * 0.55} L${r * 0.55} ${size - r * 0.55}`} stroke={c} strokeWidth={1.5} />
        </>
      )}
      {level === "unknown" && <circle cx={r} cy={r} r={r - 1.5} fill="none" stroke="var(--muted)" strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray="2 2" />}
    </svg>
  );
}

export function LevelLabel({ level, className, zh = true }: { level: KnowledgeLevel; className?: string; zh?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <LevelGlyph level={level} />
      <span>{LEVEL_LABEL[level]}</span>
      {zh && <span className="text-muted">{LEVEL_LABEL_ZH[level]}</span>}
    </span>
  );
}
