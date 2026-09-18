import { endpoint } from "@/lib/server/http";
import { ownedReview, saveReview } from "@/lib/server/reviews";
import { generate, outputSchemas } from "@/lib/server/generation";
import { validateAnalysis } from "@/lib/grounding";

export const maxDuration = 60;
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => {
    const session = await ownedReview((await context.params).id);
    const document = session.review.versions[0];
    const analysis = await generate(
      session,
      "analysis",
      {
        document,
        task: "Review payment, acceptance, termination, revision limits, intellectual property, confidentiality, dispute resolution and inconsistent terms. Use at most 12 prioritized findings with direct evidence; put absent terms in missingInformation.",
      },
      outputSchemas.analysis,
      (result) => validateAnalysis(result, document),
    );
    return {
      review: await saveReview(session, { ...session.review, analysis }),
    };
  });
}
