import { z } from "zod";

export const scenarioInputsSchema = z
  .object({
    fee: z.number().finite().min(0).max(1_000_000_000),
    paid: z.number().finite().min(0).max(1_000_000_000),
    completion: z.number().finite().min(0).max(100),
  })
  .strict();

export const scenarioRequestSchema = z
  .object({
    scenario: z.enum(["cancellation", "late-payment", "extra-revisions"]),
    inputs: scenarioInputsSchema,
  })
  .strict();

export function calculateScenario(input: z.infer<typeof scenarioInputsSchema>) {
  const { fee, paid, completion } = scenarioInputsSchema.parse(input);
  const earnedExample = Math.round((fee * 100 * completion) / 100) / 100;
  return {
    earnedExample,
    balanceExample: Math.round((earnedExample - paid) * 100) / 100,
    assumption:
      "Illustration assumes payment scales directly with percentage completed. It does not establish legal entitlement or override milestone, acceptance, termination, or refund terms.",
  };
}
