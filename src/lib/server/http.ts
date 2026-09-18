import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function readBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new ApiError(415, "Send JSON data.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Request body is required.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 1_000_000) {
      await reader.cancel();
      throw new ApiError(413, "Request exceeds the 1 MB text-data limit.");
    }
    chunks.push(value);
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "Request contains invalid JSON.");
  }
  return schema.parse(body);
}

export async function endpoint(action: () => Promise<unknown>, status = 200) {
  try {
    return NextResponse.json(await action(), {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const code =
      error instanceof ApiError
        ? error.status
        : error instanceof ZodError
          ? 400
          : 500;
    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof ZodError
          ? "Some fields are missing or invalid. Check the document and inputs."
          : "The operation could not be completed. Please retry.";
    return NextResponse.json(
      { error: message },
      { status: code, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function safeNextPath(value: string | null) {
  if (
    !value ||
    !/^\/(?!\/)/.test(value) ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return "/";
  const parsed = new URL(value, "https://counterpart.invalid");
  return parsed.origin === "https://counterpart.invalid" ? value : "/";
}
