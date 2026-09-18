import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ApiError,
  endpoint,
  readBody,
  safeNextPath,
} from "../src/lib/server/http";

describe("authentication redirect paths", () => {
  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\r\nevil",
    "/\t/evil.example",
    null,
  ])("rejects external or ambiguous redirect %s", (path) => {
    expect(safeNextPath(path)).toBe("/");
  });
  it("preserves same-origin relative paths", () => {
    expect(safeNextPath("/reviews?id=123")).toBe("/reviews?id=123");
  });
});

describe("bounded JSON input", () => {
  const schema = z.object({ title: z.string().min(1) }).strict();
  const request = (body: string, contentType = "application/json") =>
    new Request("http://localhost/api", {
      method: "POST",
      body,
      headers: { "Content-Type": contentType },
    });
  it("accepts and validates JSON", async () => {
    expect(await readBody(request('{"title":"Example"}'), schema)).toEqual({
      title: "Example",
    });
  });
  it("rejects malformed and incorrect content types", async () => {
    await expect(readBody(request("{"), schema)).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      readBody(request("{}", "text/plain"), schema),
    ).rejects.toMatchObject({ status: 415 });
  });
  it("enforces body byte size independently of Content-Length", async () => {
    await expect(
      readBody(request("a".repeat(1_000_001)), schema),
    ).rejects.toMatchObject({ status: 413 });
  });
  it("does not expose unexpected internal error details", async () => {
    const response = await endpoint(async () => {
      throw new Error("secret-provider-token");
    });
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret-provider-token");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("preserves meaningful authentication and quota status", async () => {
    const response = await endpoint(async () => {
      throw new ApiError(429, "Daily allowance reached.");
    });
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Daily allowance reached.",
    });
  });
});
