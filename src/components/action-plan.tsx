import { Check, ClipboardPlus, FileSearch } from "lucide-react";
import type { Analysis, Citation, UserContext } from "@/lib/domain";
import {
  decisionChecklist,
  findingById,
  negotiationActions,
} from "@/lib/action-plan";

export function ActionPlan({
  analysis,
  context,
  selected,
  onSelect,
  onCite,
}: {
  analysis: Analysis;
  context: UserContext;
  selected: string[];
  onSelect: (id: string) => void;
  onCite: (citation: Citation) => void;
}) {
  const actions = negotiationActions(analysis, context);
  const checklist = decisionChecklist(analysis);
  return (
    <section className="action-plan" aria-label="Freelancer decision plan">
      <div className="action-plan-heading">
        <div>
          <span className="eyebrow">Before you sign</span>
          <h3>Your next moves</h3>
        </div>
        <ClipboardPlus size={18} aria-hidden="true" />
      </div>
      <ol className="action-list">
        {actions.map((action) => {
          const finding = findingById(analysis, action.findingId);
          if (!finding) return null;
          const selectedForBrief = selected.includes(action.findingId);
          return (
            <li key={action.findingId}>
              <span className="action-priority">{action.priority}</span>
              <strong>{action.title}</strong>
              <p>{action.request}</p>
              <div className="action-controls">
                <button
                  className="citation"
                  onClick={() => onCite(finding.evidence[0])}
                >
                  <FileSearch size={12} />
                  Open evidence
                </button>
                <button
                  className={`filter ${selectedForBrief ? "active" : ""}`}
                  onClick={() => onSelect(action.findingId)}
                >
                  {selectedForBrief && <Check size={12} />}
                  {selectedForBrief ? "In brief" : "Add to brief"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="decision-checklist">
        <h4>Pre-signing checklist</h4>
        <ul>
          {checklist.map((item) => (
            <li key={item.label}>
              <span className={`check-status ${item.status}`}>
                {item.status === "covered" ? "COVERED" : "CHECK"}
              </span>
              <div>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
