import type { Review } from "./domain";

const paragraphs = [
  "1. Parties and scope\nThis fictional agreement is between Mira Design Studio (the Freelancer) and Kaveri Goods (the Client). The Freelancer will develop a brand identity, including a logo, colour palette and brand guidelines. This example is provided only for demonstration.",
  "2. Project fee and payment\nThe total project fee is INR 80,000. The Client shall pay 25% before work begins. The remaining 75% is payable within 45 days of the Client accepting the final deliverables. Acceptance is at the sole discretion of the Client.",
  "3. Revisions\nThe Freelancer shall make all revisions requested by the Client until the Client is satisfied. No additional fees shall be payable for revisions.",
  "4. Intellectual property\nAll intellectual property rights in work produced under this agreement transfer to the Client upon creation, including drafts and unused concepts. The Freelancer must obtain written permission before displaying the work in a portfolio.",
  "5. Termination\nThe Client may terminate this agreement at any time on written notice. In that event, the Freelancer shall deliver all work in progress. The initial payment is non-refundable. No further termination payment is specified in this agreement.",
  "6. Confidentiality\nEach party will keep the other party's non-public business information confidential. This obligation continues for two years after termination.",
  "7. Governing law\nThis agreement is governed by the laws of India. The parties shall first attempt to resolve a dispute through good-faith discussion.",
];
const id = "example-v1";
export const exampleReview: Review = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Brand identity agreement",
  createdAt: "2026-09-18T09:00:00.000Z",
  context: {
    workType: "Design & creative",
    clientCountry: "India",
    signingStatus: "unsigned",
    priorities: ["Payment certainty", "Portfolio rights", "Scope protection"],
  },
  versions: [
    {
      id,
      title: "Brand identity agreement",
      spans: paragraphs.map((text, index) => ({
        id: `${id}:p1:${index + 1}`,
        page: 1,
        paragraph: index + 1,
        text,
      })),
    },
  ],
  analysis: {
    summary:
      "Payment depends on client acceptance, revisions are open-ended, and ownership transfers before the final invoice is paid. These are useful points to clarify before signing.",
    findings: [
      {
        id: "payment",
        title: "Your final payment has no fixed starting point",
        category: "Payment",
        severity: "high",
        explanation:
          "The remaining INR 60,000 is due 45 days after acceptance, but the client alone decides when to accept. The agreement does not set an acceptance deadline.",
        relevance:
          "You prioritized payment certainty. A defined review window would make the final payment date easier to establish.",
        question:
          "Can we agree to a seven-day acceptance window and a fixed payment date?",
        evidence: [
          {
            sourceId: `${id}:p1:2`,
            quote: "Acceptance is at the sole discretion of the Client.",
          },
        ],
      },
      {
        id: "revisions",
        title: "Revisions have no agreed limit",
        category: "Scope",
        severity: "high",
        explanation:
          "The agreement commits you to all requested revisions without additional fees. It does not define revision rounds or distinguish new work from corrections.",
        relevance:
          "An open revision commitment can expand your work beyond the agreed project fee.",
        question:
          "Can the fee include two revision rounds, with further work quoted separately?",
        evidence: [
          {
            sourceId: `${id}:p1:3`,
            quote: "No additional fees shall be payable for revisions.",
          },
        ],
      },
      {
        id: "ownership",
        title: "Ownership transfers before you are fully paid",
        category: "Ownership",
        severity: "medium",
        explanation:
          "The wording transfers rights when work is created, including unused concepts. Portfolio use also requires written permission.",
        relevance:
          "You prioritized portfolio rights. Both permission to display the final work and the timing of transfer need clarification.",
        question:
          "Can rights to final approved deliverables transfer after full payment, with portfolio permission recorded?",
        evidence: [
          {
            sourceId: `${id}:p1:4`,
            quote:
              "All intellectual property rights in work produced under this agreement transfer to the Client upon creation, including drafts and unused concepts.",
          },
        ],
      },
      {
        id: "termination",
        title: "Cancellation leaves completed work unresolved",
        category: "Exit",
        severity: "medium",
        explanation:
          "The initial payment is non-refundable, but the agreement does not specify further payment for work completed before cancellation.",
        relevance:
          "A cancellation halfway through may leave a gap between your completed work and the agreed payment terms.",
        question:
          "Can we define payment for completed milestones if the project is cancelled?",
        evidence: [
          {
            sourceId: `${id}:p1:5`,
            quote:
              "No further termination payment is specified in this agreement.",
          },
        ],
      },
    ],
    missingInformation: [
      "A deadline for accepting or rejecting deliverables.",
      "A limit on revision rounds.",
      "A payment formula for work completed before termination.",
    ],
  },
  comparison: null,
  brief: "",
};
