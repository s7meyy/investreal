import type { Ceiling, Opportunity } from './types.js';
import { buildCashflow, paymentSchedule } from './cashflow.js';
import { computeMetrics, irr, toCashPoints } from './metrics.js';

/** إجمالي ما سيُدفع للمالك على مدى العقد. */
export function totalContractPayments(o: Opportunity): number {
  return [...paymentSchedule(o).values()].reduce((s, v) => s + v, 0);
}

function irrAtContractRent(o: Opportunity, rent: number): number | null {
  const clone = structuredClone(o);
  clone.deal.contractRentAnnual = rent;
  const rows = buildCashflow(clone);
  return irr(toCashPoints(rows, clone.deal.calendar));
}

/**
 * الحسبة العكسية — أهم مخرَج في المنصّة.
 *
 * تُجيب: ما أقصى إيجار تعاقدي سنوي أدفعه ويبقى عائدي عند الهدف؟
 * تحوّل التفاوض من «أبغى أرخص» إلى رقم مُبرَّر.
 */
export function maxContractRentFor(o: Opportunity, targetIrr: number): number | null {
  const at = (rent: number) => {
    const v = irrAtContractRent(o, rent);
    return v === null ? -1 : v;
  };
  // بإيجار صفر يكون العائد أقصى ما يمكن؛ إن لم يبلغ الهدف فالفرصة مستحيلة أصلاً.
  if (at(0) < targetIrr) return null;
  let lo = 0;
  let hi = Math.max(o.deal.contractRentAnnual * 4, 1000);
  // وسّع الحدّ الأعلى حتى يسقط العائد دون الهدف.
  for (let i = 0; i < 20 && at(hi) >= targetIrr; i++) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid) >= targetIrr) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

const DEFAULT_TARGETS = [0.08, 0.10, 0.12, 0.15, 0.20];

export function computeCeilings(o: Opportunity, targets: number[] = DEFAULT_TARGETS): Ceiling[] {
  const out: Ceiling[] = [];
  for (const t of targets) {
    const rent = maxContractRentFor(o, t);
    if (rent === null) continue;
    const clone = structuredClone(o);
    clone.deal.contractRentAnnual = rent;
    out.push({
      targetIrr: t,
      maxContractRentAnnual: rent,
      maxUpfrontTotal: totalContractPayments(clone),
    });
  }
  return out;
}

/** أقصى تكلفة تجهيز تبقي العائد عند الهدف. */
export function maxFitoutFor(o: Opportunity, targetIrr: number): number | null {
  const at = (fitout: number) => {
    const clone = structuredClone(o);
    clone.costs.fitout = fitout;
    const v = computeMetrics(clone).irr;
    return v === null ? -1 : v;
  };
  if (at(0) < targetIrr) return null;
  let lo = 0, hi = Math.max(o.costs.fitout * 6, 10000);
  for (let i = 0; i < 20 && at(hi) >= targetIrr; i++) hi *= 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid) >= targetIrr) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
