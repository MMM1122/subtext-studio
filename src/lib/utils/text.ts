import { twMerge } from "tailwind-merge";

/**
 * Mixed Chinese / English counting.
 * - Each CJK ideograph (and kana / hangul syllable) counts as one unit.
 * - Latin-script words (letters, digits, apostrophes, hyphens) count as one unit each.
 * total = cjk + words, which is what writers in mixed-language projects usually expect.
 */
const CJK_RE = /[㐀-䶿一-鿿豈-﫿぀-ヿ가-힯\u{20000}-\u{2fa1f}]/gu;
const WORD_RE = /[A-Za-z0-9À-ɏ]+(?:['’\-][A-Za-z0-9À-ɏ]+)*/g;

export interface TextCounts {
  cjk: number;
  words: number;
  total: number;
  characters: number;
}

export function countText(text: string): TextCounts {
  if (!text) return { cjk: 0, words: 0, total: 0, characters: 0 };
  const cjk = text.match(CJK_RE)?.length ?? 0;
  const latinOnly = text.replace(CJK_RE, " ");
  const words = latinOnly.match(WORD_RE)?.length ?? 0;
  const characters = text.replace(/\s/g, "").length;
  return { cjk, words, total: cjk + words, characters };
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** Join class names; later Tailwind utilities override conflicting earlier ones. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return twMerge(parts.filter(Boolean).join(" "));
}

export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

export function relativeTime(ts: number, nowTs: number = Date.now()): string {
  const diff = Math.max(0, nowTs - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(ts).toLocaleDateString();
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}

export function parseTags(s: string): string[] {
  return Array.from(
    new Set(
      s
        .split(/[,，#\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}
