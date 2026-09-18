import { z } from "zod";
import { documentVersionSchema } from "@/lib/domain";
import { ApiError, endpoint, readBody } from "@/lib/server/http";
import { ownedReview, saveReview } from "@/lib/server/reviews";
import { createAdminClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ id: string }> };
const patchSchema = z
  .object({
    brief: z.string().max(30_000).optional(),
    document: documentVersionSchema.optional(),
    acknowledged: z.literal(true).optional(),
  })
  .strict()
  .refine((value) => value.brief !== undefined || value.document !== undefined)
  .refine((value) => !value.document || value.acknowledged === true);

export async function GET(_request: Request, context: Context) {
  return endpoint(async () => ({
    review: (await ownedReview((await context.params).id)).review,
  }));
}

export async function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    const session = await ownedReview((await context.params).id);
    const patch = await readBody(request, patchSchema);
    const review = { ...session.review };
    if (patch.brief !== undefined) review.brief = patch.brief;
    if (patch.document) {
      if (patch.document.id === review.versions[0].id)
        throw new ApiError(
          400,
          "The revision needs a distinct document identifier.",
        );
      const originalSources = new Set(
        review.versions[0].spans.map((span) => span.id),
      );
      if (patch.document.spans.some((span) => originalSources.has(span.id)))
        throw new ApiError(
          400,
          "Revised agreement source identifiers must be distinct from the original.",
        );
      review.versions = [review.versions[0], patch.document];
      review.comparison = null;
    }
    return { review: await saveReview(session, review) };
  });
}

export async function DELETE(_request: Request, context: Context) {
  return endpoint(async () => {
    const session = await ownedReview((await context.params).id);
    const { error } = await createAdminClient()
      .from("reviews")
      .delete()
      .eq("id", session.review.id)
      .eq("owner_id", session.userId);
    if (error)
      throw new ApiError(503, "Could not delete the review. Please retry.");
    return { deleted: true };
  });
}
