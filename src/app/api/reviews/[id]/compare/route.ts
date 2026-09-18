import { ApiError, endpoint } from "@/lib/server/http";
import { ownedReview, saveReview } from "@/lib/server/reviews";
import { generate, outputSchemas } from "@/lib/server/generation";
import { validateComparison } from "@/lib/grounding";

export const maxDuration = 60;
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const session = await ownedReview((await context.params).id);
    const [before, after] = session.review.versions;
    if (!after)
      throw new ApiError(400, "Add a revised agreement before comparing.");
    const comparison = await generate(
      session,
      "comparison",
      {
        before,
        after,
        task: "Compare material changes. Changed terms need before and after evidence; additions need after evidence only; removals need before evidence only. Distinguish quoted text from interpreted significance. Do not report unchanged clauses as changes.",
      },
      outputSchemas.comparison,
      (result) => validateComparison(result, before, after),
    );
    return {
      review: await saveReview(session, { ...session.review, comparison }),
    };
  });
}
