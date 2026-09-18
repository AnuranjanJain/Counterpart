"use client";

import { useState } from "react";
import {
  ArrowRight,
  CircleAlert,
  LoaderCircle,
  MessageSquare,
} from "lucide-react";
import type { Citation, Review, ScenarioResult } from "@/lib/domain";
import { calculateScenario, scenarioRequestSchema } from "@/lib/scenarios";
import { api } from "@/lib/client-api";

export function ScenarioView({
  review,
  demo,
  citations,
}: {
  review: Review;
  demo: boolean;
  citations: (items: Citation[]) => React.ReactNode;
}) {
  const [kind, setKind] = useState("cancellation");
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [calculation, setCalculation] = useState<ReturnType<
    typeof calculateScenario
  > | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (demo) {
      setError(
        "This example is read-only. Sign in and add a demo-safe agreement to run a live scenario.",
      );
      return;
    }
    const data = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const response = await api<{
        result: ScenarioResult;
        calculation: ReturnType<typeof calculateScenario>;
      }>(
        `/api/reviews/${review.id}/scenario`,
        "POST",
        scenarioRequestSchema.parse({
          scenario: kind,
          inputs: {
            fee: Number(data.get("fee")),
            paid: Number(data.get("paid")),
            completion: Number(data.get("completion")),
          },
        }),
      );
      setResult(response.result);
      setCalculation(response.calculation);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The scenario could not be evaluated.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="wide-section">
      <div className="section-intro">
        <div>
          <h2>Before the hypothetical becomes real.</h2>
          <p>
            Explore a situation against your agreement. Keep the written terms,
            your assumptions, and the unanswered questions in view.
          </p>
        </div>
      </div>
      <div className="scenario-grid">
        <form className="scenario-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="scenario-kind">What happens if...</label>
            <select
              id="scenario-kind"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setResult(null);
                setCalculation(null);
              }}
            >
              <option value="cancellation">
                The client cancels partway through?
              </option>
              <option value="late-payment">The client pays late?</option>
              <option value="extra-revisions">
                The client requests more revisions?
              </option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="fee">Total agreed fee (INR)</label>
            <input
              id="fee"
              name="fee"
              type="number"
              min="0"
              max="1000000000"
              step="0.01"
              required
              placeholder="80000"
            />
          </div>
          <div className="field">
            <label htmlFor="paid">Amount already paid (INR)</label>
            <input
              id="paid"
              name="paid"
              type="number"
              min="0"
              max="1000000000"
              step="0.01"
              required
              placeholder="20000"
            />
          </div>
          <div className="field">
            <label htmlFor="completion">Work completed (%)</label>
            <input
              id="completion"
              name="completion"
              type="number"
              min="0"
              max="100"
              step="1"
              required
              placeholder="50"
            />
          </div>
          <label className="check-row">
            <input type="checkbox" required />
            <span>
              These are my scenario assumptions, not verified contract
              entitlements.
            </span>
          </label>
          <button className="btn primary" disabled={busy}>
            {busy ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <ArrowRight size={15} />
            )}
            Explore scenario
          </button>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </form>
        <div>
          {result ? (
            <article className="scenario-result" aria-live="polite">
              <span className="small muted">AGREEMENT-BASED RESPONSE</span>
              <h2 style={{ marginTop: 10 }}>The terms in this situation</h2>
              <div className="result-section">
                <p>{result.answer}</p>
                {citations(result.evidence)}
              </div>
              {calculation && kind === "cancellation" && (
                <div className="result-section">
                  <h3>Proportional-work illustration</h3>
                  <p className="amount">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                    }).format(calculation.balanceExample)}
                  </p>
                  <p className="muted">
                    Illustrative balance after payments received.
                  </p>
                  <div className="notice warning" style={{ marginTop: 12 }}>
                    <CircleAlert size={15} />
                    <span>{calculation.assumption}</span>
                  </div>
                </div>
              )}
              {[
                ["Assumptions", result.assumptions],
                ["Not established", result.missingInformation],
                ["Ask a qualified professional", result.professionalAdvice],
              ].map(([title, items]) => (
                <div className="result-section" key={title as string}>
                  <h3>{title as string}</h3>
                  <ul>
                    {(items as string[]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </article>
          ) : (
            <div className="empty">
              <MessageSquare size={32} />
              <h2>Put the agreement in context.</h2>
              <p>
                Enter your assumptions to see what the document supports, what
                it leaves open, and what to ask next.
              </p>
              <span className="small muted">
                No prediction of legal outcomes or recoverable amounts.
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
