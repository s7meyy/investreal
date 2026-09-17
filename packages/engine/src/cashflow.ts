import type { Opportunity, PeriodRow, AnnualRow } from './types.js';
import { elapsedSolarYears, monthSolarFraction, termMonths } from './calendar.js';

/** إجمالي إيجار السوق السنوي لكل الوحدات. */
export function totalMarketRentAnnual(o: Opportunity): number {
  return o.revenue.units.reduce((s, u) => s + u.marketRentAnnual * u.count, 0);
}

/** النمو الفعلي بعد تطبيق السقف التنظيمي إن وُجد. */
export function effectiveGrowth(o: Opportunity): number {
  const { growthRate, growthCap } = o.revenue;
  return growthCap === undefined ? growthRate : Math.min(growthRate, growthCap);
}

/** جدول دفعات الإيجار التعاقدي: شهر الدفع ← المبلغ. */
export function paymentSchedule(o: Opportunity): Map<number, number> {
  const { payment, termYears, contractRentAnnual, contractEscalation } = o.deal;
  const map = new Map<number, number>();
  const add = (month: number, amount: number) =>
    map.set(month, (map.get(month) ?? 0) + amount);

  /** الإيجار المستحق عن السنة التعاقدية رقم y (1-based). */
  const yearRent = (y: number) => contractRentAnnual * (1 + contractEscalation) ** (y - 1);

  switch (payment.kind) {
    case 'upfront_full': {
      let total = 0;
      for (let y = 1; y <= termYears; y++) total += yearRent(y);
      add(0, total);
      break;
    }
    case 'annual': {
      // السنوات التعاقدية تبدأ بعد فترة السماح، فهي حيازة بلا مقابل.
      for (let y = 1; y <= termYears; y++) add(o.deal.graceMonths + (y - 1) * 12, yearRent(y));
      break;
    }
    case 'custom': {
      for (const item of payment.items) add(item.month, item.amount);
      break;
    }
  }
  return map;
}

/**
 * نسبة الإشغال في شهر معيّن.
 *
 * فترة التجهيز والتسويق الميتة يلتقطها `firstYearOccupancy` لا فترة السماح:
 * التجهيز يحدث سواء مُنحت سماحاً أم لا. خصمه مرة ثانية عن أشهر السماح
 * يُظهر ورقةً تفاوضية نافعة وكأنها خسارة.
 */
function occupancyAt(o: Opportunity, month: number): number {
  return month < 12 ? o.revenue.firstYearOccupancy : o.revenue.occupancy;
}

/**
 * بناء جدول التدفقات النقدية شهرياً.
 *
 * الإيراد يُحسب بالزمن الحقيقي (حصة الشهر من السنة الشمسية)، والالتزام
 * التعاقدي بتقويم العقد — وهنا يظهر أثر اختيار التقويم الهجري أو الميلادي.
 */
export function buildCashflow(o: Opportunity): PeriodRow[] {
  const cal = o.deal.calendar;
  // فترة السماح = أشهر حيازة إضافية بنفس المبلغ، لا اقتطاع من المدة.
  // وهذا مصدر قيمتها التفاوضية: المالك يقبض نفس الإجمالي وأنت تكسب وقتاً.
  const months = termMonths(o.deal.termYears) + o.deal.graceMonths;
  const frac = monthSolarFraction(cal);
  const g = effectiveGrowth(o);
  const marketAnnual = totalMarketRentAnnual(o);
  const payments = paymentSchedule(o);
  const c = o.costs;
  const f = o.finance;

  const rows: PeriodRow[] = [];

  // الشهر صفر: رأس المال فقط (تأثيث + أي دفعة عند التوقيع).
  rows.push({
    month: 0,
    elapsedSolarYears: 0,
    potentialIncome: 0,
    collectedIncome: 0,
    otherIncome: 0,
    operatingCosts: 0,
    contractRentPaid: (payments.get(0) ?? 0) * (f.vatApplies ? 1 + f.vatRate : 1),
    capitalCosts: c.fitout,
    tax: 0,
    net: -(c.fitout + (payments.get(0) ?? 0) * (f.vatApplies ? 1 + f.vatRate : 1)),
  });

  for (let m = 1; m <= months; m++) {
    const elapsed = elapsedSolarYears(m - 1, cal);
    const inflationFactor = (1 + c.costInflation) ** elapsed;

    const potential = marketAnnual * (1 + g) ** elapsed * frac;
    const occ = occupancyAt(o, m - 1);
    const collected = potential * occ * (1 - o.revenue.badDebt);
    const other = o.revenue.otherIncomeAnnual * frac * inflationFactor * (occ > 0 ? 1 : 0);

    const operating =
      potential * c.maintenance +
      potential * c.capexReserve +
      collected * (c.management + c.marketing) +
      (c.insuranceAnnual + c.utilitiesAnnual + c.feesAnnual) * frac * inflationFactor;

    const rentPaid = (payments.get(m) ?? 0) * (f.vatApplies ? 1 + f.vatRate : 1);

    const preTax = collected + other - operating - rentPaid;
    const tax = f.zakatApplies && preTax > 0 ? preTax * f.zakatRate : 0;

    const isLast = m === months;
    const capital = isLast ? c.restoration - c.fitoutSalvage : 0;

    rows.push({
      month: m,
      elapsedSolarYears: elapsed,
      potentialIncome: potential,
      collectedIncome: collected,
      otherIncome: other,
      operatingCosts: operating,
      contractRentPaid: rentPaid,
      capitalCosts: capital,
      tax,
      net: preTax - tax - capital,
    });
  }

  return rows;
}

/** تجميع الجدول الشهري إلى سنوات تعاقدية للعرض. */
export function toAnnual(rows: PeriodRow[]): AnnualRow[] {
  const years = new Map<number, AnnualRow>();
  let cumulative = 0;

  for (const r of rows) {
    // الشهر صفر يُضم إلى السنة صفر (التأسيس)، وباقي الأشهر إلى سنواتها.
    const year = r.month === 0 ? 0 : Math.ceil(r.month / 12);
    let row = years.get(year);
    if (!row) {
      row = {
        year, income: 0, operatingCosts: 0, contractRentPaid: 0,
        capitalCosts: 0, tax: 0, net: 0, cumulative: 0,
      };
      years.set(year, row);
    }
    row.income += r.collectedIncome + r.otherIncome;
    row.operatingCosts += r.operatingCosts;
    row.contractRentPaid += r.contractRentPaid;
    row.capitalCosts += r.capitalCosts;
    row.tax += r.tax;
    row.net += r.net;
  }

  const out = [...years.values()].sort((a, b) => a.year - b.year);
  for (const row of out) {
    cumulative += row.net;
    row.cumulative = cumulative;
  }
  return out;
}
