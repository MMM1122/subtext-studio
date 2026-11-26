import { describe, expect, it } from "vitest";
import { countText } from "@/lib/utils/text";
import { docFromParagraphs, docToMarkdown, docToPlainText } from "@/lib/utils/rich";

describe("countText", () => {
  it("counts Chinese characters individually", () => {
    expect(countText("雾是从海上来的").cjk).toBe(7);
  });
  it("counts English words", () => {
    expect(countText("The archive smelled of brass polish.").words).toBe(6);
  });
  it("handles mixed text and punctuation", () => {
    const c = countText("林雯说：“Hello, it's 4:17.”");
    expect(c.cjk).toBe(3);
    expect(c.words).toBe(4); // Hello, it's, 4, 17
    expect(c.total).toBe(7);
  });
  it("is zero for empty text", () => {
    expect(countText("").total).toBe(0);
  });
});

describe("rich doc conversion", () => {
  const doc = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Plain " },
          { type: "text", text: "bold", marks: [{ type: "bold" }] },
          { type: "text", text: " and " },
          { type: "text", text: "italic", marks: [{ type: "italic" }] },
        ],
      },
      { type: "horizontalRule" },
      { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "quoted" }] }] },
    ],
  };
  it("renders markdown", () => {
    const md = docToMarkdown(doc);
    expect(md).toContain("# Title");
    expect(md).toContain("Plain **bold** and *italic*");
    expect(md).toContain("* * *");
    expect(md).toContain("> quoted");
  });
  it("renders plain text", () => {
    expect(docToPlainText(doc)).toBe("Title\n\nPlain bold and italic\n\n* * *\n\nquoted");
  });
  it("builds docs from paragraphs", () => {
    const d = docFromParagraphs(["a", "", "***", "b"]);
    expect(d.content?.map((n) => n.type)).toEqual(["paragraph", "horizontalRule", "paragraph"]);
  });
});
