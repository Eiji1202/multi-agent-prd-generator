import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { saveAs } from "file-saver";

/**
 * Markdown文字列を .md ファイルとしてダウンロード
 */
export function downloadMarkdown(content: string, filename = "prd.md") {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, filename);
}

/**
 * ブラウザのPDF保存ダイアログを開く
 */
export function downloadPdf() {
  window.print();
}

/**
 * MarkdownをパースしてWord (.docx) ファイルを生成・ダウンロード
 */
export async function downloadDocx(content: string, filename = "prd.docx") {
  const paragraphs = parseMarkdownToDocx(content);

  const doc = new Document({
    sections: [
      {
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

function parseMarkdownToDocx(markdown: string): Paragraph[] {
  const lines = markdown.split("\n");
  const paragraphs: Paragraph[] = [];

  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // 空行
    if (!trimmed) {
      if (inList) inList = false;
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    // 見出し
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const headingLevel =
        level === 1 ? HeadingLevel.HEADING_1 :
        level === 2 ? HeadingLevel.HEADING_2 :
        HeadingLevel.HEADING_3;

      paragraphs.push(
        new Paragraph({
          text,
          heading: headingLevel,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }

    // リスト項目
    const listMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (listMatch) {
      inList = true;
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(listMatch[1])],
          bullet: { level: 0 },
        })
      );
      continue;
    }

    // 番号付きリスト
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (numberedMatch) {
      inList = true;
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(numberedMatch[1])],
          numbering: { reference: "default-numbering", level: 0 },
        })
      );
      continue;
    }

    // 通常のテキスト（太字をパース）
    paragraphs.push(
      new Paragraph({
        children: parseInlineFormatting(trimmed),
      })
    );
  }

  return paragraphs;
}

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // 太字の前のテキスト
    if (match.index > lastIndex) {
      runs.push(new TextRun(text.slice(lastIndex, match.index)));
    }
    // 太字テキスト
    runs.push(new TextRun({ text: match[1], bold: true }));
    lastIndex = regex.lastIndex;
  }

  // 残りのテキスト
  if (lastIndex < text.length) {
    runs.push(new TextRun(text.slice(lastIndex)));
  }

  if (runs.length === 0) {
    runs.push(new TextRun(text));
  }

  return runs;
}
