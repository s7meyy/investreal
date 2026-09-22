import type { LandSubject } from './types.js';
import { residualLandValue, type ResidualInputs } from './residual.js';

/**
 * ورقة التفاوض: ثلاثة عروض متكافئة عندك، مختلفة عند البائع.
 *
 * الفكرة التي تُنهي أكثر المفاوضات: لا تساوم على رقم واحد. اعرض ثلاثة
 * بدائل قيمتها الحالية عندك واحدة، ودع البائع يختار ما يناسب حاجته —
 * من يحتاج سيولة فوراً يقبل سعراً أقل نقداً، ومن ينتظر يأخذ أعلى مؤجّلاً.
 * والفرق بينها ليس كرماً: هو ثمن المال عبر الزمن، محسوباً لا مُقدَّراً.
 */

export interface OfferInputs {
  /** القيمة الحالية التي لن تتجاوزها — سقفك */
  basePricePerSqm: number;
  areaSqm: number;
  /** معدّل الخصم: ثمن المال عندك سنوياً */
  discountRate: number;
  /** مدّة التأجيل في العرض المؤجّل (شهور) */
  deferMonths: number;
  /** الدفعة المقدّمة في العرض المؤجّل */
  downPaymentPct: number;
  /** خصم النقد الفوري مقابل السرعة */
  cashDiscountPct: number;
}

export const DEFAULT_OFFERS: OfferInputs = {
  basePricePerSqm: 0,
  areaSqm: 0,
  discountRate: 0.08,
  deferMonths: 12,
  downPaymentPct: 0.3,
  cashDiscountPct: 0.05,
};

export interface Offer {
  key: 'cash' | 'deferred' | 'partnership';
  title: string;
  headlinePrice: number;
  /** القيمة الحالية عندك — متساوية في العروض الثلاثة بحكم البناء */
  presentValue: number;
  terms: string[];
  bestFor: string;
}

/** عروض ثلاثة قيمتها الحالية واحدة: النقد أقل رقماً، والمؤجّل أعلى رقماً. */
export function equivalentOffers(
  input: OfferInputs,
  subject?: LandSubject,
  residual?: ResidualInputs,
): { offers: Offer[]; presentValue: number } {
  const base = input.basePricePerSqm * input.areaSqm;
  if (!(base > 0)) return { offers: [], presentValue: 0 };

  // العرض النقدي: أقل رقماً، لأن البائع يقبض اليوم
  const cashTotal = base * (1 - input.cashDiscountPct);

  // العرض المؤجّل: يُرفع رقمه حتى تتساوى قيمته الحالية مع النقدي
  const years = input.deferMonths / 12;
  const discount = Math.pow(1 + input.discountRate, years);
  const down = input.downPaymentPct;
  // down·T + (1−down)·T/discount = cashTotal
  const deferredTotal = cashTotal / (down + (1 - down) / discount);

  const offers: Offer[] = [
    {
      key: 'cash',
      title: 'نقداً وفوراً',
      headlinePrice: cashTotal,
      presentValue: cashTotal,
      terms: [
        `${Math.round(cashTotal / input.areaSqm).toLocaleString('en-US')} ريال للمتر`,
        'إفراغ خلال أسبوعين من التوقيع',
        `خصم ${Math.round(input.cashDiscountPct * 100)}٪ مقابل السرعة والقطعية`,
      ],
      bestFor: 'بائع يحتاج سيولة الآن أو يريد إنهاء الأمر بلا التزامات',
    },
    {
      key: 'deferred',
      title: 'سعر أعلى بدفع مؤجّل',
      headlinePrice: deferredTotal,
      presentValue: cashTotal,
      terms: [
        `${Math.round(deferredTotal / input.areaSqm).toLocaleString('en-US')} ريال للمتر`,
        `دفعة مقدّمة ${Math.round(down * 100)}٪ عند التوقيع`,
        `الباقي بعد ${input.deferMonths} شهراً بضمانة موثّقة`,
      ],
      bestFor: 'بائع لا يستعجل ويريد رقماً أعلى يذكره',
    },
  ];

  // الشراكة بالأرض: تُحسب فقط حين تتوفّر أرقام المشروع
  if (subject && residual) {
    const r = residualLandValue(subject, residual);
    const profitIfLandFree = r.landBudget + r.targetProfit;
    if (profitIfLandFree > 0) {
      const share = cashTotal / profitIfLandFree;
      if (share > 0 && share < 1) {
        offers.push({
          key: 'partnership',
          title: 'شراكة بالأرض',
          headlinePrice: cashTotal,
          presentValue: cashTotal,
          terms: [
            `حصة ${Math.round(share * 100)}٪ من صافي ربح المشروع بدل الثمن`,
            'لا مبلغ نقدي عند التوقيع عدا مصاريف التوثيق',
            'الأرض تبقى مرهونة لصالح المالك حتى بدء التنفيذ',
          ],
          bestFor: 'بائع يؤمن بالمشروع ويريد أعلى عائد ويقبل مخاطرته',
        });
      }
    }
  }

  return { offers, presentValue: cashTotal };
}

/** حد الانسحاب: الرقم الذي إن تجاوزه البائع انتهى التفاوض. */
export function walkAwayPrice(ceilingPerSqm: number, areaSqm: number): { perSqm: number; total: number; line: string } {
  return {
    perSqm: ceilingPerSqm,
    total: ceilingPerSqm * areaSqm,
    line: `فوق ${Math.round(ceilingPerSqm).toLocaleString('en-US')} ريال للمتر تنتفي جدوى الصفقة — وهذا ليس موقفاً تفاوضياً بل نتيجة حساب.`,
  };
}

export interface UseScenario {
  label: string;
  far: number;
  sellPricePerSqm: number;
  constructionCostPerSqm: number;
  efficiency?: number;
}

export interface UseScenarioResult extends UseScenario {
  landValuePerSqm: number;
  landCostPerSaleableSqm: number;
  feasible: boolean;
}

/**
 * الاستخدام الأمثل: الأرض تساوي بقدر أفضل ما يُبنى عليها نظاماً،
 * لا بقدر ما يُبنى عليها عادةً. ترتيب السيناريوهات هو التوصية.
 */
export function bestUse(
  subject: LandSubject,
  scenarios: UseScenario[],
  base: ResidualInputs,
): UseScenarioResult[] {
  return scenarios
    .map((s) => {
      const r = residualLandValue(
        { ...subject, far: s.far },
        { ...base, sellPricePerSqm: s.sellPricePerSqm, constructionCostPerSqm: s.constructionCostPerSqm, efficiency: s.efficiency ?? base.efficiency },
      );
      return {
        ...s,
        landValuePerSqm: r.landValuePerSqm,
        landCostPerSaleableSqm: r.landCostPerSaleableSqm,
        feasible: r.feasible,
      };
    })
    .sort((a, b) => b.landValuePerSqm - a.landValuePerSqm);
}
