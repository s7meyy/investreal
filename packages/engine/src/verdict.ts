import type { Grade, Metrics, Opportunity, RiskResult, Verdict } from './types.js';

const LABELS: Record<Grade, string> = {
  excellent: 'ممتازة',
  very_good: 'جيدة جداً',
  good: 'جيدة',
  marginal: 'حدّية',
  weak: 'ضعيفة',
  rejected: 'مرفوضة',
};

/** مصفوفة الحكم: فائض العائد × درجة المخاطرة. لا يُحكم على أحدهما منفرداً. */
const MATRIX: Record<string, Grade[]> = {
  //            منخفضة      متوسطة        مرتفعة      حرجة
  high:      ['excellent', 'very_good', 'good',     'rejected'],
  mid:       ['very_good', 'good',      'marginal', 'rejected'],
  low:       ['good',      'marginal',  'weak',     'rejected'],
  negative:  ['weak',      'weak',      'rejected', 'rejected'],
};

const BAND_INDEX = { low: 0, medium: 1, high: 2, critical: 3 } as const;

export function computeVerdict(o: Opportunity, metrics: Metrics, risk: RiskResult): Verdict {
  const overrides: string[] = [];

  for (const b of risk.blockers) {
    overrides.push(`بند قاتل غير محسوم: ${b}`);
  }
  if (metrics.irr === null) {
    overrides.push('تعذّر حساب عائد داخلي موثوق لهذه التدفقات');
  }
  if (metrics.npv < 0 && metrics.irr !== null) {
    // ليس تجاوزاً بذاته، لكنه يُثبّت الحكم في الصف السالب أدناه.
  }

  if (overrides.length > 0) {
    return {
      grade: 'rejected',
      label: LABELS.rejected,
      reason: `لا يُنصح بالدخول: ${overrides[0]}. هذا النوع من البنود لا يُعوّضه أي عائد، لأنه يهدّد رأس المال كله لا الربح فقط.`,
      overrides,
    };
  }

  const excess = (metrics.irr ?? 0) - o.finance.discountRate;
  const row = excess >= 0.10 ? 'high' : excess >= 0.05 ? 'mid' : excess >= 0 ? 'low' : 'negative';
  const grade = MATRIX[row]![BAND_INDEX[risk.band]]!;

  const excessPts = (excess * 100).toFixed(1);
  const reason =
    excess < 0
      ? `عائدك الداخلي ${((metrics.irr ?? 0) * 100).toFixed(1)}٪ أقل من تكلفة الفرصة البديلة ${(o.finance.discountRate * 100).toFixed(0)}٪ — أي أنك تُجمّد مالك سنوات لتحصل على أقل مما يعطيك البديل بلا مخاطرة.`
      : excess < 0.05
        ? `عائدك يتجاوز البديل بـ${excessPts} نقطة فقط — ربح حقيقي لكنه لا يُعوّضك عن تجميد ${o.deal.termYears} سنوات ولا عن المخاطر. السقف التفاوضي هو ما يحوّلها إلى فرصة.`
        : `عائدك يتجاوز البديل بـ${excessPts} نقطة، ودرجة مخاطرتك ${risk.score}/١٠٠ — الفارق يُعوّض المخاطرة والتجميد.`;

  return { grade, label: LABELS[grade], reason, overrides };
}
