import {
  analysisSchema,
  comparisonSchema,
  scenarioSchema,
  type Citation,
  type DocumentVersion,
} from "./domain";

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

export function validateCitations(
  citations: Citation[],
  document: DocumentVersion,
): void {
  const sources = new Map(document.spans.map((span) => [span.id, span.text]));
  for (const citation of citations) {
    const source = sources.get(citation.sourceId);
    if (
      !source ||
      !normalize(citation.quote) ||
      !normalize(source).includes(normalize(citation.quote))
    ) {
      throw new Error(
        "The generated evidence could not be verified against this document. Please retry.",
      );
    }
  }
}

export function validateAnalysis(input: unknown, document: DocumentVersion) {
  const analysis = analysisSchema.parse(input);
  analysis.findings.forEach((finding) =>
    validateCitations(finding.evidence, document),
  );
  return analysis;
}

export function validateComparison(
  input: unknown,
  before: DocumentVersion,
  after: DocumentVersion,
) {
  const comparison = comparisonSchema.parse(input);
  for (const change of comparison.changes) {
    if (
      (change.kind === "added" &&
        (change.before.length !== 0 || !change.after.length)) ||
      (change.kind === "removed" &&
        (!change.before.length || change.after.length !== 0)) ||
      (change.kind === "changed" &&
        (!change.before.length || !change.after.length))
    )
      throw new Error(
        "Comparison evidence does not match the reported change.",
      );
    validateCitations(change.before, before);
    validateCitations(change.after, after);
  }
  return comparison;
}

export function validateScenario(input: unknown, document: DocumentVersion) {
  const result = scenarioSchema.parse(input);
  validateCitations(result.evidence, document);
  if (!result.evidence.length && !result.missingInformation.length)
    throw new Error(
      "An answer without document evidence must identify missing information.",
    );
  return result;
}
