const OUTPUT_TOKEN_LIMITS = {
  analysis: 4_500,
  comparison: 4_500,
  question: 1_500,
  scenario: 2_000,
} as const;

export function outputTokenLimit(operation: string) {
  return OUTPUT_TOKEN_LIMITS[
    operation as keyof typeof OUTPUT_TOKEN_LIMITS
  ] ?? OUTPUT_TOKEN_LIMITS.question;
}
