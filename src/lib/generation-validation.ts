export async function requestValidatedGeneration<T>(
  request: (attempt: number) => Promise<string>,
  validate: (input: unknown) => T,
  retries = 1,
): Promise<T> {
  let validationError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const text = await request(attempt);
    try {
      return validate(JSON.parse(text));
    } catch (error) {
      validationError = error;
    }
  }
  throw validationError;
}
