import {
  documentVersionSchema,
  MAX_DOCUMENT_BYTES,
  MAX_DOCUMENT_CHARACTERS,
  MAX_DOCUMENT_PAGES,
  type DocumentVersion,
  type SourceSpan,
} from "./domain";

function paragraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseText(
  text: string,
  title: string,
  id = crypto.randomUUID(),
): DocumentVersion {
  if (text.length > MAX_DOCUMENT_CHARACTERS)
    throw new Error(
      "Agreement exceeds 60,000 characters. Please use a shorter document.",
    );
  if (!text.trim()) throw new Error("Add agreement text before continuing.");
  const spans = paragraphs(text)
    .flatMap((paragraph) => paragraph.match(/[\s\S]{1,12000}/g) ?? [])
    .map((paragraph, index) => ({
      id: `${id}:p1:${index + 1}`,
      page: 1,
      paragraph: index + 1,
      text: paragraph,
    }));
  return documentVersionSchema.parse({ id, title, spans });
}

export async function extractPdf(file: File): Promise<DocumentVersion> {
  if (file.size > MAX_DOCUMENT_BYTES)
    throw new Error("PDF exceeds 3 MB. Please upload a smaller file.");
  if (!file.name.toLowerCase().endsWith(".pdf"))
    throw new Error("Upload a PDF file, or paste your agreement as text.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("This file is not a valid PDF.");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: bytes });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > MAX_DOCUMENT_PAGES)
      throw new Error(
        "PDF exceeds 20 pages. Please upload a shorter agreement.",
      );
    const id = crypto.randomUUID();
    const spans: SourceSpan[] = [];
    let length = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        pageText += item.str + (item.hasEOL ? "\n" : " ");
      }
      if (!pageText.trim())
        throw new Error(
          `Page ${pageNumber} has no extractable text. Scanned or mixed scanned PDFs are not supported; paste the complete agreement instead.`,
        );
      length += pageText.length;
      if (length > MAX_DOCUMENT_CHARACTERS)
        throw new Error(
          "PDF exceeds 60,000 extracted characters. Please use a shorter document.",
        );
      const parts = paragraphs(pageText).flatMap(
        (paragraph) => paragraph.match(/[\s\S]{1,12000}/g) ?? [],
      );
      parts.forEach((part, index) =>
        spans.push({
          id: `${id}:p${pageNumber}:${index + 1}`,
          page: pageNumber,
          paragraph: index + 1,
          text: part,
        }),
      );
      page.cleanup();
    }
    return documentVersionSchema.parse({
      id,
      title: file.name.replace(/\.pdf$/i, ""),
      spans,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException")
      throw new Error(
        "Password-protected PDFs are not supported. Use an unencrypted, redacted copy.",
      );
    throw error;
  } finally {
    await task.destroy();
  }
}
