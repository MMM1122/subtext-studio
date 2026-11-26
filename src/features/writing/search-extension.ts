import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";

export interface SearchMatch {
  from: number;
  to: number;
}

export interface SearchState {
  term: string;
  caseSensitive: boolean;
  current: number;
  matches: SearchMatch[];
  decorations: DecorationSet;
}

export const searchKey = new PluginKey<SearchState>("subtext-search");

/** Find matches per textblock, so matches spanning bold/italic boundaries are found too. */
export function findMatches(doc: PMNode, term: string, caseSensitive: boolean): SearchMatch[] {
  const out: SearchMatch[] = [];
  if (!term) return out;
  const needle = caseSensitive ? term : term.toLocaleLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = "";
    const offsets: number[] = []; // offsets[i] = document position of text[i]
    node.forEach((child, childOffset) => {
      if (child.isText && child.text) {
        for (let i = 0; i < child.text.length; i++) offsets.push(pos + 1 + childOffset + i);
        text += child.text;
      } else {
        // Non-text inline (e.g. hard break) acts as a separator.
        offsets.push(-1);
        text += "\u0000";
      }
    });
    const hay = caseSensitive ? text : text.toLocaleLowerCase();
    let i = hay.indexOf(needle);
    while (i !== -1) {
      const from = offsets[i];
      const to = offsets[i + needle.length - 1];
      if (from >= 0 && to >= 0) out.push({ from, to: to + 1 });
      i = hay.indexOf(needle, i + Math.max(1, needle.length));
    }
    return false;
  });
  return out;
}

function build(doc: PMNode, term: string, caseSensitive: boolean, current: number): SearchState {
  const matches = findMatches(doc, term, caseSensitive);
  const cur = matches.length ? Math.min(Math.max(0, current), matches.length - 1) : 0;
  const decorations = DecorationSet.create(
    doc,
    matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === cur ? "search-hit-current" : "search-hit" })),
  );
  return { term, caseSensitive, current: cur, matches, decorations };
}

type Meta = Partial<Pick<SearchState, "term" | "caseSensitive" | "current">>;

export const SearchExtension = Extension.create({
  name: "subtextSearch",
  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: (_, state) => build(state.doc, "", false, 0),
          apply(tr: Transaction, prev: SearchState, _old: EditorState, next: EditorState) {
            const meta = tr.getMeta(searchKey) as Meta | undefined;
            if (meta) {
              return build(next.doc, meta.term ?? prev.term, meta.caseSensitive ?? prev.caseSensitive, meta.current ?? prev.current);
            }
            if (tr.docChanged && prev.term) return build(next.doc, prev.term, prev.caseSensitive, prev.current);
            return prev;
          },
        },
        props: {
          decorations(state) {
            return searchKey.getState(state)?.decorations;
          },
        },
      }),
    ];
  },
});
