import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

type GenerationMetric = {
  ownerId: string;
  reviewId: string;
  operation: string;
  model: string;
  inputCharacters: number;
  sourceCount: number;
  outputCharacters: number;
  latencyMs: number;
  retries: number;
  cacheHit: boolean;
  outcome: "complete" | "failed";
};

export async function recordGenerationMetric(metric: GenerationMetric) {
  // Metrics deliberately exclude document text, prompts, quotes, and model output.
  await createAdminClient().from("generation_metrics").insert({
    owner_id: metric.ownerId,
    review_id: metric.reviewId,
    operation: metric.operation,
    model: metric.model,
    input_characters: metric.inputCharacters,
    source_count: metric.sourceCount,
    output_characters: metric.outputCharacters,
    latency_ms: metric.latencyMs,
    retries: metric.retries,
    cache_hit: metric.cacheHit,
    outcome: metric.outcome,
  });
}
