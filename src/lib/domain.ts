import { z } from "zod";

export const MAX_DOCUMENT_CHARACTERS = 60_000;
export const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024;
export const MAX_DOCUMENT_PAGES = 20;
const text = z.string().trim().min(1).max(12_000);
export const citationSchema = z
  .object({ sourceId: text, quote: text })
  .strict();
export const sourceSpanSchema = z
  .object({
    id: text,
    page: z.number().int().min(1).max(MAX_DOCUMENT_PAGES),
    paragraph: z.number().int().positive(),
    text,
  })
  .strict();
export const documentVersionSchema = z
  .object({
    id: z.string().min(1).max(100),
    title: z.string().trim().min(1).max(200),
    spans: z.array(sourceSpanSchema).min(1).max(3000),
  })
  .strict()
  .superRefine((document, ctx) => {
    if (
      document.spans.reduce((sum, span) => sum + span.text.length, 0) >
      MAX_DOCUMENT_CHARACTERS
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Document exceeds 60,000 characters.",
      });
    if (
      new Set(document.spans.map((span) => span.id)).size !==
      document.spans.length
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Source identifiers must be unique.",
      });
  });
export const contextSchema = z
  .object({
    workType: z.string().trim().min(1).max(200),
    clientCountry: z.string().trim().min(1).max(100),
    signingStatus: z.enum(["unsigned", "signed"]),
    priorities: z.array(z.string().trim().min(1).max(100)).min(1).max(8),
  })
  .strict();
export const findingSchema = z
  .object({
    id: text,
    title: text,
    category: text,
    severity: z.enum(["high", "medium", "low"]),
    explanation: text,
    relevance: text,
    question: text,
    evidence: z.array(citationSchema).min(1).max(10),
  })
  .strict();
export const analysisSchema = z
  .object({
    summary: text,
    findings: z.array(findingSchema).max(20),
    missingInformation: z.array(text).max(20),
  })
  .strict();
export const comparisonSchema = z
  .object({
    summary: text,
    changes: z
      .array(
        z
          .object({
            id: text,
            title: text,
            kind: z.enum(["added", "removed", "changed"]),
            significance: text,
            before: z.array(citationSchema).max(10),
            after: z.array(citationSchema).max(10),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();
export const scenarioSchema = z
  .object({
    answer: text,
    assumptions: z.array(text).max(20),
    missingInformation: z.array(text).max(20),
    professionalAdvice: z.array(text).max(20),
    evidence: z.array(citationSchema).max(15),
  })
  .strict();
export const reviewSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    createdAt: z.string().datetime(),
    context: contextSchema,
    versions: z.array(documentVersionSchema).min(1).max(2),
    analysis: analysisSchema.nullable(),
    comparison: comparisonSchema.nullable(),
    brief: z.string().max(30_000),
  })
  .strict();
export type Citation = z.infer<typeof citationSchema>;
export type SourceSpan = z.infer<typeof sourceSpanSchema>;
export type DocumentVersion = z.infer<typeof documentVersionSchema>;
export type UserContext = z.infer<typeof contextSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type Comparison = z.infer<typeof comparisonSchema>;
export type ScenarioResult = z.infer<typeof scenarioSchema>;
export type Review = z.infer<typeof reviewSchema>;
