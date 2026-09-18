"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import type { DocumentVersion } from "@/lib/domain";

export function DocumentView({
  document,
  highlighted,
  file,
  hidden,
}: {
  document: DocumentVersion;
  highlighted: string | null;
  file?: File;
  hidden?: boolean;
}) {
  const [view, setView] = useState<"text" | "pdf">("text");
  const [pageNumber, setPageNumber] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (highlighted)
      documentElement(highlighted)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
  }, [highlighted, hidden]);
  useEffect(() => {
    if (!file || view !== "pdf") return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({
          data: new Uint8Array(await file.arrayBuffer()),
        });
        cleanup = () => {
          void task.destroy();
        };
        const pdf = await task.promise;
        if (disposed) return;
        setPages(pdf.numPages);
        const page = await pdf.getPage(pageNumber);
        const target = canvas.current;
        if (disposed || !target) return;
        const viewport = page.getViewport({ scale: 1.5 });
        target.width = viewport.width;
        target.height = viewport.height;
        await page.render({ canvas: target, viewport }).promise;
      } catch (e) {
        if (!disposed)
          setError(
            e instanceof Error
              ? e.message
              : "Could not render PDF. Extracted text remains available.",
          );
      }
    })();
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [file, view, pageNumber]);
  return (
    <section
      aria-label="Agreement document"
      className={`document ${hidden ? "mobile-hidden" : ""}`}
    >
      <div className="document-toolbar">
        <div className="document-title">
          <FileText size={14} />
          <span>{document.title}</span>
        </div>
        {file ? (
          <div className="inline-group">
            <button
              className="filter"
              onClick={() => setView(view === "text" ? "pdf" : "text")}
            >
              {view === "text" ? "Original PDF" : "Extracted text"}
            </button>
          </div>
        ) : (
          <span className="muted">SOURCE TEXT</span>
        )}
      </div>
      {view === "pdf" && file ? (
        <>
          <div className="pdf-controls">
            <button
              className="icon-button"
              aria-label="Previous page"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => p - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="small">
              {pageNumber} / {pages}
            </span>
            <button
              className="icon-button"
              aria-label="Next page"
              disabled={pageNumber >= pages}
              onClick={() => setPageNumber((p) => p + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <canvas
            className="pdf-canvas"
            ref={canvas}
            aria-label={`Original PDF page ${pageNumber}`}
          />
        </>
      ) : (
        <div
          className="document-scroll"
          tabIndex={0}
          aria-label="Scrollable agreement text"
        >
          <div className="document-page-heading">
            <small>Agreement / source document</small>
            <h2>{document.title}</h2>
            <p>
              Original wording. Paragraph references are added for navigation.
            </p>
          </div>
          {document.spans.map((span) => (
            <div
              key={span.id}
              id={`source-${span.id}`}
              className={`source-paragraph ${highlighted === span.id ? "highlight" : ""}`}
              tabIndex={highlighted === span.id ? 0 : undefined}
            >
              <span className="source-label">
                PAGE {span.page} / PARAGRAPH {span.paragraph}
              </span>
              <p>{span.text}</p>
            </div>
          ))}
        </div>
      )}
      <div className="document-footer">
        <span>{document.spans.length} source passages</span>
        <span>Version reference: {document.id.slice(0, 8)}</span>
      </div>
    </section>
  );
}
function documentElement(id: string) {
  return window.document.getElementById(`source-${id}`);
}
