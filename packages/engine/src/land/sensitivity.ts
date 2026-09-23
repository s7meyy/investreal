import type { LandSubject } from './types.js';
import { residualLandValue, type ResidualInputs } from './residual.js';

/**
 * حساسية قيمة الأرض.
 *
 * السؤال ليس «كم تساوي؟» بل «ما الذي يغيّر قيمتها، وبكم؟». المطوّر الذي
 * يعرف أن ١٠٪ في سعر البيع تُحرّك سعر الأرض المحتمل ٣٠٪، يعرف أين يضع
 * تحقّقه قبل أن يوقّع — وأين يضع تحفّظه في العقد.
 *
 * نقيس الأثر على **القيمة المتبقّية للأرض** لا على الربح، لأنها الرقم
 * الذي يتفاوض به فعلاً.
 */

export interface LandTornadoItem {
  key: string;
  label: string;
  lowValue: number;
  highValue: number;
  /** اتّساع الأثر بالريال للمتر */
  swing: number;
  /** الأثر نسبةً إلى الحالة الأساس */
  swingPct: number;
  note: string;
}

interface Variable {
  key: string;
  label: string;
  note: string;
  apply: (subject: LandSubject, inputs: ResidualInputs, factor: number) => { subject: LandSubject; inputs: ResidualInputs };
}

const VARIABLES: Variable[] = [
  {
    key: 'sellPrice', label: 'سعر بيع المتر المبني',
    note: 'أقوى متغيّر عادةً: الإيراد كله مبني عليه.',
    apply: (s, i, f) => ({ subject: s, inputs: { ...i, sellPricePerSqm: i.sellPricePerSqm * f } }),
  },
  {
    key: 'constructionCost', label: 'تكلفة البناء',
    note: 'ترتفع بين التقدير والتنفيذ أكثر مما تنخفض.',
    apply: (s, i, f) => ({ subject: s, inputs: { ...i, constructionCostPerSqm: i.constructionCostPerSqm * f } }),
  },
  {
    key: 'far', label: 'معامل البناء المسموح',
    note: 'رقم نظامي لا تقديري — تأكيده من الجهة المختصة يغلق هذا الباب.',
    apply: (s, i, f) => ({ subject: { ...s, far: s.far * f }, inputs: i }),
  },
  {
    key: 'profit', label: 'هامش المطوّر المستهدف',
    note: 'كل نقطة هامش تُطلبها تخصم من الثمن الذي تستطيع دفعه.',
    apply: (s, i, f) => ({ subject: s, inputs: { ...i, developerProfitPct: i.developerProfitPct * f } }),
  },
  {
    key: 'duration', label: 'مدّة المشروع',
    note: 'التأخير يكلّف تمويلاً لا وقتاً فقط.',
    apply: (s, i, f) => ({ subject: s, inputs: { ...i, durationMonths: i.durationMonths * f } }),
  },
  {
    key: 'efficiency', label: 'كفاءة المسطحات',
    note: 'التصميم الرديء يبيع مساحة أقل من المبني نفسه.',
    apply: (s, i, f) => ({ subject: s, inputs: { ...i, efficiency: Math.min(0.95, i.efficiency * f) } }),
  },
  {
    key: 'softCosts', label: 'التكاليف غير المباشرة',
    note: 'تصاميم وتراخيص وإشراف — تُنسى في التقدير الأول غالباً.',
    apply: (s, i, f) => ({ subject: s, inputs: { ...i, softCostsPct: i.softCostsPct * f } }),
  },
];

export function landSensitivity(
  subject: LandSubject,
  inputs: ResidualInputs,
  swing = 0.1,
): { base: number; items: LandTornadoItem[] } {
  const base = residualLandValue(subject, inputs).landValuePerSqm;

  const items = VARIABLES.map((v) => {
    const low = v.apply(subject, inputs, 1 - swing);
    const high = v.apply(subject, inputs, 1 + swing);
    const lowValue = residualLandValue(low.subject, low.inputs).landValuePerSqm;
    const highValue = residualLandValue(high.subject, high.inputs).landValuePerSqm;
    const spread = Math.abs(highValue - lowValue);
    return {
      key: v.key, label: v.label, lowValue, highValue,
      swing: spread,
      swingPct: base !== 0 ? spread / Math.abs(base) : 0,
      note: v.note,
    };
  }).sort((a, b) => b.swing - a.swing);

  return { base, items };
}

/** الجملة التي يحتاجها القارئ: أين يضع تحقّقه قبل التوقيع. */
export function sensitivityHeadline(result: { base: number; items: LandTornadoItem[] }): string {
  const top = result.items[0];
  if (!top || top.swing === 0) return 'لا متغيّر ذا أثر يُذكر بهذه الافتراضات.';
  return `العامل الأخطر عندك هو «${top.label}»: تحرّكه 10٪ يُحرّك سعر الأرض المحتمل ${Math.round(top.swingPct * 100)}٪ (${Math.round(top.swing).toLocaleString('en-US')} ريال للمتر).`;
}
