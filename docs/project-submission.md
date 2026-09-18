# Counterpart project submission

## Project details

| Field | Submission value |
| --- | --- |
| Project name | Counterpart: Freelance Contract Review Desk |
| Challenge vertical | Legal assistance and access |
| Repository | https://github.com/AnuranjanJain/Counterpart |
| Live deployment | https://counterpart-jade.vercel.app |
| Primary user | Indian freelancers reviewing a client agreement before signing |

## Describe the changes or updates made in the deployed version

Counterpart turns a freelance agreement into a practical review workspace. A user signs in with Google, uploads a text-based English PDF or pastes an agreement, and sets the context that matters to them, such as payment certainty, portfolio rights, or an easy exit. The workspace then shows the original wording next to cited findings, so a freelancer can see both the plain-language explanation and the exact clause behind it.

The deployed version supports agreement review, version comparison, contextual questions, cancellation and late-payment scenarios, and an editable negotiation or lawyer-preparation brief. It keeps the original PDF only in browser memory while storing extracted text, paragraph anchors, and results under the authenticated owner. Reviews can be reopened or deleted, and the interface clearly separates contract wording, assumptions, missing information, and matters for a legal professional.

The application is designed as informational assistance, not legal advice. It rejects scanned, encrypted, empty, oversized, and unsupported documents; limits daily AI operations; applies Supabase row-level security; and never exposes Gemini or Supabase service credentials to the browser.

## GenAI services used and where they are used

Counterpart uses Google Gemini 3.5 Flash Lite through the official server-side `@google/genai` SDK with a Google AI Studio API key. Gemini is used in four document-grounded operations: reviewing an agreement for prioritized findings, comparing an original and revised version, answering a question from the original agreement, and evaluating a user-defined scenario such as client cancellation or late payment.

For every operation, the server sends bounded document text with stable page and paragraph IDs. Gemini returns structured JSON rather than free-form UI content. Zod validates the response shape, and each displayed quote must match the cited source span before results are saved. If a generated response contains an invalid citation, Counterpart makes one bounded corrective retry with stricter exact-quote instructions. Unsupported results are not stored or shown as facts.

Gemini helps interpret and organize the agreement; it does not calculate money owed or make enforceability decisions. Monetary illustrations are deterministic, and the product explicitly directs users to a qualified legal professional for advice.

## Project-submission checklist

- Public GitHub repository with one branch: `main`
- Live Vercel deployment
- README with setup, architecture, limitations, testing, and GenAI integration details
- Fictional evaluation fixtures and reproducible test commands
- Video submission handled separately and excluded from the repository
