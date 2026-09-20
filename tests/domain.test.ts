import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractPdf, parseText } from "../src/lib/documents";
import {
  validateAnalysis,
  validateCitations,
  validateComparison,
  validateScenario,
} from "../src/lib/grounding";
import { calculateScenario } from "../src/lib/scenarios";
import { contextSchema, documentVersionSchema } from "../src/lib/domain";
import { requestValidatedGeneration } from "../src/lib/generation-validation";
import { outputTokenLimit } from "../src/lib/generation-limits";
import {
  focusedContextLimits,
  selectFocusedContext,
} from "../src/lib/focused-context";
import { decisionChecklist, negotiationActions } from "../src/lib/action-plan";
import { exampleReview } from "../src/lib/example";

const pdfMock = vi.hoisted(() => ({ getDocument: vi.fn(), destroy: vi.fn() }));
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: pdfMock.getDocument,
}));

describe("PDF extraction safety", () => {
  beforeEach(() => vi.clearAllMocks());
  const file = () =>
    new File(["%PDF-example"], "agreement.pdf", { type: "application/pdf" });
  const configure = (numPages: number, content = "Payment within 30 days.") => {
    pdfMock.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages,
        getPage: async () => ({
          getTextContent: async () => ({
            items: [{ str: content, hasEOL: true }],
          }),
          cleanup: vi.fn(),
        }),
      }),
      destroy: pdfMock.destroy,
    });
  };
  it("rejects non-PDF bytes before loading the parser", async () => {
    await expect(extractPdf(new File(["hello"], "wrong.pdf"))).rejects.toThrow(
      /valid PDF/,
    );
    expect(pdfMock.getDocument).not.toHaveBeenCalled();
  });
  it("rejects oversized uploads before loading the parser", async () => {
    await expect(
      extractPdf(new File([new Uint8Array(3 * 1024 * 1024 + 1)], "large.pdf")),
    ).rejects.toThrow(/3 MB/);
    expect(pdfMock.getDocument).not.toHaveBeenCalled();
  });
  it("preserves page anchors and destroys the parser after success", async () => {
    configure(2);
    const document = await extractPdf(file());
    expect(document.spans.map((span) => span.page)).toEqual([1, 2]);
    expect(pdfMock.destroy).toHaveBeenCalledOnce();
  });
  it("rejects excessive page counts and cleans up", async () => {
    configure(21);
    await expect(extractPdf(file())).rejects.toThrow(/20 pages/);
    expect(pdfMock.destroy).toHaveBeenCalledOnce();
  });
  it("rejects pages without extractable text", async () => {
    configure(1, "");
    await expect(extractPdf(file())).rejects.toThrow(/Scanned/);
    expect(pdfMock.destroy).toHaveBeenCalledOnce();
  });
  it("rejects extracted text over the character limit", async () => {
    configure(1, "x".repeat(60_001));
    await expect(extractPdf(file())).rejects.toThrow(/60,000/);
  });
  it("provides a clear encrypted-document error", async () => {
    pdfMock.getDocument.mockImplementation(() => ({
      promise: Promise.reject(
        Object.assign(new Error("Password needed"), {
          name: "PasswordException",
        }),
      ),
      destroy: pdfMock.destroy,
    }));
    await expect(extractPdf(file())).rejects.toThrow(/Password-protected/);
    expect(pdfMock.destroy).toHaveBeenCalledOnce();
  });
});

describe("document boundaries", () => {
  it("preserves exact paragraphs and version-specific anchors", () => {
    const document = parseText(
      "First clause.\r\n\r\nSecond clause.",
      "Contract",
      "v1",
    );
    expect(document.spans).toEqual([
      { id: "v1:p1:1", page: 1, paragraph: 1, text: "First clause." },
      { id: "v1:p1:2", page: 1, paragraph: 2, text: "Second clause." },
    ]);
    expect(parseText("First clause.", "Revision", "v2").spans[0].id).not.toBe(
      document.spans[0].id,
    );
  });
  it("rejects empty and oversized documents without truncating", () => {
    expect(() => parseText(" \n", "Contract")).toThrow();
    expect(() => parseText("a".repeat(60_001), "Contract")).toThrow(/60,000/);
    expect(
      parseText("a".repeat(60_000), "Contract")
        .spans.map((span) => span.text)
        .join(""),
    ).toHaveLength(60_000);
  });
  it("rejects forged oversized page numbers and duplicate anchors", () => {
    const doc = parseText("Clause", "Agreement", "v1");
    expect(
      documentVersionSchema.safeParse({
        ...doc,
        spans: [doc.spans[0], doc.spans[0]],
      }).success,
    ).toBe(false);
    expect(
      documentVersionSchema.safeParse({
        ...doc,
        spans: [{ ...doc.spans[0], page: 21 }],
      }).success,
    ).toBe(false);
  });
  it("validates context at the boundary", () => {
    expect(
      contextSchema.safeParse({
        workType: "Design",
        clientCountry: "India",
        signingStatus: "maybe",
        priorities: [],
      }).success,
    ).toBe(false);
  });
});

describe("grounding", () => {
  const doc = parseText(
    "Payment is due within 30 days.\n\nClient may terminate with notice.",
    "Agreement",
    "v1",
  );
  const citation = {
    sourceId: "v1:p1:1",
    quote: "Payment is due within 30 days.",
  };
  it("accepts exact evidence with harmless whitespace variation", () => {
    expect(() =>
      validateCitations(
        [{ ...citation, quote: "Payment is due\nwithin 30 days." }],
        doc,
      ),
    ).not.toThrow();
  });
  it.each([
    { sourceId: "missing", quote: citation.quote },
    { ...citation, quote: "Payment is due within 7 days." },
    { ...citation, quote: " " },
  ])("rejects fabricated evidence %#", (bad) => {
    expect(() => validateCitations([bad], doc)).toThrow(/verified/);
  });
  it("requires evidence for every finding", () => {
    expect(() =>
      validateAnalysis(
        {
          summary: "Review",
          findings: [
            {
              id: "1",
              title: "Payment",
              category: "payment",
              severity: "high",
              explanation: "Delay",
              relevance: "Cash flow",
              question: "Can this be sooner?",
              evidence: [],
            },
          ],
          missingInformation: [],
        },
        doc,
      ),
    ).toThrow();
  });
  it("validates both comparison sides and change semantics", () => {
    const revised = parseText(
      "Payment is due within 7 days.",
      "Revision",
      "v2",
    );
    const change = {
      id: "1",
      title: "Payment accelerated",
      kind: "changed",
      significance: "Shorter wait",
      before: [citation],
      after: [{ sourceId: "v2:p1:1", quote: "within 7 days." }],
    };
    expect(
      validateComparison(
        { summary: "Payment changed", changes: [change] },
        doc,
        revised,
      ).changes,
    ).toHaveLength(1);
    expect(() =>
      validateComparison(
        { summary: "Payment changed", changes: [{ ...change, kind: "added" }] },
        doc,
        revised,
      ),
    ).toThrow();
    expect(() =>
      validateComparison(
        {
          summary: "Payment changed",
          changes: [{ ...change, after: [citation] }],
        },
        doc,
        revised,
      ),
    ).toThrow();
  });
  it("requires an explanation of missing evidence for unsupported answers", () => {
    const scenario = {
      answer: "Not specified",
      assumptions: [],
      professionalAdvice: [],
      evidence: [],
      missingInformation: [],
    };
    expect(() => validateScenario(scenario, doc)).toThrow();
    expect(
      validateScenario(
        {
          ...scenario,
          missingInformation: ["Cancellation payment is unspecified."],
        },
        doc,
      ).evidence,
    ).toEqual([]);
  });
});

describe("focused document context", () => {
  const document = parseText(
    "Payment is due within 7 days.\n\nThe client may terminate with notice.\n\nOwnership transfers after full payment.",
    "Agreement",
    "v1",
  );
  it("selects only relevant anchored passages for a question", () => {
    const context = selectFocusedContext(document, {
      question: "When is payment due?",
    });
    expect(context.matched).toBe(true);
    expect(context.document.spans.map((span) => span.id)).toEqual([
      "v1:p1:1",
      "v1:p1:3",
    ]);
    expect(context.characterCount).toBeLessThan(document.spans.reduce((n, span) => n + span.text.length, 0));
  });
  it("selects cancellation terms deterministically and retains original IDs", () => {
    const first = selectFocusedContext(document, { scenario: "cancellation" });
    const second = selectFocusedContext(document, { scenario: "cancellation" });
    expect(first.document.spans.map((span) => span.id)).toContain("v1:p1:2");
    expect(second).toEqual(first);
  });
  it("uses a bounded fallback when there are no matching terms", () => {
    const context = selectFocusedContext(document, { question: "Explain typography." });
    expect(context.matched).toBe(false);
    expect(context.sourceCount).toBeGreaterThan(0);
    expect(context.sourceCount).toBeLessThanOrEqual(focusedContextLimits.maxSpans);
    expect(context.characterCount).toBeLessThanOrEqual(focusedContextLimits.maxCharacters);
  });
});

describe("freelancer action outputs", () => {
  const analysis = exampleReview.analysis!;
  it("ranks high-severity evidence-backed findings before lower priorities", () => {
    const actions = negotiationActions(analysis, exampleReview.context);
    expect(actions[0]).toMatchObject({ findingId: "payment", priority: "Do before signing" });
    expect(actions[1].priority).toBe("Do before signing");
  });
  it("covers each core pre-signing decision point", () => {
    expect(decisionChecklist(analysis).map((item) => item.label)).toEqual([
      "Payment",
      "Acceptance",
      "Cancellation",
      "Revisions",
      "Ownership",
    ]);
  });
});

describe("generated response validation", () => {
  it("retries one invalid model response and returns only a validated result", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce('{"answer":"unverified"}')
      .mockResolvedValueOnce('{"answer":"verified"}');
    await expect(
      requestValidatedGeneration(
        request,
        (input) => {
          const answer = (input as { answer?: string }).answer;
          if (answer !== "verified") throw new Error("unverified");
          return answer;
        },
      ),
    ).resolves.toBe("verified");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not retry a provider failure", async () => {
    const request = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    await expect(
      requestValidatedGeneration(request, (input) => input),
    ).rejects.toThrow("provider unavailable");
    expect(request).toHaveBeenCalledOnce();
  });
});

describe("generation resource limits", () => {
  it("uses response budgets suited to each review operation", () => {
    expect(outputTokenLimit("analysis")).toBe(4_500);
    expect(outputTokenLimit("comparison")).toBe(4_500);
    expect(outputTokenLimit("question")).toBe(1_500);
    expect(outputTokenLimit("scenario")).toBe(2_000);
    expect(outputTokenLimit("unknown")).toBe(1_500);
  });
});

describe("illustrative scenario arithmetic", () => {
  it("calculates proportional work and paid balance without implying entitlement", () => {
    const result = calculateScenario({
      fee: 80_000,
      paid: 20_000,
      completion: 50,
    });
    expect(result.earnedExample).toBe(40_000);
    expect(result.balanceExample).toBe(20_000);
    expect(result.assumption).toContain("does not establish legal entitlement");
  });
  it("preserves negative balances and rounds monetary outputs", () => {
    expect(
      calculateScenario({ fee: 100, paid: 50, completion: 0 }).balanceExample,
    ).toBe(-50);
    expect(
      calculateScenario({ fee: 99.99, paid: 0, completion: 33 }).earnedExample,
    ).toBe(33);
  });
  it.each([
    { fee: -1, paid: 0, completion: 50 },
    { fee: 10, paid: 0, completion: 101 },
    { fee: Infinity, paid: 0, completion: 50 },
    { fee: 10, paid: NaN, completion: 50 },
  ])("rejects invalid monetary inputs %#", (input) => {
    expect(() => calculateScenario(input)).toThrow();
  });
});
