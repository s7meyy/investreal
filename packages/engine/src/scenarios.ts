import type { Metrics, Opportunity } from './types.js';
import { computeMetrics } from './metrics.js';

export interface ScenarioShift {
  marketRent: number;      // مضاعف
  growthDelta: number;     // نقاط تُضاف للنمو
  occupancyDelta: number;  // نقاط تُضاف للإشغال
  fitout: number;          // مضاعف
  maintenance: number;     // مضاعف
}

export const SCENARIO_SHIFTS: Record<'pessimistic' | 'base' | 'optimistic', ScenarioShift> = {
  pessimistic: { marketRent: 0.85, growthDelta: -0.03, occupancyDelta: -0.12, fitout: 1.4, maintenance: 1.5 },
  base: { marketRent: 1, growthDelta: 0, occupancyDelta: 0, fitout: 1, maintenance: 1 },
  optimistic: { marketRent: 1.07, growthDelta: 0.02, occupancyDelta: 0.05, fitout: 0.8, maintenance: 0.8 },
};

export function applyShift(o: Opportunity, s: ScenarioShift): Opportunity {
  const c = structuredClone(o);
  c.revenue.units = o.revenue.units.map((u) => ({ ...u, marketRentAnnual: u.marketRentAnnual * s.marketRent }));
  c.revenue.growthRate = Math.max(0, o.revenue.growthRate + s.growthDelta);
  c.revenue.occupancy = clamp01(o.revenue.occupancy + s.occupancyDelta);
  c.revenue.firstYearOccupancy = clamp01(o.revenue.firstYearOccupancy + s.occupancyDelta);
  c.costs.fitout = o.costs.fitout * s.fitout;
  c.costs.maintenance = o.costs.maintenance * s.maintenance;
  return c;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function computeScenarios(o: Opportunity): { pessimistic: Metrics; base: Metrics; optimistic: Metrics } {
  return {
    pessimistic: computeMetrics(applyShift(o, SCENARIO_SHIFTS.pessimistic)),
    base: computeMetrics(o),
    optimistic: computeMetrics(applyShift(o, SCENARIO_SHIFTS.optimistic)),
  };
}
