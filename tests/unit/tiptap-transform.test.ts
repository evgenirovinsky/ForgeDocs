import { describe, expect, it } from "vitest";
import {
  tipTapJsonToDocxBuffer,
  tipTapToDocxParagraphs,
  tipTapToHtml,
  type TipTapNode,
} from "@/server/export/tiptap-transform";

const sample: TipTapNode = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Hello" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Bold ", marks: [{ type: "bold" }] },
        { type: "text", text: "world" },
      ],
    },
  ],
};

describe("tiptap transform", () => {
  it("builds docx paragraphs from tip tap json", () => {
    const paragraphs = tipTapToDocxParagraphs(sample);
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
  });

  it("renders html for pdf pipeline", () => {
    const html = tipTapToHtml("Title", sample);
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<strong>Bold </strong>");
    expect(html).toContain("Title");
  });

  it("produces a non-empty docx buffer", async () => {
    const buffer = await tipTapJsonToDocxBuffer("Handbook", sample);
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
