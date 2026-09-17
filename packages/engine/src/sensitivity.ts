import type { Opportunity, TornadoItem } from './types.js';
import { computeMetrics } from './metrics.js';

type Mutator = (o: Opportunity, factor: number) => void;

interface Variable { key: string; label: string; apply: Mutator }

const VARIABLES: Variable[] = [
  { key: 'marketRent', label: 'إيجار السوق', apply: (o, f) => { o.revenue.units = o.revenue.units.map((u) => ({ ...u, marketRentAnnual: u.marketRentAnnual * f })); } },
  { key: 'occupancy', label: 'نسبة الإشغال', apply: (o, f) => { o.revenue.occupancy = Math.min(1, o.revenue.occupancy * f); o.revenue.firstYearOccupancy = Math.min(1, o.revenue.firstYearOccupancy * f); } },
  { key: 'contractRent', label: 'الإيجار التعاقدي', apply: (o, f) => { o.deal.contractRentAnnual *= f; } },
  { key: 'fitout', label: 'تكلفة التجهيز', apply: (o, f) => { o.costs.fitout *= f; } },
  { key: 'growth', label: 'نمو الإيجارات', apply: (o, f) => { o.revenue.growthRate *= f; } },
  { key: 'maintenance', label: 'الصيانة', apply: (o, f) => { o.costs.maintenance *= f; } },
  { key: 'management', label: 'الإدارة والعمولات', apply: (o, f) => { o.costs.management *= f; } },
];

/**
 * تحليل الحساسية: نحرّك كل متغيّر ±swing ونقيس أثره على العائد الداخلي،
 * ثم نرتّب المتغيّرات حسب قوة الأثر — فيعرف المستثمر أين يركّز تحقّقه الميداني.
 */
export function computeSensitivity(o: Opportunity, swing = 0.2): TornadoItem[] {
  const items: TornadoItem[] = [];
  for (const v of VARIABLES) {
    const low = structuredClone(o);
    v.apply(low, 1 - swing);
    const high = structuredClone(o);
    v.apply(high, 1 + swing);
    const lowIrr = computeMetrics(low).irr;
    const highIrr = computeMetrics(high).irr;
    items.push({
      variable: v.key,
      label: v.label,
      lowIrr,
      highIrr,
      swing: lowIrr !== null && highIrr !== null ? Math.abs(highIrr - lowIrr) : 0,
    });
  }
  return items.sort((a, b) => b.swing - a.swing);
}
