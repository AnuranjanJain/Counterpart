"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FileUp, LoaderCircle, X } from "lucide-react";
import { extractPdf, parseText } from "@/lib/documents";
import type { DocumentVersion, UserContext } from "@/lib/domain";

export function Intake({
  open,
  onOpenChange,
  revision = false,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revision?: boolean;
  onSubmit: (
    document: DocumentVersion,
    context: UserContext,
    file?: File,
  ) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [priorities, setPriorities] = useState(["Payment certainty"]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const document = file
        ? await extractPdf(file)
        : parseText(text, String(data.get("title") || "Revised agreement"));
      await onSubmit(
        document,
        {
          workType: String(data.get("workType") || "Freelance services"),
          clientCountry: String(data.get("country") || "India"),
          signingStatus:
            data.get("status") === "signed" ? "signed" : "unsigned",
          priorities,
        },
        file,
      );
      setText("");
      setFile(undefined);
      onOpenChange(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to read this agreement. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">
            {revision ? "Add a revised agreement" : "Review an agreement"}
          </Dialog.Title>
          <Dialog.Description className="dialog-description">
            {revision
              ? "Compare a new version with your original agreement."
              : "Start with the agreement and the things that matter to you."}{" "}
            English text PDFs or pasted text only.
          </Dialog.Description>
          <Dialog.Close
            className="icon-button dialog-close"
            aria-label="Close"
            disabled={busy}
          >
            <X size={18} />
          </Dialog.Close>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="title">Agreement name</label>
              <input
                id="title"
                name="title"
                required
                maxLength={200}
                placeholder="e.g. Brand identity project"
              />
            </div>
            <label className="upload-area" htmlFor="pdf-upload">
              <FileUp size={25} />
              <span>
                {file ? file.name : "Choose a PDF agreement"}
                <small>Up to 3 MB / 20 pages / text-based PDF</small>
              </span>
            </label>
            <input
              className="sr-only"
              id="pdf-upload"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                setFile(e.target.files?.[0]);
                setError("");
              }}
            />
            {file ? (
              <button
                className="btn small"
                type="button"
                onClick={() => setFile(undefined)}
              >
                Remove PDF
              </button>
            ) : (
              <div className="field">
                <label htmlFor="agreement-text">Or paste agreement text</label>
                <textarea
                  id="agreement-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  maxLength={60000}
                  placeholder="Paste the complete agreement, including any schedules..."
                />
                <small>
                  {text.length.toLocaleString()} / 60,000 characters
                </small>
              </div>
            )}
            {!revision && (
              <>
                <div className="divider" />
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="work-type">Type of work</label>
                    <select id="work-type" name="workType">
                      <option>Design & creative</option>
                      <option>Software development</option>
                      <option>Writing & content</option>
                      <option>Consulting</option>
                      <option>Other freelance services</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="country">Client country</label>
                    <input
                      id="country"
                      name="country"
                      defaultValue="India"
                      required
                      maxLength={100}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="status">Signing status</label>
                  <select id="status" name="status">
                    <option value="unsigned">Not signed yet</option>
                    <option value="signed">Already signed</option>
                  </select>
                </div>
                <fieldset>
                  <legend className="small">Your priorities</legend>
                  {[
                    "Payment certainty",
                    "Portfolio rights",
                    "An easy exit",
                    "Scope protection",
                  ].map((priority) => (
                    <label className="check-row" key={priority}>
                      <input
                        type="checkbox"
                        checked={priorities.includes(priority)}
                        onChange={(e) =>
                          setPriorities(
                            e.target.checked
                              ? [...priorities, priority]
                              : priorities.filter((p) => p !== priority),
                          )
                        }
                      />
                      {priority}
                    </label>
                  ))}
                </fieldset>
              </>
            )}
            <label className="check-row">
              <input type="checkbox" required />
              <span>
                This agreement is fictional, public, or redacted. I understand
                its text will be sent to Google Gemini, whose{" "}
                <a
                  href="https://ai.google.dev/gemini-api/terms"
                  target="_blank"
                  rel="noreferrer"
                >
                  free-tier terms
                </a>{" "}
                allow product improvement use. It contains no confidential or
                sensitive personal information.
              </span>
            </label>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <div className="form-actions">
              <Dialog.Close className="btn" type="button" disabled={busy}>
                Cancel
              </Dialog.Close>
              <button
                className="btn primary"
                disabled={busy || !priorities.length}
              >
                {busy ? (
                  <>
                    <LoaderCircle size={15} className="spin" />
                    Reading agreement...
                  </>
                ) : revision ? (
                  "Add revision"
                ) : (
                  "Create review"
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
