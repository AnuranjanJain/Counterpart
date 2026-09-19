export async function requestValidatedGenerationWithMetrics<T>(
  request: (attempt: number) => Promise<string>,
  validate: (input: unknown) => T,
  retries = 1,
): Promise<{ value: T; retries: number }> {
  let validationError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const text = await request(attempt);
    try {
      return { value: validate(JSON.parse(text)), retries: attempt };
    } catch (error) {
      validationError = error;
    }
  }
  throw validationError;
}

export async function requestValidatedGeneration<T>(
  request: (attempt: number) => Promise<string>,
  validate: (input: unknown) => T,
  retries = 1,
): Promise<T> {
  return (await requestValidatedGenerationWithMetrics(request, validate, retries))
    .value;
}
