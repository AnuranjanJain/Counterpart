import { afterEach, describe, expect, it, vi } from "vitest";
import { api, invalidateRequests } from "../src/lib/client-api";
import { scenarioRequestSchema } from "../src/lib/scenarios";

afterEach(() => {
  invalidateRequests();
  vi.unstubAllGlobals();
});
describe("workspace request isolation", () => {
  it("rejects an old response after account or agreement navigation even if abort is ignored", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      ),
    );
    const pending = api("/api/reviews");
    invalidateRequests();
    resolve(Response.json({ reviews: [{ title: "Prior account" }] }));
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
  it("allows a response from the current workspace", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ reviews: [] })),
    );
    await expect(api("/api/reviews")).resolves.toEqual({ reviews: [] });
  });
});
describe("scenario request contract", () => {
  it("accepts each UI scenario and rejects the former mismatched field", () => {
    for (const scenario of [
      "cancellation",
      "late-payment",
      "extra-revisions",
    ]) {
      expect(
        scenarioRequestSchema.parse({
          scenario,
          inputs: { fee: 80000, paid: 20000, completion: 50 },
        }).scenario,
      ).toBe(scenario);
    }
    expect(
      scenarioRequestSchema.safeParse({
        kind: "cancellation",
        inputs: { fee: 80000, paid: 20000, completion: 50 },
      }).success,
    ).toBe(false);
  });
});
