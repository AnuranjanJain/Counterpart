# Counterpart

A contract review desk for Indian freelancers. Understand an agreement, compare a revision, explore a payment or cancellation scenario, and prepare a negotiation brief with links to the original wording.

[Open Counterpart](https://counterpart-jade.vercel.app) · [Public repository](https://github.com/AnuranjanJain/Counterpart)

Deployment currently provides the read-only example until the owner configures Supabase, Google OAuth, and Gemini. Live legal analysis is not yet verified.

**Vertical:** Legal assistance and access. **Persona:** an independent professional reviewing a client agreement before signing.

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

## GenAI architecture

| Integration                      | Input                                | Output and validation                                                  |
| -------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| `POST /api/reviews/:id/analyze`  | Original document + user context     | Structured prioritized findings; exact quote validation                |
| `POST /api/reviews/:id/compare`  | Original + revised document          | Added/removed/changed terms with evidence on the correct side          |
| `POST /api/reviews/:id/question` | Original + user question             | Grounded answer, assumptions, omissions, professional-advice questions |
| `POST /api/reviews/:id/scenario` | Original + scenario + numeric inputs | Grounded interpretation plus separately calculated illustration        |

Google's official `@google/genai` SDK runs only on the server. Default model: `gemini-2.5-flash`, configurable through `GEMINI_MODEL`. No autonomous tools, web searches, vector database, or model-provider fallbacks. The bounded documents fit in full context. Owner-scoped cache keys include document/context payload, model, and prompt version. Changing a model requires reevaluation.

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
```

Domain tests cover parsing limits, PDF failure cases, evidence validation, comparison direction, and scenario arithmetic. HTTP tests cover input boundaries and redirect safety. Browser tests exercise example workflows on desktop/mobile, accessibility with axe, and absence of fabricated live results. SQL tests cover owner isolation, concurrent admission, cache behavior, and deletion-resistant quotas; see database setup documentation.

`fixtures/` contains 12 explicitly fictional agreements, four revision pairs, and 36 labeled evaluation cases. They are evaluation inputs, **not measured AI performance**. Live model quality and the 90% release threshold remain unverified until model credentials are configured and outputs are reviewed. See [docs/release-checklist.md](docs/release-checklist.md).

With a configured Gemini environment, `node --env-file=.env.local scripts/evaluate.mjs` records real model answers and latency for three labeled questions by default. Set `EVALUATION_CASE_LIMIT` to extend the run within your quota. Results remain `awaiting-human-review`; this provider probe does not replace endpoint or comparison evaluation.

## Code structure

- `src/components`: document workspace, intake, PDF viewer, scenarios.
- `src/lib`: typed contracts, extraction, grounding, deterministic calculations, server generation and persistence.
- `src/app/api`: authenticated review operations.
- `supabase`: schema migration and reproducible SQL security assertions.
- `tests` and `fixtures`: automated checks and evaluation inputs.

## Submission

Use one public `main` branch and keep the repository below 10 MB. Dependencies, generated PDF worker, build output, private data, and videos are excluded. A live deployment and a video strictly under four minutes are required; see [docs/demo-script.md](docs/demo-script.md). No submission attempt is made by running this project.
