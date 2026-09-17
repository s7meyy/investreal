import type { Metrics, Opportunity, PeriodRow, ReinvestmentRow, SyndicationResult } from './types.js';
import { buildCashflow } from './cashflow.js';
import { irr, toCashPoints } from './metrics.js';

/**
 * تجزئة الفرصة وهيكل المشغّل.
 *
 * التمييز الذي تقوم عليه هذه الوحدة: **عائد الفرصة ليس عائد المستثمر.**
 * إذا أخذ المشغّل ١٥٪ من صافي الدخل، فعائد المستثمر أقل بذلك القدر —
 * والخلط بين الرقمين هو ما يجعل عروض «الأسهم العقارية» تبدو أجمل مما هي.
 */

/** يُعيد بناء التدفقات بعد اقتطاع حصة المشغّل من صافي الدخل الموجب. */
export function investorCashflow(o: Opportunity, rows: PeriodRow[]): PeriodRow[] {
  const share = o.syndication.operatorShare;
  if (share <= 0) return rows;

  // حصة المشغّل تُقتطع من الفائض التشغيلي الموجب فقط: لا يشارك في الخسارة
  // ولا في رأس المال، وهذا هو العُرف — وهو في غير صالح المستثمر.
  return rows.map((r) => (r.net > 0 ? { ...r, net: r.net * (1 - share) } : r));
}

export function computeSyndication(o: Opportunity, rows: PeriodRow[], metrics: Metrics): SyndicationResult {
  const shares = Math.max(1, Math.round(o.syndication.shares));
  const investorRows = investorCashflow(o, rows);

  const investorsTotalNet = investorRows.reduce((s, r) => s + r.net, 0);
  const operatorTotalNet = metrics.totalNet - investorsTotalNet;

  const capitalPerShare = metrics.capitalInvested / shares;
  const termYears = o.deal.termYears;

  // التوزيعات = الفائض التشغيلي الموجب فقط (رأس المال ليس توزيعاً).
  const distributions = investorRows.reduce((s, r) => s + Math.max(0, r.net), 0);
  const avgAnnual = termYears > 0 ? distributions / termYears : 0;

  const totalPerShare = investorsTotalNet / shares;
  const annualPerShare = avgAnnual / shares;

  const investorIrr = irr(toCashPoints(investorRows, o.deal.calendar));

  return {
    shares,
    capitalPerShare,
    investorsTotalNet,
    operatorTotalNet,
    annualPerShare,
    totalPerShare,
    shareTotalReturn: capitalPerShare > 0 ? totalPerShare / capitalPerShare : 0,
    shareAnnualReturn: capitalPerShare > 0 && termYears > 0 ? totalPerShare / capitalPerShare / termYears : 0,
    shareCashYield: capitalPerShare > 0 ? annualPerShare / capitalPerShare : 0,
    investorIrr,
    investorEarningsMultiple: avgAnnual > 0 ? metrics.capitalInvested / avgAnnual : null,
  };
}

/**
 * أثر إعادة استثمار الأرباح بدل استهلاكها.
 *
 * الفرق بين عائد ١٥٪ يُستهلك وعائد ١٥٪ يُعاد استثماره هائل على مدى عقد،
 * ومعظم المستثمرين لا يرونه لأنهم يحسبون الربح خطياً. هذا الجدول يُظهر
 * التراكم المركّب صراحةً — لا كوعد، بل كإجابة عن «ماذا لو كرّرت الفرصة؟».
 */
export function projectReinvestment(capital: number, annualRate: number, years: number): ReinvestmentRow[] {
  const rows: ReinvestmentRow[] = [];
  let opening = capital;
  for (let year = 1; year <= years; year++) {
    const gain = opening * annualRate;
    const closing = opening + gain;
    rows.push({ year, opening, gain, closing });
    opening = closing;
  }
  return rows;
}

/** جدول إعادة الاستثمار المبني على عائد الفرصة الفعلي. */
export function reinvestmentFor(o: Opportunity, metrics: Metrics): ReinvestmentRow[] {
  const rate = metrics.irr;
  if (rate === null || rate <= 0 || metrics.capitalInvested <= 0) return [];
  // نمدّد الأفق إلى ضعف المدة (بحد أقصى ٢٠ سنة) ليظهر أثر التركيب.
  const horizon = Math.min(20, Math.max(o.deal.termYears, o.deal.termYears * 2));
  return projectReinvestment(metrics.capitalInvested, rate, horizon);
}

export function buildInvestorRows(o: Opportunity): PeriodRow[] {
  return investorCashflow(o, buildCashflow(o));
}
