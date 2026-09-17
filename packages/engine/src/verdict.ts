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
  let grade = MATRIX[row]![BAND_INDEX[risk.band]]!;

  // بند قاتل لم يُتحقَّق منه لا يُسقط الفرصة — الفرصة قد تكون سليمة —
  // لكنه يمنع أي حكم يوحي بالاطمئنان قبل أن يُحسم.
  const CAP_ORDER: Grade[] = ['rejected', 'weak', 'marginal', 'good', 'very_good', 'excellent'];
  if (risk.unverifiedBlockers.length > 0 && CAP_ORDER.indexOf(grade) > CAP_ORDER.indexOf('marginal')) {
    grade = 'marginal';
  }

  const excessPts = (excess * 100).toFixed(1);

  // الرفض الآتي من المصفوفة (مخاطرة حرجة) يجب أن يُفسَّر بالمخاطرة،
  // لا أن يُترك مع نصٍّ يتحدّث عن العائد فيبدو الحكم متناقضاً مع سببه.
  if (grade === 'rejected') {
    const worst = risk.items.slice(0, 3).map((i) => i.title).join('، ');
    return {
      grade,
      label: LABELS.rejected,
      reason:
        `درجة مخاطرتك ${risk.score}/١٠٠ (حرجة)، وهذا يُسقط الفرصة مهما كان عائدها — ` +
        `عائد ${((metrics.irr ?? 0) * 100).toFixed(1)}٪ لا يشتري لك حمايةً من رأس مال قد يضيع كله. ` +
        `أثقل ما عليك: ${worst}. عالِجها في العقد ثم أعد التقييم.`,
      overrides,
    };
  }

  const reason =
    excess < 0
      ? `عائدك الداخلي ${((metrics.irr ?? 0) * 100).toFixed(1)}٪ أقل من تكلفة الفرصة البديلة ${(o.finance.discountRate * 100).toFixed(0)}٪ — أي أنك تُجمّد مالك سنوات لتحصل على أقل مما يعطيك البديل بلا مخاطرة.`
      : excess < 0.05
        ? `عائدك يتجاوز البديل بـ${excessPts} نقطة فقط — ربح حقيقي لكنه لا يُعوّضك عن تجميد ${o.deal.termYears} سنوات ولا عن المخاطر. السقف التفاوضي هو ما يحوّلها إلى فرصة.`
        : `عائدك يتجاوز البديل بـ${excessPts} نقطة، ودرجة مخاطرتك ${risk.score}/١٠٠ — الفارق يُعوّض المخاطرة والتجميد.`;

  const pending =
    risk.unverifiedBlockers.length > 0
      ? ` لم يُحسم بعد: ${risk.unverifiedBlockers.join('، ')} — والحكم لا يرتفع فوق «حدّية» قبل التحقّق منها.`
      : '';

  return { grade, label: LABELS[grade], reason: reason + pending, overrides };
}
