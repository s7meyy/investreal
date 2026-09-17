import type { Opportunity, PeriodRow, Metrics } from './types.js';
import { buildCashflow, totalMarketRentAnnual } from './cashflow.js';
import { SOLAR_YEAR_DAYS, monthDays } from './calendar.js';

/** نقاط التدفق النقدي: مبلغ + زمنه بالسنوات الشمسية (يسمح بفترات غير منتظمة). */
export interface CashPoint { years: number; amount: number }

export function toCashPoints(rows: PeriodRow[], calendar: 'gregorian' | 'hijri'): CashPoint[] {
  const md = monthDays(calendar);
  // تدفق الشهر m يقع في نهايته: (m × طول الشهر) ÷ أيام السنة الشمسية.
  return rows.map((r) => ({
    years: r.month === 0 ? 0 : (r.month * md) / SOLAR_YEAR_DAYS,
    amount: r.net,
  }));
}

export function npv(rate: number, points: CashPoint[]): number {
  return points.reduce((s, p) => s + p.amount / (1 + rate) ** p.years, 0);
}

function bisect(f: (r: number) => number, lo: number, hi: number): number {
  let a = lo, b = hi, fa = f(a);
  for (let i = 0; i < 200; i++) {
    const mid = (a + b) / 2;
    const fm = f(mid);
    if (fa * fm <= 0) b = mid;
    else { a = mid; fa = fm; }
  }
  return (a + b) / 2;
}

/**
 * معدل العائد الداخلي بطريقة XIRR (فترات غير منتظمة).
 *
 * لا نقوّس من طرفَي المجال: آخر شهر يحمل تكلفة إعادة الحال، فتتعدّد تغيّرات
 * الإشارة ويظهر جذر وهمي قرب ‎-١٠٠٪‎ لا معنى اقتصادياً له. لذلك ننطلق من الصفر:
 * إن كان مجموع التدفقات موجباً فالعائد موجب ونصعد، وإلا فهو سالب وننزل —
 * وفي الحالتين نلتقط أول عبور، وهو الجذر الأقرب إلى الواقع.
 */
export function irr(points: CashPoint[], lo = -0.99, hi = 10, step = 0.005): number | null {
  const f = (r: number) => npv(r, points);
  const f0 = f(0);
  if (!isFinite(f0)) return null;
  if (f0 === 0) return 0;

  if (f0 > 0) {
    let prevR = 0, prevF = f0;
    for (let r = step; r <= hi; r += step) {
      const v = f(r);
      if (!isFinite(v)) break;
      if (prevF * v <= 0) return bisect(f, prevR, r);
      prevR = r;
      prevF = v;
    }
    return null;
  }

  let prevR = 0, prevF = f0;
  for (let r = -step; r >= lo; r -= step) {
    const v = f(r);
    if (!isFinite(v)) break;
    if (prevF * v <= 0) return bisect(f, r, prevR);
    prevR = r;
    prevF = v;
  }
  return null;
}

/**
 * MIRR: يخصم السالب بتكلفة التمويل ويعيد استثمار الموجب بمعدل واقعي.
 * أصدق من IRR في هذا النموذج، لأن التدفقات السنوية لا تُعاد استثمارها بعائد ١٢٪.
 */
export function mirr(points: CashPoint[], financeRate: number, reinvestRate: number): number | null {
  const horizon = Math.max(...points.map((p) => p.years));
  if (horizon <= 0) return null;
  let pvNeg = 0, fvPos = 0;
  for (const p of points) {
    if (p.amount < 0) pvNeg += p.amount / (1 + financeRate) ** p.years;
    else fvPos += p.amount * (1 + reinvestRate) ** (horizon - p.years);
  }
  if (pvNeg === 0 || fvPos <= 0) return null;
  return (fvPos / -pvNeg) ** (1 / horizon) - 1;
}

/** عدد تغيّرات الإشارة — أكثر من واحدة يعني أن IRR قد يكون متعدد الجذور. */
export function signChanges(points: CashPoint[]): number {
  let changes = 0, prev = 0;
  for (const p of points) {
    if (p.amount === 0) continue;
    const sign = Math.sign(p.amount);
    if (prev !== 0 && sign !== prev) changes++;
    prev = sign;
  }
  return changes;
}

/** فترة الاسترداد بالسنوات الشمسية، مع استيفاء خطي داخل الفترة. */
export function payback(points: CashPoint[], rate = 0): number | null {
  let cum = 0, prevCum = 0, prevYears = 0;
  for (const p of points) {
    const disc = p.amount / (1 + rate) ** p.years;
    prevCum = cum;
    cum += disc;
    if (cum >= 0 && p.years > 0) {
      const span = p.years - prevYears;
      const need = -prevCum;
      return prevYears + (disc === 0 ? span : (need / disc) * span);
    }
    prevYears = p.years;
  }
  return null;
}

function capitalInvested(rows: PeriodRow[]): number {
  return rows.reduce((s, r) => s + Math.max(0, -r.net), 0);
}

/** أقل إشغال يجعل صافي الربح صفراً — بالتنصيف على المحرّك نفسه. */
function solveBreakevenOccupancy(o: Opportunity): number | null {
  const total = (occ: number) => {
    const clone = structuredClone(o);
    clone.revenue.occupancy = occ;
    clone.revenue.firstYearOccupancy = Math.min(occ, o.revenue.firstYearOccupancy);
    return buildCashflow(clone).reduce((s, r) => s + r.net, 0);
  };
  if (total(1) < 0) return null; // خاسر حتى بإشغال كامل
  if (total(0) >= 0) return 0;
  let lo = 0, hi = 1;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (total(mid) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** أقل إيجار سوقي سنوي تبقى معه رابحاً. */
function solveBreakevenMarketRent(o: Opportunity): number | null {
  const base = totalMarketRentAnnual(o);
  if (base <= 0) return null;
  const total = (factor: number) => {
    const clone = structuredClone(o);
    clone.revenue.units = o.revenue.units.map((u) => ({ ...u, marketRentAnnual: u.marketRentAnnual * factor }));
    return buildCashflow(clone).reduce((s, r) => s + r.net, 0);
  };
  if (total(3) < 0) return null;
  let lo = 0, hi = 3;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (total(mid) < 0) lo = mid; else hi = mid;
  }
  return base * ((lo + hi) / 2);
}

export function computeMetrics(o: Opportunity, rows = buildCashflow(o)): Metrics {
  const points = toCashPoints(rows, o.deal.calendar);
  const totalNet = rows.reduce((s, r) => s + r.net, 0);
  const invested = capitalInvested(rows);
  const r = o.finance.discountRate;

  const changes = signChanges(points);
  const rawIrr = irr(points);
  const irrReliable = changes <= 1 && rawIrr !== null;
  const value = npv(r, points);
  const horizonYears = Math.max(...points.map((p) => p.years));

  const contractAnnual = o.deal.contractRentAnnual;
  const marketAnnual = totalMarketRentAnnual(o);

  const realIrr = rawIrr === null ? null : (1 + rawIrr) / (1 + o.finance.inflation) - 1;

  // التوزيعات هي الفائض التشغيلي الموجب — رأس المال المسترد ليس ربحاً.
  const distributions = rows.reduce((s, r) => s + Math.max(0, r.net), 0);
  const avgAnnualDistribution = o.deal.termYears > 0 ? distributions / o.deal.termYears : 0;
  const totalReturnRate = invested > 0 ? totalNet / invested : 0;

  return {
    capitalInvested: invested,
    totalNet,
    roi: invested > 0 ? totalNet / invested : 0,
    irr: rawIrr,
    mirr: mirr(points, r, Math.min(r, 0.06)),
    npv: value,
    profitabilityIndex: invested > 0 ? value / invested + 1 : 0,
    cagr: invested > 0 && totalNet + invested > 0 && horizonYears > 0
      ? ((totalNet + invested) / invested) ** (1 / horizonYears) - 1
      : null,
    paybackYears: payback(points, 0),
    discountedPaybackYears: payback(points, r),
    breakevenOccupancy: solveBreakevenOccupancy(o),
    breakevenMarketRent: solveBreakevenMarketRent(o),
    discountToMarket: marketAnnual > 0 ? 1 - contractAnnual / marketAnnual : 0,
    liquidityLockRatio: o.finance.totalLiquidity ? invested / o.finance.totalLiquidity : null,
    realIrr,
    irrReliable,
    monthlyContractCost: contractAnnual / 12,
    earningsMultiple: avgAnnualDistribution > 0 ? invested / avgAnnualDistribution : null,
    avgAnnualDistribution,
    totalReturnRate,
    simpleAnnualReturn: o.deal.termYears > 0 ? totalReturnRate / o.deal.termYears : 0,
    cashOnCash: invested > 0 ? avgAnnualDistribution / invested : 0,
  };
}
