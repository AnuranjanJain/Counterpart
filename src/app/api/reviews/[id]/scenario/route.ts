import { endpoint, readBody } from "@/lib/server/http";
import { ownedReview } from "@/lib/server/reviews";
import { generate, outputSchemas } from "@/lib/server/generation";
import { validateScenario } from "@/lib/grounding";
import { calculateScenario, scenarioRequestSchema } from "@/lib/scenarios";
import { selectFocusedContext } from "@/lib/focused-context";

export const maxDuration = 60;
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const session = await ownedReview((await context.params).id);
    const input = await readBody(request, scenarioRequestSchema);
    const document = session.review.versions[0];
    const focused = selectFocusedContext(document, { scenario: input.scenario });
    const calculation = calculateScenario(input.inputs);
    const result = await generate(
      session,
      "scenario",
      {
        document: focused.document,
        focus: {
          sourceCount: focused.sourceCount,
          characterCount: focused.characterCount,
          matched: focused.matched,
        },
        ...input,
        calculation,
        task: "Explain this scenario under the original agreement, connecting relevant payment, acceptance, termination and IP provisions. The calculation is a proportional illustration only, not an entitlement. Clearly distinguish contract terms, input assumptions, gaps, and questions for a legal professional.",
      },
      outputSchemas.scenario,
      (result) => validateScenario(result, document),
    );
    return { result, calculation };
  });
}
