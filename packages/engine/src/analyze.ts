import type { AnalysisResult, Opportunity } from './types.js';
import { buildCashflow, toAnnual } from './cashflow.js';
import { computeMetrics } from './metrics.js';
import { computeScenarios } from './scenarios.js';
import { computeSensitivity } from './sensitivity.js';
import { computeRisk } from './risk.js';
import { computeCeilings } from './solver.js';
import { buildRecommendations } from './advisor.js';
import { computeVerdict } from './verdict.js';
import { validate } from './validate.js';
import { computeSyndication, reinvestmentFor } from './syndication.js';
import { termSensitivity } from './term.js';

export const ENGINE_VERSION = '0.1.0';

/** التحليل الكامل لفرصة واحدة — نقطة الدخول الوحيدة التي تحتاجها الواجهة. */
export function analyze(o: Opportunity): AnalysisResult {
  const periods = buildCashflow(o);
  const metrics = computeMetrics(o, periods);
  const risk = computeRisk(o, metrics);
  const ceilings = computeCeilings(o);
  const sensitivity = computeSensitivity(o);

  return {
    engineVersion: ENGINE_VERSION,
    periods,
    annual: toAnnual(periods),
    metrics,
    scenarios: computeScenarios(o),
    sensitivity,
    risk,
    ceilings,
    recommendations: buildRecommendations(o, metrics, ceilings, risk, sensitivity),
    verdict: computeVerdict(o, metrics, risk),
    warnings: validate(o),
    syndication: computeSyndication(o, periods, metrics),
    reinvestment: reinvestmentFor(o, metrics),
    termSensitivity: termSensitivity(o),
  };
}
