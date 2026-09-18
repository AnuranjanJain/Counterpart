let epoch = 0;
let controller = new AbortController();

// Invalidate old account/document responses even when a fetch implementation ignores abort.
export function invalidateRequests() {
  epoch += 1;
  controller.abort();
  controller = new AbortController();
}
export function requestEpoch() {
  return epoch;
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const started = epoch;
  const response = await fetch(path, {
    method,
    signal: controller.signal,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (started !== epoch)
    throw new DOMException("The workspace changed.", "AbortError");
  if (!response.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : data.error?.message ||
            "The request could not be completed. Please try again.",
    );
  return data as T;
}
