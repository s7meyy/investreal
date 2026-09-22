import type { LandSubject } from './types.js';

/**
 * القيمة المتبقّية للأرض — السؤال الذي يسأله المطوّر فعلاً.
 *
 * المقارنات تقول «بكم تُباع أرض مثلها». المتبقّية تقول «كم تستطيع أنت
 * أن تدفع فيها ويبقى ربحك»:
 *
 *   إيراد المبيعات − (البناء + التكاليف غير المباشرة + التمويل + التسويق + ربح المطوّر)
 *   = ما يحتمله سعر الأرض شاملاً رسوم التملّك.
 *
 * وهي نظير «السقف التفاوضي» في محرّك الإيجار: تحوّل النقاش من
 * «أبغى أرخص» إلى رقم مُبرَّر يستطيع المطوّر مناقشته بدل تجاهله.
 */

export interface ResidualInputs {
  /** نسبة المسطحات القابلة للبيع من إجمالي المبني (مشاع ودرج وخدمات) */
  efficiency: number;
  /** تكلفة البناء للمتر من إجمالي المسطحات */
  constructionCostPerSqm: number;
  /** سعر بيع المتر المبني القابل للبيع */
  sellPricePerSqm: number;
  /** التصاميم والتراخيص والإشراف والإدارة — نسبة من تكلفة البناء */
  softCostsPct: number;
  /** التسويق والعمولة — نسبة من الإيراد */
  marketingPct: number;
  /** ربح المطوّر المستهدف — نسبة من الإيراد */
  developerProfitPct: number;
  /** كلفة التمويل السنوية، تُحتسب على متوسط سحب ≈ نصف المدّة */
  financeRate: number;
  /** مدّة المشروع بالشهور */
  durationMonths: number;
  /** نسبة تمويل التكاليف الإنشائية */
  financedShare: number;
  /** رسوم وتكاليف تملّك الأرض (تصرفات عقارية، سعي، توثيق) — نسبة من ثمن الأرض */
  acquisitionCostPct: number;
}

/**
 * قيم بدء للسوق السعودي، والرياض مرجعها. **ليست أسعاراً رسمية**:
 * تكلفة البناء وسعر البيع يختلفان بالحي ومستوى التشطيب اختلافاً كبيراً،
 * ويجب أن يُدخلهما المستخدم من واقع مشروعه. ونسبة الرسوم تُراجَع عند
 * التعاقد لأن الأنظمة تتغيّر.
 */
export const DEFAULT_RESIDUAL: ResidualInputs = {
  efficiency: 0.78,
  constructionCostPerSqm: 2200,
  sellPricePerSqm: 5500,
  softCostsPct: 0.12,
  marketingPct: 0.03,
  developerProfitPct: 0.20,
  financeRate: 0.08,
  durationMonths: 24,
  financedShare: 0.6,
  acquisitionCostPct: 0.05,
};

export interface ResidualResult {
  grossFloorAreaSqm: number;
  saleableAreaSqm: number;
  revenue: number;
  constructionCost: number;
  softCosts: number;
  marketingCost: number;
  financeCost: number;
  targetProfit: number;
  /** ما يحتمله بند الأرض شاملاً رسوم التملّك */
  landBudget: number;
  /** ثمن الأرض نفسه بعد استبعاد الرسوم */
  landValue: number;
  landValuePerSqm: number;
  /** سعر متر الأرض لكل متر مبيع — مؤشّر المقارنة بين أرضين مختلفتين */
  landCostPerSaleableSqm: number;
  feasible: boolean;
}

export function residualLandValue(
  subject: LandSubject,
  inputs: ResidualInputs = DEFAULT_RESIDUAL,
): ResidualResult {
  const gfa = subject.areaSqm * subject.far;
  const saleable = gfa * inputs.efficiency;
  const revenue = saleable * inputs.sellPricePerSqm;

  const constructionCost = gfa * inputs.constructionCostPerSqm;
  const softCosts = constructionCost * inputs.softCostsPct;
  const marketingCost = revenue * inputs.marketingPct;
  const years = inputs.durationMonths / 12;
  // متوسط الرصيد المسحوب ≈ نصف التكاليف على كامل المدّة
  const financeCost = (constructionCost + softCosts) * inputs.financedShare * inputs.financeRate * years * 0.5;
  const targetProfit = revenue * inputs.developerProfitPct;

  const landBudget = revenue - constructionCost - softCosts - marketingCost - financeCost - targetProfit;
  const landValue = landBudget / (1 + inputs.acquisitionCostPct);

  return {
    grossFloorAreaSqm: gfa,
    saleableAreaSqm: saleable,
    revenue,
    constructionCost,
    softCosts,
    marketingCost,
    financeCost,
    targetProfit,
    landBudget,
    landValue,
    landValuePerSqm: subject.areaSqm > 0 ? landValue / subject.areaSqm : 0,
    landCostPerSaleableSqm: saleable > 0 ? landValue / saleable : 0,
    feasible: landValue > 0,
  };
}

/** ربح المطوّر الفعلي لو اشترى الأرض بسعر السوق بدل السعر المتبقّي. */
export function profitAtLandPrice(
  subject: LandSubject,
  landPricePerSqm: number,
  inputs: ResidualInputs = DEFAULT_RESIDUAL,
): { profit: number; marginOnRevenue: number; marginOnCost: number } {
  const r = residualLandValue(subject, inputs);
  const landCost = landPricePerSqm * subject.areaSqm * (1 + inputs.acquisitionCostPct);
  const totalCost = r.constructionCost + r.softCosts + r.marketingCost + r.financeCost + landCost;
  const profit = r.revenue - totalCost;
  return {
    profit,
    marginOnRevenue: r.revenue > 0 ? profit / r.revenue : 0,
    marginOnCost: totalCost > 0 ? profit / totalCost : 0,
  };
}

/** أقصى سعر متر أرض يُبقي هامش المطوّر عند هدف معيّن من الإيراد. */
export function maxLandPriceForMargin(
  subject: LandSubject,
  targetMarginOnRevenue: number,
  inputs: ResidualInputs = DEFAULT_RESIDUAL,
): number {
  const r = residualLandValue(subject, { ...inputs, developerProfitPct: targetMarginOnRevenue });
  return r.landValuePerSqm;
}
