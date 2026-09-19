import type { DocumentVersion, SourceSpan } from "./domain";

const MAX_FOCUSED_CHARACTERS = 18_000;
const MAX_FOCUSED_SPANS = 12;
const STOP_WORDS = new Set([
  "about",
  "after",
  "agreement",
  "client",
  "does",
  "from",
  "have",
  "into",
  "legal",
  "might",
  "should",
  "that",
  "this",
  "what",
  "when",
  "with",
  "would",
  "your",
]);

export type FocusedContext = {
  document: DocumentVersion;
  sourceCount: number;
  characterCount: number;
  matched: boolean;
};

function terms(value: string) {
  return [...new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].filter(
    (term) => !STOP_WORDS.has(term),
  );
}

function scenarioTerms(scenario?: string) {
  switch (scenario) {
    case "cancellation":
      return ["cancel", "cancellation", "terminate", "termination", "notice", "milestone", "refund", "payment"];
    case "late-payment":
      return ["payment", "payable", "invoice", "acceptance", "late", "interest", "due"];
    case "extra-revisions":
      return ["revision", "revisions", "scope", "changes", "additional", "fee", "acceptance"];
    default:
      return [];
  }
}

function score(span: SourceSpan, queryTerms: string[]) {
  const text = span.text.toLowerCase();
  return queryTerms.reduce(
    (total, term) => total + (text.includes(term) ? 1 : 0),
    0,
  );
}

export function selectFocusedContext(
  document: DocumentVersion,
  input: { question?: string; scenario?: string },
): FocusedContext {
  const queryTerms = [
    ...terms(input.question ?? ""),
    ...scenarioTerms(input.scenario),
  ];
  const ranked = document.spans
    .map((span, index) => ({ span, index, score: score(span, queryTerms) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const matched = ranked.some((item) => item.score > 0);
  const candidates = matched ? ranked.filter((item) => item.score > 0) : ranked;
  const spans: SourceSpan[] = [];
  let characterCount = 0;
  for (const { span } of candidates) {
    if (spans.length >= MAX_FOCUSED_SPANS) break;
    if (spans.length && characterCount + span.text.length > MAX_FOCUSED_CHARACTERS)
      continue;
    spans.push(span);
    characterCount += span.text.length;
    if (characterCount >= MAX_FOCUSED_CHARACTERS) break;
  }
  const ordered = spans.sort(
    (a, b) =>
      document.spans.indexOf(a) - document.spans.indexOf(b),
  );
  return {
    document: { ...document, spans: ordered },
    sourceCount: ordered.length,
    characterCount,
    matched,
  };
}

export const focusedContextLimits = {
  maxCharacters: MAX_FOCUSED_CHARACTERS,
  maxSpans: MAX_FOCUSED_SPANS,
};
