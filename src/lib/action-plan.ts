import type { Analysis, Finding, UserContext } from "./domain";

export type NegotiationAction = {
  findingId: string;
  priority: "Do before signing" | "Clarify before signing" | "Keep on record";
  title: string;
  request: string;
};

export type DecisionChecklistItem = {
  label: string;
  status: "covered" | "needs-attention";
  detail: string;
};

const rank = { high: 0, medium: 1, low: 2 };

export function negotiationActions(
  analysis: Analysis,
  context: UserContext,
): NegotiationAction[] {
  return [...analysis.findings]
    .sort(
      (a, b) =>
        rank[a.severity] - rank[b.severity] ||
        Number(!context.priorities.some((p) => a.relevance.includes(p))) -
          Number(!context.priorities.some((p) => b.relevance.includes(p))),
    )
    .map((finding) => ({
      findingId: finding.id,
      priority:
        finding.severity === "high"
          ? "Do before signing"
          : finding.severity === "medium"
            ? "Clarify before signing"
            : "Keep on record",
      title: finding.title,
      request: finding.question,
    }));
}

const checklistCategories: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["Payment", ["payment", "fee", "invoice"]],
  ["Acceptance", ["acceptance", "approval", "delivery"]],
  ["Cancellation", ["termination", "exit", "cancel"]],
  ["Revisions", ["revision", "scope"]],
  ["Ownership", ["ownership", "intellectual", "portfolio"]],
];

export function decisionChecklist(analysis: Analysis): DecisionChecklistItem[] {
  return checklistCategories.map(([label, words]) => {
    const finding = analysis.findings.find((item) =>
      words.some((word) =>
        `${item.category} ${item.title}`.toLowerCase().includes(word),
      ),
    );
    return finding
      ? {
          label,
          status: finding.severity === "low" ? "covered" : "needs-attention",
          detail: finding.title,
        }
      : {
          label,
          status: "needs-attention",
          detail: "No clear finding covers this decision point.",
        };
  });
}

export function findingById(analysis: Analysis, id: string): Finding | undefined {
  return analysis.findings.find((finding) => finding.id === id);
}
