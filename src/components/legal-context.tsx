import { BookOpen, ExternalLink } from "lucide-react";
import { legalReferences } from "@/lib/legal-references";

export function LegalContext() {
  return (
    <section className="legal-note" aria-label="Indian legal context">
      <h3>
        <BookOpen size={14} /> Indian legal context
      </h3>
      <p>
        General statutory context, separate from the agreement findings. These
        references do not determine enforceability.
      </p>
      {legalReferences.map((reference) => (
        <details key={reference.id} style={{ marginTop: 12 }}>
          <summary>{reference.title}</summary>
          <p style={{ marginTop: 8 }}>{reference.summary}</p>
          <p style={{ marginTop: 6 }}>{reference.applicability}</p>
          <a href={reference.url} target="_blank" rel="noreferrer">
            Official source <ExternalLink size={10} />
          </a>
          <small>
            Source checked {reference.retrievedAt}. Confirm current law with a
            professional.
          </small>
        </details>
      ))}
    </section>
  );
}
