import {
  Document as DocxDocument,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

export type TipTapNode = {
  type?: string;
  text?: string;
  marks?: Array<{ type: string }>;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
};

function textRuns(node: TipTapNode): TextRun[] {
  if (node.type === "text") {
    const marks = new Set((node.marks ?? []).map((m) => m.type));
    return [
      new TextRun({
        text: node.text ?? "",
        bold: marks.has("bold"),
        italics: marks.has("italic"),
        strike: marks.has("strike"),
      }),
    ];
  }
  return (node.content ?? []).flatMap(textRuns);
}

function nodeToParagraphs(node: TipTapNode): Paragraph[] {
  switch (node.type) {
    case "heading": {
      const level = Number(node.attrs?.level ?? 1);
      const heading =
        level === 1
          ? HeadingLevel.HEADING_1
          : level === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;
      return [
        new Paragraph({
          heading,
          children: textRuns(node),
        }),
      ];
    }
    case "paragraph":
      return [
        new Paragraph({
          children: textRuns(node).length
            ? textRuns(node)
            : [new TextRun("")],
        }),
      ];
    case "bulletList":
      return (node.content ?? []).flatMap((item) =>
        (item.content ?? []).map(
          (child) =>
            new Paragraph({
              bullet: { level: 0 },
              children: textRuns(child).length
                ? textRuns(child)
                : [new TextRun("")],
            }),
        ),
      );
    case "orderedList":
      return (node.content ?? []).flatMap((item, index) =>
        (item.content ?? []).map(
          (child) =>
            new Paragraph({
              children: [
                new TextRun(`${index + 1}. `),
                ...(textRuns(child).length
                  ? textRuns(child)
                  : [new TextRun("")]),
              ],
            }),
        ),
      );
    case "blockquote":
      return (node.content ?? []).flatMap(nodeToParagraphs);
    case "doc":
      return (node.content ?? []).flatMap(nodeToParagraphs);
    default:
      if (node.content) {
        return node.content.flatMap(nodeToParagraphs);
      }
      return [];
  }
}

export function tipTapToDocxParagraphs(doc: TipTapNode): Paragraph[] {
  const root = doc.type === "doc" ? doc : { type: "doc", content: [doc] };
  const paragraphs = nodeToParagraphs(root);
  return paragraphs.length > 0
    ? paragraphs
    : [new Paragraph({ children: [new TextRun("")] })];
}

export async function tipTapJsonToDocxBuffer(
  title: string,
  content: TipTapNode,
): Promise<Buffer> {
  const doc = new DocxDocument({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            children: [new TextRun(title)],
          }),
          ...tipTapToDocxParagraphs(content),
        ],
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

export function tipTapToHtml(title: string, content: TipTapNode): string {
  const render = (node: TipTapNode): string => {
    if (node.type === "text") {
      let text = escapeHtml(node.text ?? "");
      const marks = new Set((node.marks ?? []).map((m) => m.type));
      if (marks.has("bold")) text = `<strong>${text}</strong>`;
      if (marks.has("italic")) text = `<em>${text}</em>`;
      if (marks.has("strike")) text = `<s>${text}</s>`;
      return text;
    }
    const children = (node.content ?? []).map(render).join("");
    switch (node.type) {
      case "doc":
        return children;
      case "paragraph":
        return `<p>${children || "<br/>"}</p>`;
      case "heading": {
        const level = Number(node.attrs?.level ?? 1);
        return `<h${level}>${children}</h${level}>`;
      }
      case "bulletList":
        return `<ul>${children}</ul>`;
      case "orderedList":
        return `<ol>${children}</ol>`;
      case "listItem":
        return `<li>${children}</li>`;
      case "blockquote":
        return `<blockquote>${children}</blockquote>`;
      case "hardBreak":
        return "<br/>";
      default:
        return children;
    }
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; color: #111; }
    h1,h2,h3 { font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${render(content)}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
