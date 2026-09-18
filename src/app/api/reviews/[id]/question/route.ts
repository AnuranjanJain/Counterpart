import { z } from "zod";
import { endpoint, readBody } from "@/lib/server/http";
import { ownedReview } from "@/lib/server/reviews";
import { generate, outputSchemas } from "@/lib/server/generation";
import { validateScenario } from "@/lib/grounding";

export const maxDuration = 60;
const schema = z
  .object({ question: z.string().trim().min(5).max(2000) })
  .strict();
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const session = await ownedReview((await context.params).id);
    const { question } = await readBody(request, schema);
    const document = session.review.versions[0];
    const result = await generate(
      session,
      "question",
      {
        document,
        question,
        task: "Answer only from the original agreement. Cite all material claims. If not answerable, say so and describe missing information. Do not provide external legal claims.",
      },
      outputSchemas.scenario,
      (result) => validateScenario(result, document),
    );
    return { result };
  });
}
