# Counterpart video recording sheet

Target duration: **3 minutes 40 seconds**. Record the deployed application at
`https://counterpart-jade.vercel.app` in a fresh browser profile after Google
sign-in. Use only the included fictional document. Do not show credentials,
private reviews, API keys, or browser tabs unrelated to the demo.

## Preflight

1. Confirm Vercel shows the latest `main` deployment as Ready.
2. Set the browser to 1440 x 900 or another readable desktop size; zoom to
   100%; turn off notifications.
3. Have this file ready to upload:
   `output/pdf/counterpart-freelance-agreement.pdf`.
4. Start a new review titled `Riverstone launch website agreement` with:
   - Type of work: `Design & creative`
   - Client country: `India`
   - Signing status: `Not signed yet`
   - Priorities: `Payment certainty`, `Portfolio rights`, `An easy exit`, and
     `Scope protection`
5. Tick the demo-safe processing acknowledgement. It is a fictional fixture.
6. Keep the following revised text ready to paste when the Compare tab opens:

```text
FICTIONAL REVISION - NOT FOR SIGNING

The Freelancer will deliver the launch website designs for a fixed fee of INR 96,000.
The Client pays 40 percent before work starts, 40 percent on first complete draft, and 20 percent within 7 calendar days after final acceptance.

The fee includes two revision rounds for each page. Extra or urgent work needs written approval and a written quote before it starts.

The Client may cancel with seven days' written notice and will pay for completed milestones, approved work in progress, and non-cancellable approved costs. The parties will agree the value of unfinished work in writing.

Ownership of final approved deliverables transfers after payment of all invoiced completed work. The Freelancer may show public completed work in a portfolio after launch with prior written notice to the Client.

Indian law governs this agreement.
```

## Timed walkthrough

| Time | On screen | Say |
| --- | --- | --- |
| 0:00-0:18 | Counterpart home and Google sign-in/workspace. | “Counterpart is a contract review desk for Indian freelancers. I will use one question throughout: if a client cancels halfway through, what does the agreement actually say?” |
| 0:18-0:43 | Click **Review agreement**, upload the fictional PDF, set the four priorities, acknowledge processing, and create the review. | “I add the agreement and the priorities that affect the order of the review. Counterpart accepts only text-based English PDFs or pasted text, and this demo document is fictional.” |
| 0:43-1:18 | Click **Analyze agreement**. Wait for live output. Open the cancellation or payment finding and click its evidence. | “Gemini produces structured findings, but Counterpart only displays a claim when its quote matches the anchored document text. Here the cancellation clause pays for approved delivered work, while the agreement leaves unfinished work and reserved time open.” |
| 1:18-1:35 | Show **Your next moves** and add the cancellation or payment finding to the brief. | “The next-moves layer turns validated findings into negotiation questions without making a legal conclusion.” |
| 1:35-2:10 | Open **Compare**, paste the revision, acknowledge processing, add it, then run comparison. Open one change with before/after evidence. | “Now the client sends a revision. Counterpart separates a textual change from why it matters. This revision shortens the payment period and makes cancellation payment clearer, with evidence from both versions.” |
| 2:10-2:45 | Open **Scenarios**, select cancellation, enter `96000`, `38400`, and `50`, tick the assumption acknowledgement, then run it. | “For a halfway cancellation, I enter confirmed inputs. The monetary figure is a deterministic proportional illustration, not a statement of money legally recoverable. The AI response separately shows agreement terms, assumptions, missing information, and questions for a professional.” |
| 2:45-3:08 | Open **Brief**, add one more finding, generate the brief, edit one negotiation question, and save. | “I can turn selected evidence into an editable negotiation checklist or lawyer-preparation brief, with document-version labels and citations.” |
| 3:08-3:27 | Ask: `Does this agreement guarantee I will win a court case?` Show the missing-information or professional-advice response. | “Counterpart does not decide enforceability or promise an outcome. Unsupported questions remain explicitly uncertain and are directed to a qualified legal professional.” |
| 3:27-3:40 | Return to the review header or project URL. | “Counterpart helps freelancers understand the wording, compare changes, and prepare better next steps. It is informational assistance, not legal advice.” |

## Recording checks

- Show the result changing after each live request. Do not replace live analysis,
  comparison, question, or scenario output with the read-only example.
- Leave evidence, changed text, scenario inputs, and the legal-information
  boundary visible long enough to read.
- If a provider or quota error occurs, record that error state briefly, refresh
  only after its retry window, and restart the affected section. Do not edit
  together saved output as though it were live.
- Trim only waiting time, typing mistakes, and dead air. Do not cut away the
  action that triggers a Gemini operation.
- Export at 1080p or the native screen resolution. Upload to an unlisted
  YouTube link or a public-access Google Drive link, then verify playback in a
  private browser window.

Keep the final video outside the repository.
