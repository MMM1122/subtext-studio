import type { RichDoc } from "@/types";

export const EMPTY_DOC: RichDoc = { type: "doc", content: [{ type: "paragraph" }] };

/** Build a document from plain paragraphs (blank-line or newline separated). */
export function docFromParagraphs(paragraphs: string[]): RichDoc {
  const content = paragraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) =>
      p === "***" || p === "⁂"
        ? { type: "horizontalRule" }
        : { type: "paragraph", content: [{ type: "text", text: p }] },
    );
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

export function docFromPlainText(text: string): RichDoc {
  return docFromParagraphs(text.split(/\r?\n/));
}

function inlineText(node: RichDoc): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(inlineText).join("");
}

/** Plain text with blank lines between blocks. */
export function docToPlainText(doc: RichDoc | null | undefined): string {
  if (!doc) return "";
  const out: string[] = [];
  const walk = (node: RichDoc, depth = 0) => {
    switch (node.type) {
      case "doc":
        (node.content ?? []).forEach((c) => walk(c, depth));
        return;
      case "paragraph":
      case "heading":
        out.push(inlineText(node));
        return;
      case "blockquote":
        (node.content ?? []).forEach((c) => walk(c, depth));
        return;
      case "bulletList":
      case "orderedList":
        (node.content ?? []).forEach((li, i) => {
          const marker = node.type === "orderedList" ? `${i + 1}. ` : "• ";
          const text = (li.content ?? []).map(inlineText).join(" ");
          out.push("  ".repeat(depth) + marker + text);
        });
        return;
      case "horizontalRule":
        out.push("* * *");
        return;
      case "codeBlock":
        out.push(inlineText(node));
        return;
      default:
        out.push(inlineText(node));
    }
  };
  walk(doc);
  return out
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeMd(text: string): string {
  return text.replace(/([\\`*_[\]])/g, "\\$1");
}

function inlineMarkdown(node: RichDoc): string {
  if (node.type === "hardBreak") return "  \n";
  if (node.type === "text") {
    let t = escapeMd(node.text ?? "");
    const marks = node.marks ?? [];
    if (!t.trim()) return t;
    for (const m of marks) {
      if (m.type === "bold") t = `**${t}**`;
      else if (m.type === "italic") t = `*${t}*`;
      else if (m.type === "strike") t = `~~${t}~~`;
      else if (m.type === "code") t = "`" + (node.text ?? "") + "`";
    }
    return t;
  }
  return (node.content ?? []).map(inlineMarkdown).join("");
}

export function docToMarkdown(doc: RichDoc | null | undefined, headingOffset = 0): string {
  if (!doc) return "";
  const blocks: string[] = [];
  const walk = (node: RichDoc, prefix = "") => {
    switch (node.type) {
      case "doc":
        (node.content ?? []).forEach((c) => walk(c, prefix));
        return;
      case "paragraph":
        blocks.push(prefix + inlineMarkdown(node));
        return;
      case "heading": {
        const level = Math.min(6, Number(node.attrs?.level ?? 1) + headingOffset);
        blocks.push(prefix + "#".repeat(level) + " " + inlineMarkdown(node));
        return;
      }
      case "blockquote":
        (node.content ?? []).forEach((c) => walk(c, prefix + "> "));
        return;
      case "bulletList":
      case "orderedList":
        blocks.push(
          (node.content ?? [])
            .map((li, i) => {
              const marker = node.type === "orderedList" ? `${i + 1}.` : "-";
              return prefix + marker + " " + (li.content ?? []).map(inlineMarkdown).join(" ");
            })
            .join("\n"),
        );
        return;
      case "horizontalRule":
        blocks.push(prefix + "* * *");
        return;
      case "codeBlock":
        blocks.push("```\n" + (node.content ?? []).map((c) => c.text ?? "").join("") + "\n```");
        return;
      default:
        blocks.push(prefix + inlineMarkdown(node));
    }
  };
  walk(doc);
  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function isRichDoc(value: unknown): value is RichDoc {
  return !!value && typeof value === "object" && typeof (value as RichDoc).type === "string";
}
