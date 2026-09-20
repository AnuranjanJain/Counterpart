# Counterpart

A contract review desk for Indian freelancers. Understand an agreement, compare a revision, explore a payment or cancellation scenario, and prepare a negotiation brief with links to the original wording.

[Open Counterpart](https://counterpart-jade.vercel.app) · [Public repository](https://github.com/AnuranjanJain/Counterpart)

Counterpart is deployed with Google sign-in, owner-scoped Supabase storage, and server-side Gemini through Google AI Studio. The authenticated review flow has been manually verified on the live deployment. A read-only fictional example remains available before sign-in.

**Vertical:** Legal assistance and access. **Persona:** an independent professional reviewing a client agreement before signing.

## Project submission

- **Live project:** [counterpart-jade.vercel.app](https://counterpart-jade.vercel.app)
- **Source code:** [github.com/AnuranjanJain/Counterpart](https://github.com/AnuranjanJain/Counterpart)
- **GenAI service:** Google Gemini 3.5 Flash Lite, accessed server-side through the official `@google/genai` SDK and a Google AI Studio API key.
- **Submission copy:** [project description and GenAI explanation](docs/project-submission.md)

The walkthrough video is a separate submission track. It is not included in this repository or required to run the project.

## Run locally

Requires Node.js 22.13+ and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Without external configuration, the application offers a clearly labeled read-only fictional example. It never fabricates live analysis or silently substitutes model output.

For real analysis, configure `.env.local` using `.env.example`. Follow [the key and Google sign-in setup guide](docs/service-setup.md), then apply the migration described in [supabase/README.md](supabase/README.md). Keep credentials out of Git. Restart the server after setting public environment variables.

## How it works

1. Sign in with Google. Add a public, fictional, or redacted English agreement as a text PDF or pasted text, then state work type, client country, signing status, and priorities.
2. PDF.js extracts text locally with stable page and paragraph references. Original PDF bytes remain in browser memory; saved reviews contain extracted text and references.
3. Gemini produces structured findings from the supplied agreement. Zod validates the response; every cited quote must match the specified source passage. Priorities guide ordering and relevance, not the underlying facts.
4. A second version enables evidence-backed comparison. Scenarios distinguish document terms, explicit assumptions, missing information, and professional-advice questions. Monetary illustrations use deterministic arithmetic, not model arithmetic.
5. Select findings to prepare an editable brief. Save it privately or print it to PDF. Delete reviews from the agreements list.

The first version is the source for Review, Q&A, Scenarios, and Brief. Compare examines both versions. This distinction prevents a revised agreement from silently replacing the reviewed source.

## Assumptions

- Agreements are in English and are either fictional, public, or properly redacted.
- The first release supports text-based PDFs and pasted agreement text; it does not perform OCR or accept DOCX files.
- Counterpart is designed around an India-focused freelance workflow, while foreign governing law is flagged for professional review.
- Findings help users understand document wording and prepare questions. They do not replace advice from a qualified legal professional.

## GenAI architecture

| Integration                      | Input                                | Output and validation                                                  |
| -------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| `POST /api/reviews/:id/analyze`  | Original document + user context     | Structured prioritized findings; exact quote validation                |
| `POST /api/reviews/:id/compare`  | Original + revised document          | Added/removed/changed terms with evidence on the correct side          |
| `POST /api/reviews/:id/question` | Original + user question             | Grounded answer, assumptions, omissions, professional-advice questions |
| `POST /api/reviews/:id/scenario` | Original + scenario + numeric inputs | Grounded interpretation plus separately calculated illustration        |

Google's official `@google/genai` SDK runs only on the server through an AI Studio API key. The deployed configuration uses `gemini-3.5-flash-lite`, configurable through `GEMINI_MODEL`. A failed structured response gets one bounded corrective retry, while transport retries are limited to one. Responses have operation-specific token budgets: 4,500 for reviews and comparisons, 2,000 for scenarios, and 1,500 for questions. No response is saved unless Zod and exact source-span checks pass. No autonomous tools, web searches, vector database, or model-provider fallbacks are used. The bounded documents fit in full context. Owner-scoped cache keys include document/context payload, model, and prompt version.

For follow-up questions and scenarios, Counterpart deterministically narrows the model payload to relevant anchored passages, capped at 12 passages or 18,000 characters. Full agreement text remains in use for first-pass reviews and revision comparison. Citations from every operation are still validated against the complete saved agreement.

## Boundaries and privacy

- Informational assistance, not legal advice or an enforceability decision. A valid citation proves the quote exists; it does not establish that the interpretation is correct.
- Free-tier Gemini content may be used for product improvement. The intake requires explicit acknowledgment. Do not upload confidential contracts or sensitive personal information.
- Accepts English text PDFs up to 3 MB / 20 pages / 60,000 extracted characters. Scanned, mixed scanned, encrypted, invalid, and oversized PDFs are rejected. No OCR or DOCX support.
- Saved text and outputs remain until the owner deletes the review or account. Review deletion removes associated result caches; a text-free usage ledger remains to prevent quota reset abuse.
- Supabase verifies identity, application queries filter ownership, and database RLS independently enforces isolation. Google credentials and Gemini keys are not exposed to the browser.
- Defaults: three analyses and ten follow-ups per user per UTC day, one active generation per user, 30 deployment-wide admissions daily. Match the administrator cap to actual provider quotas before deployment. Provider retries can consume additional provider requests.
- Input/output limits, structured output validation, inert text rendering, bounded timeouts, and prompt-injection instructions reduce risk; they do not guarantee semantic safety.

## Quality checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
npm run benchmark:context
```

The current suite has 46 Vitest checks covering parsing limits, PDF failure cases, evidence validation, focused context, generated-response retries, deterministic action outputs, comparison direction, scenario arithmetic, input boundaries, and redirect safety. Browser tests exercise desktop/mobile example workflows, action-plan-to-brief flow, and accessibility with axe. SQL tests cover owner isolation, concurrent admission, cache behavior, and deletion-resistant quotas; see database setup documentation.

`fixtures/` contains 12 explicitly fictional agreements, four revision pairs, and 36 labeled evaluation cases. A live feasibility run on 18 September 2026 returned 36/36 responses from `gemini-3.5-flash-lite`, with observed latency from 1,022 to 2,819 ms. These are provider-availability results, **not measured AI performance**. Human review is required before claiming the 90% release threshold. See [docs/release-checklist.md](docs/release-checklist.md).

The current offline fixture benchmark reports a 46% average reduction in question-operation document characters across those 36 cases. It measures deterministic payload size only; live latency and answer quality remain separately evaluated.

With a configured Gemini environment, `node --env-file=.env.local scripts/evaluate.mjs` records real model answers and latency for three labeled questions by default. Set `EVALUATION_CASE_LIMIT` to extend the run within your quota and `EVALUATION_DELAY_MS` to pace free-tier requests. Results remain `awaiting-human-review`; this provider probe does not replace endpoint or comparison evaluation. `npm run benchmark:context` writes an ignored, offline fixture report showing focused-context character reduction without making model-quality or latency claims.

## Code structure

- `src/components`: document workspace, intake, PDF viewer, scenarios.
- `src/lib`: typed contracts, extraction, grounding, deterministic calculations, server generation and persistence.
- `src/app/api`: authenticated review operations.
- `supabase`: schema migration and reproducible SQL security assertions.
- `tests` and `fixtures`: automated checks and evaluation inputs.

## Submission

The repository is public, uses one `main` branch, and excludes dependencies, build output, private data, evaluation artifacts, and videos. The project and the walkthrough video are separate submission tracks. Use [the project submission sheet](docs/project-submission.md) for the repository/project form and [the walkthrough outline](docs/demo-script.md) when preparing the separate video submission.
