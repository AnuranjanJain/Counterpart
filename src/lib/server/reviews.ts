import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { reviewSchema, type Review } from "@/lib/domain";
import { ApiError } from "./http";
import { createAdminClient } from "@/lib/supabase/admin";

export async function authenticate() {
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user)
    throw new ApiError(401, "Sign in to access your reviews.");
  return { db, userId: data.user.id };
}

export async function ownedReview(id: string) {
  if (!z.string().uuid().safeParse(id).success)
    throw new ApiError(404, "Review not found.");
  const session = await authenticate();
  const { data, error } = await session.db
    .from("reviews")
    .select("data, revision")
    .eq("id", id)
    .eq("owner_id", session.userId)
    .maybeSingle();
  if (error)
    throw new ApiError(503, "Saved reviews are temporarily unavailable.");
  if (!data) throw new ApiError(404, "Review not found.");
  return {
    ...session,
    review: reviewSchema.parse(data.data),
    revision: data.revision as number,
  };
}

export async function saveReview(
  session: Awaited<ReturnType<typeof ownedReview>>,
  review: Review,
) {
  const { data, error } = await createAdminClient()
    .from("reviews")
    .update({
      data: reviewSchema.parse(review),
      revision: session.revision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", review.id)
    .eq("owner_id", session.userId)
    .eq("revision", session.revision)
    .select("id")
    .maybeSingle();
  if (error) throw new ApiError(503, "Could not save changes. Please retry.");
  if (!data)
    throw new ApiError(
      409,
      "This review changed in another request. Reload it before retrying.",
    );
  return review;
}
