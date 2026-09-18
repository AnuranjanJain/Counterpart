# Release evidence and outstanding checks

## Verified locally

- Production compilation and TypeScript checking.
- 39 domain, HTTP, request-isolation, and scenario-contract tests.
- Eight desktop / mobile Playwright checks, including axe WCAG A/AA scans.
- Disposable PostgreSQL ownership, cache, quota, and concurrency assertions using minimal Supabase auth stand-ins.
- Dependency audit after upgrading vulnerable PDF.js and Vitest versions: zero advisories at verification time.
- AI Studio feasibility run on 18 September 2026: `gemini-3.5-flash-lite` returned all 36 labeled requests successfully, with observed latency of 1,022–2,819 ms. Outputs remain pending human review; this is not an accuracy claim.
- Read-only example labels, source navigation, brief editing, and explicit configuration errors.

These checks do not establish live Google OAuth, cloud RLS configuration, or model accuracy.

## Required before submission

- Configure Supabase and Google OAuth; verify fresh sign-in on the deployed origin.
- Apply the migration and confirm cloud ownership isolation with two users.
- Configure Gemini through AI Studio, run real inference, record model ID and latency, and set limits within the actual free quota. The current verified demo model is `gemini-3.5-flash-lite`; this is a text model for document review, not a Live/audio `bidiGenerateContent` model.
- Evaluate all labeled cases in `fixtures/evaluation-cases.json`; record actual outputs and human-reviewed results. Require at least 90% on answerability/material-change cases and no unsupported definitive legal claims. Do not convert `not-run` to passed without evidence.
- Verify original PDF rendering, upload limits, provider timeout, quota exhaustion, changed-input outputs, save/reopen/delete, and no confidential data in logs.
- Check official Indian legal reference URLs and record dates before publishing sourced summaries.
- Verify live URL without deployment protection, public GitHub visibility, exactly one branch, and GitHub-reported repository size under 10 MB.
- Record the live walkthrough, verify video length under four minutes, and check access in a private browser window.
- Submit by 26 September 2026; preserve the maximum of three attempts.

## Known limits

Free model quotas and data-use terms make this a demo-safe application, not confidential legal-document hosting. Automated quote validation cannot prove semantic correctness. No model evaluation score, live availability promise, or ranking claim is made.
