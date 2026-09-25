export async function requestValidatedGenerationWithMetrics<T>(
  request: (attempt: number) => Promise<string>,
  validate: (input: unknown) => T,
  retries = 1,
): Promise<{ value: T; retries: number }> {
  let validationError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const text = await request(attempt);
    try {
      return { value: validate(parseModelJson(text)), retries: attempt };
    } catch (error) {
      validationError = error;
    }
  }
  throw validationError;
}

function parseModelJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

export async function requestValidatedGeneration<T>(
  request: (attempt: number) => Promise<string>,
  validate: (input: unknown) => T,
  retries = 1,
): Promise<T> {
  return (await requestValidatedGenerationWithMetrics(request, validate, retries))
    .value;
}
