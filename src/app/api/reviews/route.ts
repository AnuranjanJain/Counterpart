import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  contextSchema,
  documentVersionSchema,
  reviewSchema,
} from "@/lib/domain";
import { authenticate } from "@/lib/server/reviews";
import { ApiError, endpoint, readBody } from "@/lib/server/http";
import { createAdminClient } from "@/lib/supabase/admin";

const createSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    context: contextSchema,
    document: documentVersionSchema,
    acknowledged: z.literal(true),
  })
  .strict();

export async function GET(request: Request) {
  return endpoint(async () => {
    const offset = Number(
      new URL(request.url).searchParams.get("offset") || "0",
    );
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000)
      throw new ApiError(400, "Invalid page offset.");
    const { db, userId } = await authenticate();
    const { data, error } = await db
      .from("reviews")
      .select("data")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + 50);
    if (error)
      throw new ApiError(503, "Saved reviews are temporarily unavailable.");
    return {
      reviews: (data ?? [])
        .slice(0, 50)
        .map((row) => reviewSchema.parse(row.data)),
      hasMore: (data?.length ?? 0) > 50,
      nextOffset: offset + 50,
    };
  });
}

export async function POST(request: Request) {
  return endpoint(async () => {
    const { userId } = await authenticate();
    const input = await readBody(request, createSchema);
    const review = reviewSchema.parse({
      id: randomUUID(),
      title: input.title,
      createdAt: new Date().toISOString(),
      context: input.context,
      versions: [input.document],
      analysis: null,
      comparison: null,
      brief: "",
    });
    const { error } = await createAdminClient()
      .from("reviews")
      .insert({ id: review.id, owner_id: userId, data: review });
    if (error)
      throw new ApiError(503, "Could not save this agreement. Please retry.");
    return { review };
  }, 201);
}
