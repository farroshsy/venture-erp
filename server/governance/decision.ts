import type { DecisionCriterionKey, DecisionPath } from "@shared/domain/platform";

export type DecisionCriterion = {
  key: DecisionCriterionKey;
  weight: number;
  sap: number;
  alternative: number;
  custom: number;
  note?: string;
};

export type DecisionEvaluation = {
  recommendation: DecisionPath;
  scores: Record<DecisionPath, number>;
  weightedMaximum: number;
  confidence: "low" | "moderate" | "high";
  interpretation: string;
};

const paths: DecisionPath[] = ["sap", "alternative", "custom"];

export function evaluateBuildBuy(criteria: DecisionCriterion[]): DecisionEvaluation {
  const weightedMaximum = criteria.reduce((total, criterion) => total + criterion.weight * 5, 0);
  const scores = criteria.reduce<Record<DecisionPath, number>>((totals, criterion) => {
    paths.forEach(path => {
      totals[path] += criterion.weight * criterion[path];
    });
    return totals;
  }, { sap: 0, alternative: 0, custom: 0 });

  const ordered = [...paths].sort((left, right) => scores[right] - scores[left]);
  const recommendation = ordered[0];
  const margin = scores[ordered[0]] - scores[ordered[1]];
  const percentage = weightedMaximum === 0 ? 0 : margin / weightedMaximum;
  const confidence = percentage >= 0.18 ? "high" : percentage >= 0.08 ? "moderate" : "low";

  const interpretation = confidence === "low"
    ? "The leading option is close to the next alternative. Treat this as a decision for human review, additional evidence, and scenario testing rather than a procurement recommendation."
    : `The leading option has a ${confidence} score margin under the declared criteria. Human approval remains required before the decision becomes a governing record.`;

  return { recommendation, scores, weightedMaximum, confidence, interpretation };
}

export function validateDecisionCriteria(criteria: DecisionCriterion[]) {
  const keys = new Set(criteria.map(criterion => criterion.key));
  const requiredKeys: DecisionCriterionKey[] = [
    "differentiation",
    "compliance",
    "integration",
    "totalCost",
    "lockIn",
    "deliveryCapacity",
  ];
  return requiredKeys.every(key => keys.has(key)) && keys.size === requiredKeys.length;
}
