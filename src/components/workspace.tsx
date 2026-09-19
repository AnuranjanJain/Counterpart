"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  FilePlus2,
  FileText,
  FolderOpen,
  GitCompareArrows,
  LoaderCircle,
  LogOut,
  MessageSquare,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type {
  Citation,
  DocumentVersion,
  Review,
  ScenarioResult,
  UserContext,
} from "@/lib/domain";
import { exampleReview } from "@/lib/example";
import { createClient } from "@/lib/supabase/browser";
import { DocumentView } from "./document-view";
import { Intake } from "./intake";
import { ScenarioView } from "./scenario-view";
import { LegalContext } from "./legal-context";
import { ActionPlan } from "./action-plan";
import { api, invalidateRequests, requestEpoch } from "@/lib/client-api";

type View = "review" | "compare" | "scenarios" | "brief";
const tabs: { id: View; name: string; icon: typeof FileText }[] = [
  { id: "review", name: "Review", icon: FileText },
  { id: "compare", name: "Compare", icon: GitCompareArrows },
  { id: "scenarios", name: "Scenarios", icon: MessageSquare },
  { id: "brief", name: "Your brief", icon: ClipboardList },
];

export function Workspace() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const [demo, setDemo] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [view, setView] = useState<View>("review");
  const [intake, setIntake] = useState(false);
  const [revision, setRevision] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"findings" | "document">(
    "findings",
  );
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ScenarioResult | null>(null);
  const [brief, setBrief] = useState("");
  const [docWidth, setDocWidth] = useState(48);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [activeVersion, setActiveVersion] = useState(0);
  const desk = useRef<HTMLDivElement>(null);
  const actor = useRef<string | null>(null);
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  useEffect(() => {
    if (!configured) return;
    const client = createClient();
    let active = true;
    let authChanged = false;
    const adoptUser = (next: User | null) => {
      if (actor.current !== (next?.id ?? null)) {
        invalidateRequests();
        actor.current = next?.id ?? null;
        setReviews([]);
        setReview(null);
        setFiles({});
        setAnswer(null);
        setBrief("");
        setBusy("");
        setIntake(false);
        setRevision(false);
        setDemo(false);
      }
      setUser(next);
    };
    void client.auth.getUser().then(({ data, error }) => {
      if (!active || authChanged) return;
      adoptUser(data.user);
      if (error && error.name !== "AuthSessionMissingError")
        setError("Your session could not be loaded. Please sign in again.");
      setSessionReady(true);
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      adoptUser(session?.user ?? null);
      setSessionReady(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
      invalidateRequests();
    };
  }, [configured]);
  useEffect(() => {
    if (user)
      void api<{ reviews: Review[]; hasMore: boolean; nextOffset: number }>(
        "/api/reviews",
      )
        .then((data) => {
          setReviews(data.reviews);
          setNextOffset(data.hasMore ? data.nextOffset : null);
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        });
  }, [user]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function openReview(value: Review) {
    invalidateRequests();
    setBusy("");
    setReview(value);
    setSelected([]);
    setView("review");
    setHighlighted(null);
    setBrief(value.brief);
    setAnswer(null);
    setError("");
    setActiveVersion(0);
  }
  function sync(value: Review) {
    setReview(value);
    setReviews((old) => [value, ...old.filter((r) => r.id !== value.id)]);
  }
  async function login() {
    setError("");
    if (!configured) {
      setError(
        "Google sign-in is not configured on this installation. You can still inspect the read-only example.",
      );
      return;
    }
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError("Google sign-in could not start. Please try again.");
  }
  async function logout() {
    invalidateRequests();
    if (user) await createClient().auth.signOut();
    setDemo(false);
    setReview(null);
    setReviews([]);
    setFiles({});
    setError("");
  }
  async function run(label: string, action: () => Promise<void>) {
    const started = requestEpoch();
    setBusy(label);
    setError("");
    try {
      await action();
    } catch (e) {
      if (
        started !== requestEpoch() ||
        (e instanceof Error && e.name === "AbortError")
      )
        return;
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Your saved work has been preserved.",
      );
    } finally {
      if (started === requestEpoch()) setBusy("");
    }
  }
  async function create(
    document: DocumentVersion,
    context: UserContext,
    file?: File,
  ) {
    if (!user || actor.current !== user.id) throw new Error('Your session changed. Please sign in and add the agreement again.');
    const data = await api<{ review: Review }>("/api/reviews", "POST", {
      title: document.title,
      context,
      document,
      acknowledged: true,
    });
    sync(data.review);
    openReview(data.review);
    if (file) setFiles((old) => ({ ...old, [document.id]: file }));
  }
  async function addRevision(
    document: DocumentVersion,
    _context: UserContext,
    file?: File,
  ) {
    if (!user || actor.current !== user.id) throw new Error('Your session changed. Please sign in and add the revision again.');
    if (!review) return;
    const data = await api<{ review: Review }>(
      `/api/reviews/${review.id}`,
      "PATCH",
      { document, acknowledged: true },
    );
    sync(data.review);
    if (file) setFiles((old) => ({ ...old, [document.id]: file }));
    setView("compare");
  }
  async function analyze() {
    if (!review) return;
    await run("Reading clauses and checking evidence...", async () => {
      const data = await api<{ review: Review }>(
        `/api/reviews/${review.id}/analyze`,
        "POST",
        {},
      );
      sync(data.review);
    });
  }
  function cite(citation: Citation) {
    const version =
      review?.versions.findIndex((v) =>
        v.spans.some((s) => s.id === citation.sourceId),
      ) ?? 0;
    setActiveVersion(Math.max(0, version));
    setHighlighted(citation.sourceId);
    setView("review");
    setMobilePane("document");
  }
  function citations(items: Citation[]) {
    return items.map((c, i) => (
      <button
        key={`${c.sourceId}-${i}`}
        className="citation"
        onClick={() => cite(c)}
        title={c.quote}
      >
        <BookOpen size={12} />
        {sourceLabel(review!, c.sourceId)}
        <ChevronRight size={11} />
      </button>
    ));
  }
  function buildBrief() {
    if (!review?.analysis) return;
    const chosen = review.analysis.findings.filter((f) =>
      selected.includes(f.id),
    );
    setBrief(
      `COUNTERPART / NEGOTIATION BRIEF\n${review.title}\nOriginal version: ${review.versions[0].id}\n\n${chosen.map((f, i) => `${i + 1}. ${f.title}\n${f.question}\n${f.evidence.map((c) => `${sourceLabel(review, c.sourceId)}: "${c.quote}"`).join("\n")}`).join("\n\n")}\n\nQUESTIONS FOR A LEGAL PROFESSIONAL\n${review.analysis.missingInformation.map((s) => `- ${s}`).join("\n")}\n\nPrepared from document text. Informational assistance, not legal advice.`,
    );
    setView("brief");
  }
  function toggleBriefFinding(id: string) {
    setSelected((old) =>
      old.includes(id) ? old.filter((item) => item !== id) : [...old, id],
    );
  }
  if (!sessionReady)
    return (
      <main className="auth-screen">
        <div className="brand">
          <span className="brand-mark">c</span>Counterpart
        </div>
        <div className="auth-main">
          <div className="progress" role="status">
            <LoaderCircle size={18} className="spin" />
            Opening your workspace...
          </div>
        </div>
      </main>
    );
  if (!user && !demo)
    return (
      <main className="auth-screen">
        <div className="brand">
          <span className="brand-mark">c</span>Counterpart
        </div>
        <div className="auth-main">
          <span className="auth-index">The contract review desk</span>
          <h1>
            A considered second look.
            <br />
            Before you sign.
          </h1>
          <div className="auth-rule" />
          <p>
            Your freelance agreement, read with your priorities in mind.
            Understand the terms. Ask better questions. Make your next move
            informed.
          </p>
          <div className="auth-actions">
            <button className="btn primary" onClick={() => void login()}>
              Continue with Google
              <ArrowRight size={16} />
            </button>
            <button
              className="btn"
              onClick={() => {
                setDemo(true);
                openReview(exampleReview);
              }}
            >
              Explore an example
              <BookOpen size={16} />
            </button>
          </div>
          <p className="small" style={{ fontSize: 12 }}>
            For Indian freelancers. Fictional, public, or redacted agreements
            only.
          </p>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </div>
        <footer className="auth-foot">
          <span>Independent work. Considered agreements.</span>
          <span>
            Information and assistance, not professional legal advice.
          </span>
        </footer>
      </main>
    );

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="app">
        <aside className="sidebar">
          <Link
            className="brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setReview(null);
            }}
          >
            <span className="brand-mark">c</span>Counterpart
          </Link>
          <div className="brand-caption">The contract review desk</div>
          <nav aria-label="Workspace">
            <button
              className="btn primary"
              style={{ width: "100%" }}
              onClick={() => (demo ? void login() : setIntake(true))}
            >
              <Plus size={15} />
              Review agreement
            </button>
            <div className="nav-label">Workspace</div>
            <button
              className={`nav-item ${!review ? "active" : ""}`}
              onClick={() => setReview(null)}
            >
              <FolderOpen size={17} />
              Agreements
              <span className="nav-count">{demo ? 1 : reviews.length}</span>
            </button>
            {review && (
              <button
                className="nav-item active"
                onClick={() => setView("review")}
              >
                <FileText size={16} />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {review.title}
                </span>
              </button>
            )}
            <div className="nav-label">Reference</div>
            <a
              className="nav-item"
              href="https://www.indiacode.nic.in/"
              target="_blank"
              rel="noreferrer"
            >
              <BookOpen size={16} />
              India Code
              <ExternalLink size={11} />
            </a>
          </nav>
          <div className="side-note">
            <ShieldCheck size={19} />
            <strong>Your judgment comes first.</strong>Counterpart explains the
            wording. A qualified professional can advise on your rights.
          </div>
          <div className="account">
            <span className="avatar">
              {demo ? "E" : (user?.email?.[0] ?? "U").toUpperCase()}
            </span>
            <div>
              <div className="small">
                {demo ? "Example workspace" : "Your workspace"}
              </div>
              <div className="muted" style={{ fontSize: 10 }}>
                {demo ? "Read-only preview" : "Private to your account"}
              </div>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => void logout()}
            >
              <LogOut size={15} />
            </button>
          </div>
        </aside>
        <main className="main" id="main-content">
          <header className="topbar">
            <div className="breadcrumbs">
              <button
                className="icon-button"
                aria-label="All agreements"
                onClick={() => setReview(null)}
              >
                <FolderOpen size={14} />
              </button>
              <span>Workspace</span>
              <ChevronRight size={12} />
              <span>{review ? "Agreement review" : "Agreements"}</span>
            </div>
            <div className="top-actions">
              <span className="small muted">
                <span className="status-dot" />
                {demo ? "Read-only example" : "Private workspace"}
              </span>
              <button
                className="btn small"
                onClick={() => (demo ? void login() : void logout())}
              >
                {demo ? "Sign in" : "Sign out"}
                <ArrowRight size={13} />
              </button>
            </div>
          </header>
          <section className="page-head">
            <div className="head-row">
              <div>
                <h1>{review ? review.title : "Your agreements"}</h1>
                <p className="head-copy">
                  {review
                    ? "A closer look at the terms that shape your work."
                    : "A place for the agreements behind your independent work."}
                </p>
              </div>
              {review ? (
                <button
                  className="btn"
                  onClick={buildBrief}
                  disabled={!selected.length}
                >
                  <ClipboardList size={15} />
                  Prepare brief{selected.length > 0 && ` (${selected.length})`}
                </button>
              ) : (
                <button
                  className="btn primary"
                  onClick={() => (demo ? void login() : setIntake(true))}
                >
                  <Plus size={15} />
                  Review agreement
                </button>
              )}
            </div>
            {review && (
              <>
                <div className="metadata">
                  <span>
                    <FileText size={12} />
                    {review.context.workType}
                  </span>
                  <span>Client in {review.context.clientCountry}</span>
                  <span>
                    <span className="status-dot" />
                    {review.context.signingStatus === "signed"
                      ? "Already signed"
                      : "Before signing"}
                  </span>
                  <span>
                    {review.versions.length === 1
                      ? "Original agreement"
                      : "2 document versions"}
                  </span>
                </div>
                <div
                  className="tabs"
                  role="tablist"
                  aria-label="Agreement views"
                >
                  {tabs.map(({ id, name, icon: Icon }) => (
                    <button
                      key={id}
                      className={`tab ${view === id ? "active" : ""}`}
                      role="tab"
                      aria-selected={view === id}
                      aria-controls={`panel-${id}`}
                      id={`tab-${id}`}
                      onClick={() => {
                        setView(id);
                        setError("");
                      }}
                    >
                      <Icon size={15} />
                      {name}
                      {id === "review" && review.analysis && (
                        <span className="tab-number">
                          {review.analysis.findings.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
          <div className="content">
            {demo && (
              <div className="notice">
                <BookOpen size={15} />
                <span>
                  <strong>Fictional example.</strong> These findings are
                  editorial examples, not a live AI result. Sign in to review
                  your own demo-safe agreement.
                </span>
              </div>
            )}
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {busy && (
              <div className="progress" role="status">
                <LoaderCircle size={16} className="spin" />
                {busy}
              </div>
            )}
            {!review ? (
              <>
                <div className="section-heading">
                  <h2>All agreements</h2>
                  <span className="small muted">
                    {demo ? 1 : reviews.length}{" "}
                    {reviews.length === 1 ? "agreement" : "agreements"}
                  </span>
                </div>
                {(demo ? [exampleReview] : reviews).length ? (
                  <table className="review-list">
                    <thead>
                      <tr>
                        <th>Agreement</th>
                        <th>Created</th>
                        <th>Status</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(demo ? [exampleReview] : reviews).map((r) => (
                        <tr key={r.id}>
                          <td>
                            <button
                              className="text"
                              onClick={() => openReview(r)}
                            >
                              {r.title}
                            </button>
                            <div className="small muted">
                              {r.context.workType}
                            </div>
                          </td>
                          <td>
                            {new Date(r.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td>
                            {r.analysis
                              ? `${r.analysis.findings.length} findings`
                              : "Ready to review"}
                          </td>
                          <td>
                            <button
                              className="icon-button"
                              aria-label={`Open ${r.title}`}
                              onClick={() => openReview(r)}
                            >
                              <ArrowRight size={17} />
                            </button>
                            {!demo && (
                              <button
                                className="icon-button"
                                aria-label={`Delete ${r.title}`}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Delete this agreement and its saved results? This cannot be undone.",
                                    )
                                  )
                                    void run(
                                      "Deleting agreement...",
                                      async () => {
                                        await api(
                                          `/api/reviews/${r.id}`,
                                          "DELETE",
                                        );
                                        setReviews((old) =>
                                          old.filter(
                                            (item) => item.id !== r.id,
                                          ),
                                        );
                                        setToast("Agreement deleted.");
                                      },
                                    );
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty">
                    <FilePlus2 size={35} />
                    <h2>Your first agreement starts here.</h2>
                    <p>
                      Add a demo-safe agreement and tell us what matters most to
                      you.
                    </p>
                    <button
                      className="btn primary"
                      onClick={() => setIntake(true)}
                    >
                      <Plus size={15} />
                      Review agreement
                    </button>
                  </div>
                )}
                {nextOffset !== null && !demo && (
                  <button
                    className="btn"
                    style={{ marginTop: 20 }}
                    disabled={!!busy}
                    onClick={() =>
                      void run("Loading older agreements...", async () => {
                        const data = await api<{
                          reviews: Review[];
                          hasMore: boolean;
                          nextOffset: number;
                        }>(`/api/reviews?offset=${nextOffset}`);
                        setReviews((old) => [
                          ...old,
                          ...data.reviews.filter(
                            (item) => !old.some((r) => r.id === item.id),
                          ),
                        ]);
                        setNextOffset(data.hasMore ? data.nextOffset : null);
                      })
                    }
                  >
                    Load older agreements
                  </button>
                )}
              </>
            ) : (
              <div
                role="tabpanel"
                id={`panel-${view}`}
                aria-labelledby={`tab-${view}`}
              >
                {view === "review" && (
                  <>
                    <div className="mobile-switch">
                      <button
                        className={mobilePane === "findings" ? "active" : ""}
                        onClick={() => setMobilePane("findings")}
                      >
                        Findings
                      </button>
                      <button
                        className={mobilePane === "document" ? "active" : ""}
                        onClick={() => setMobilePane("document")}
                      >
                        Agreement
                      </button>
                    </div>
                    {review.versions.length > 1 && (
                      <div className="filter-row">
                        {review.versions.map((v, i) => (
                          <button
                            className={`filter ${activeVersion === i ? "active" : ""}`}
                            key={v.id}
                            onClick={() => setActiveVersion(i)}
                          >
                            {i === 0 ? "Original" : "Revision"}
                          </button>
                        ))}
                      </div>
                    )}
                    <div
                      ref={desk}
                      className="desk"
                      style={
                        { "--doc-width": `${docWidth}%` } as React.CSSProperties
                      }
                    >
                      <DocumentView
                        key={`${review.versions[activeVersion].id}:${highlighted ?? ""}`}
                        document={review.versions[activeVersion]}
                        highlighted={highlighted}
                        file={files[review.versions[activeVersion].id]}
                        hidden={mobilePane !== "document"}
                      />
                      <div
                        className="resizer"
                        role="separator"
                        tabIndex={0}
                        aria-label="Resize document pane"
                        aria-orientation="vertical"
                        aria-valuenow={docWidth}
                        aria-valuemin={35}
                        aria-valuemax={65}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowLeft")
                            setDocWidth((w) => Math.max(35, w - 2));
                          if (e.key === "ArrowRight")
                            setDocWidth((w) => Math.min(65, w + 2));
                        }}
                        onPointerDown={(e) => {
                          e.currentTarget.setPointerCapture(e.pointerId);
                        }}
                        onPointerMove={(e) => {
                          if (
                            !e.currentTarget.hasPointerCapture(e.pointerId) ||
                            !desk.current
                          )
                            return;
                          const rect = desk.current.getBoundingClientRect();
                          setDocWidth(
                            Math.max(
                              35,
                              Math.min(
                                65,
                                ((e.clientX - rect.left) / rect.width) * 100,
                              ),
                            ),
                          );
                        }}
                      />
                      <section
                        className={`findings ${mobilePane !== "findings" ? "mobile-hidden" : ""}`}
                        aria-label="Contract findings"
                      >
                        <div className="section-heading">
                          <h2>Worth a closer look</h2>
                          <span className="small muted">
                            {review.analysis?.findings.length ?? 0} findings
                          </span>
                        </div>
                        {review.analysis ? (
                          <>
                            <p className="summary-line">
                              Prioritized for{" "}
                              <strong>
                                {review.context.priorities
                                  .join(", ")
                                  .toLowerCase()}
                              </strong>
                              .
                            </p>
                            <div className="filter-row">
                              {[
                                ["all", "All findings"],
                                ["high", "High priority"],
                                ["medium", "Consider carefully"],
                                ["low", "For awareness"],
                              ].map(([id, label]) => (
                                <button
                                  key={id}
                                  className={`filter ${filter === id ? "active" : ""}`}
                                  onClick={() => setFilter(id)}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            {review.analysis.findings
                              .filter(
                                (f) =>
                                  filter === "all" || f.severity === filter,
                              )
                              .map((f) => (
                                <article className="finding" key={f.id}>
                                  <div className="finding-top">
                                    <span className={`severity ${f.severity}`}>
                                      <CircleAlert size={12} />
                                      {f.severity === "high"
                                        ? "HIGH PRIORITY"
                                        : f.severity === "medium"
                                          ? "CONSIDER CAREFULLY"
                                          : "FOR AWARENESS"}{" "}
                                      / {f.category.toUpperCase()}
                                    </span>
                                    <label className="selection">
                                      <input
                                        type="checkbox"
                                        checked={selected.includes(f.id)}
                                        onChange={() => toggleBriefFinding(f.id)}
                                      />
                                      Brief
                                    </label>
                                  </div>
                                  <h3>{f.title}</h3>
                                  <p>{f.explanation}</p>
                                  {citations(f.evidence)}
                                  <details
                                    style={{ fontSize: 12, marginTop: 10 }}
                                  >
                                    <summary className="muted">
                                      Why it matters to you
                                    </summary>
                                    <p>{f.relevance}</p>
                                  </details>
                                  <div className="question">
                                    <strong>A question to ask</strong>
                                    {f.question}
                                  </div>
                                </article>
                              ))}
                            {review.analysis.findings.filter(
                              (f) => filter === "all" || f.severity === filter,
                            ).length === 0 && (
                              <p className="muted">
                                No findings in this category.
                              </p>
                            )}
                            <div className="legal-note">
                              <h3>Not established by the agreement</h3>
                              <ul>
                                {review.analysis.missingInformation.map(
                                  (item) => (
                                    <li key={item}>{item}</li>
                                  ),
                                )}
                              </ul>
                            </div>
                            <ActionPlan
                              analysis={review.analysis}
                              context={review.context}
                              selected={selected}
                              onSelect={toggleBriefFinding}
                              onCite={cite}
                            />
                            <div className="qa">
                              <h3>Ask about this agreement</h3>
                              <form
                                className="qa-form"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (demo) {
                                    setError(
                                      "Sign in to ask a live question about your own agreement.",
                                    );
                                    return;
                                  }
                                  void run(
                                    "Checking the agreement...",
                                    async () => {
                                      const data = await api<{
                                        result: ScenarioResult;
                                      }>(
                                        `/api/reviews/${review.id}/question`,
                                        "POST",
                                        { question },
                                      );
                                      setAnswer(data.result);
                                    },
                                  );
                                }}
                              >
                                <label className="sr-only" htmlFor="question">
                                  Your question
                                </label>
                                <input
                                  id="question"
                                  value={question}
                                  onChange={(e) => setQuestion(e.target.value)}
                                  maxLength={2000}
                                  required
                                  placeholder="What happens if the client cancels?"
                                />
                                <button
                                  className="btn primary"
                                  aria-label="Ask question"
                                  disabled={!!busy}
                                >
                                  <ArrowRight size={16} />
                                </button>
                              </form>
                              {answer && (
                                <div className="qa-answer">
                                  <p>{answer.answer}</p>
                                  {citations(answer.evidence)}
                                  {answer.missingInformation.map((item) => (
                                    <p key={item} className="muted">
                                      Not established: {item}
                                    </p>
                                  ))}
                                  {answer.assumptions.map((item) => (
                                    <p key={item}>Assumption: {item}</p>
                                  ))}
                                  {answer.professionalAdvice.map((item) => (
                                    <p key={item}>Ask a professional: {item}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="empty">
                            <Sparkles size={28} />
                            <h2>Ready for a closer look.</h2>
                            <p>
                              The analysis will use your priorities and cite the
                              original agreement.
                            </p>
                            <button
                              className="btn primary"
                              onClick={() => void analyze()}
                              disabled={!!busy}
                            >
                              <Sparkles size={15} />
                              Analyze agreement
                            </button>
                          </div>
                        )}
                        <LegalContext />
                        <div className="legal-note">
                          <h3>
                            <ShieldCheck size={14} /> About this review
                          </h3>
                          <p>
                            Findings explain document wording, not
                            enforceability. Indian legal context and
                            professional advice are separate from what the
                            agreement says.
                          </p>
                          <a
                            href="https://www.indiacode.nic.in/"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Browse legislation on India Code{" "}
                            <ExternalLink size={10} />
                          </a>
                          <a
                            href="https://copyright.gov.in/Copyright_Act_1957/index.html"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Copyright Act, 1957 <ExternalLink size={10} />
                          </a>
                        </div>
                      </section>
                    </div>
                  </>
                )}
                {view === "compare" && (
                  <section className="wide-section">
                    <div className="section-intro">
                      <div>
                        <h2>What changed. What it means.</h2>
                        <p>
                          Compare the original agreement with a revision. Every
                          interpretation stays connected to the wording on both
                          sides.
                        </p>
                      </div>
                      <button
                        className="btn"
                        onClick={() =>
                          demo
                            ? setError(
                                "Sign in to compare your own agreement versions.",
                              )
                            : setRevision(true)
                        }
                        disabled={!!busy}
                      >
                        <FilePlus2 size={15} />
                        {review.versions.length > 1
                          ? "Replace revision"
                          : "Add revision"}
                      </button>
                    </div>
                    {review.versions.length < 2 ? (
                      <div className="empty">
                        <GitCompareArrows size={34} />
                        <h2>A second version tells another story.</h2>
                        <p>
                          Add the revised agreement to inspect changes in
                          payment, scope, ownership, and exit terms.
                        </p>
                      </div>
                    ) : (
                      <>
                        {!review.comparison ? (
                          <div className="empty">
                            <h2>Both versions are ready.</h2>
                            <p>
                              {review.versions[0].title} /{" "}
                              {review.versions[1].title}
                            </p>
                            <button
                              className="btn primary"
                              disabled={!!busy}
                              onClick={() =>
                                void run(
                                  "Comparing versions and checking both sources...",
                                  async () => {
                                    const data = await api<{ review: Review }>(
                                      `/api/reviews/${review.id}/compare`,
                                      "POST",
                                      {},
                                    );
                                    sync(data.review);
                                  },
                                )
                              }
                            >
                              Compare agreements
                              <ArrowRight size={15} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="summary-line">
                              {review.comparison.summary}
                            </p>
                            {review.comparison.changes.map((change) => (
                              <article
                                className="comparison-row"
                                key={change.id}
                              >
                                <span className="severity low">
                                  {change.kind.toUpperCase()}
                                </span>
                                <h3>{change.title}</h3>
                                <div className="comparison-columns">
                                  <div className="quote-box">
                                    <small>ORIGINAL AGREEMENT</small>
                                    {change.before.length
                                      ? change.before.map((c) => (
                                          <p key={c.sourceId}>{c.quote}</p>
                                        ))
                                      : "No matching original passage."}
                                    {citations(change.before)}
                                  </div>
                                  <div className="quote-box after">
                                    <small>REVISED AGREEMENT</small>
                                    {change.after.length
                                      ? change.after.map((c) => (
                                          <p key={c.sourceId}>{c.quote}</p>
                                        ))
                                      : "Removed from this version."}
                                    {citations(change.after)}
                                  </div>
                                </div>
                                <p className="small muted">
                                  Interpretation: {change.significance}
                                </p>
                              </article>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </section>
                )}
                {view === "scenarios" && (
                  <ScenarioView
                    review={review}
                    demo={demo}
                    citations={citations}
                  />
                )}
                {view === "brief" && (
                  <section className="wide-section">
                    <div className="section-intro">
                      <div>
                        <h2>Your next conversation, prepared.</h2>
                        <p>
                          A working brief for your client or a qualified legal
                          professional. Edit it to reflect what you want to ask.
                        </p>
                      </div>
                      <div className="inline-group">
                        <button
                          className="btn"
                          disabled={!brief}
                          onClick={() => window.print()}
                        >
                          <ArrowDownToLine size={15} />
                          Print / PDF
                        </button>
                        <button
                          className="btn primary"
                          disabled={demo || !brief || !!busy}
                          onClick={() =>
                            void run("Saving brief...", async () => {
                              const data = await api<{ review: Review }>(
                                `/api/reviews/${review.id}`,
                                "PATCH",
                                { brief },
                              );
                              sync(data.review);
                              setToast("Brief saved.");
                            })
                          }
                        >
                          <Check size={15} />
                          Save brief
                        </button>
                      </div>
                    </div>
                    {brief ? (
                      <div className="brief-sheet">
                        <h2>{review.title}</h2>
                        <p className="small muted">
                          Negotiation notes / {review.context.workType} /
                          Original version
                        </p>
                        <label className="sr-only" htmlFor="brief-text">
                          Edit negotiation brief
                        </label>
                        <textarea
                          className="edit-area screen-only"
                          id="brief-text"
                          style={{ minHeight: 550 }}
                          value={brief}
                          maxLength={30000}
                          onChange={(e) => setBrief(e.target.value)}
                        />
                        <pre className="print-brief">{brief}</pre>
                        <div className="legal-note">
                          Information and assistance, not legal advice. Verify
                          the final wording with a qualified professional.
                        </div>
                      </div>
                    ) : (
                      <div className="empty">
                        <ClipboardList size={34} />
                        <h2>Keep the questions that matter.</h2>
                        <p>
                          Select findings in Review, then prepare your brief.
                        </p>
                        <button
                          className="btn"
                          onClick={() => setView("review")}
                        >
                          <ArrowLeft size={15} />
                          Back to findings
                        </button>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      <Intake open={intake} onOpenChange={setIntake} onSubmit={create} />
      <Intake
        open={revision}
        onOpenChange={setRevision}
        revision
        onSubmit={addRevision}
      />
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
function sourceLabel(review: Review, id: string) {
  for (let i = 0; i < review.versions.length; i++) {
    const span = review.versions[i].spans.find((s) => s.id === id);
    if (span)
      return `${i ? "Revision" : "Original"} · p. ${span.page}, ¶ ${span.paragraph}`;
  }
  return "Source passage";
}
