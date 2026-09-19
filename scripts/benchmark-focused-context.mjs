import { readFile, mkdir, writeFile } from "node:fs/promises";

const MAX_FOCUSED_CHARACTERS = 18_000;
const MAX_FOCUSED_SPANS = 12;
const stopWords = new Set([
  "about", "after", "agreement", "client", "does", "from", "have", "into",
  "legal", "might", "should", "that", "this", "what", "when", "with", "would", "your",
]);
const terms = (value) =>
  [...new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])].filter(
    (term) => !stopWords.has(term),
  );
const parseFixture = (text, id) =>
  text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => part.match(/[\s\S]{1,12000}/g) ?? [])
    .map((text, index) => ({ id: `${id}:p1:${index + 1}`, text }));
const focusFixture = (spans, question) => {
  const queryTerms = terms(question);
  const ranked = spans
    .map((span, index) => ({
      span,
      index,
      score: queryTerms.reduce(
        (total, term) => total + Number(span.text.toLowerCase().includes(term)),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const candidates = ranked.some((item) => item.score > 0)
    ? ranked.filter((item) => item.score > 0)
    : ranked;
  const selected = [];
  let characterCount = 0;
  for (const { span } of candidates) {
    if (selected.length >= MAX_FOCUSED_SPANS) break;
    if (selected.length && characterCount + span.text.length > MAX_FOCUSED_CHARACTERS)
      continue;
    selected.push(span);
    characterCount += span.text.length;
  }
  return { characterCount, sourceCount: selected.length };
};

const agreements = JSON.parse(await readFile("fixtures/agreements.json", "utf8"));
const cases = JSON.parse(await readFile("fixtures/evaluation-cases.json", "utf8"));
const results = cases.map((entry) => {
  const agreement = agreements.find((item) => item.id === entry.fixture);
  if (!agreement) throw new Error(`Missing fixture ${entry.fixture}`);
  const spans = parseFixture(agreement.text, agreement.id);
  const focused = focusFixture(spans, entry.question);
  const fullCharacters = spans.reduce(
    (total, span) => total + span.text.length,
    0,
  );
  return {
    caseId: entry.id,
    fullCharacters,
    focusedCharacters: focused.characterCount,
    sourceCount: focused.sourceCount,
    reductionPercent: Math.round(
      ((fullCharacters - focused.characterCount) / fullCharacters) * 100,
    ),
  };
});
const average = (values) =>
  Math.round(values.reduce((total, value) => total + value, 0) / values.length);
const report = {
  purpose:
    "Offline deterministic focused-context benchmark. It measures document characters sent to a question operation; it does not claim provider latency or model quality.",
  createdAt: new Date().toISOString(),
  cases: results,
  summary: {
    caseCount: results.length,
    averageFullCharacters: average(results.map((item) => item.fullCharacters)),
    averageFocusedCharacters: average(
      results.map((item) => item.focusedCharacters),
    ),
    averageReductionPercent: average(
      results.map((item) => item.reductionPercent),
    ),
  },
};
await mkdir("artifacts", { recursive: true });
const path = `artifacts/focused-context-${new Date().toISOString().replaceAll(":", "-")}.json`;
await writeFile(path, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ path, ...report.summary }));
