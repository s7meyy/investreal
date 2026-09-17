import type { CostAssumptions, FinanceAssumptions, LegalAnswers, PropertyType, RevenueAssumptions } from './types.js';

/**
 * افتراضات محافظة عن قصد. فلسفة المنتج: الصدق قبل التفاؤل —
 * إن أخطأنا فلنخطئ في اتجاه يحمي المستثمر لا يغريه.
 */

export interface PropertyProfile {
  label: string;
  maintenance: number;
  management: number;
  marketing: number;
  capexReserve: number;
  occupancy: number;
  firstYearOccupancy: number;
  badDebt: number;
  /** تقدير أولي لتكلفة التجهيز كنسبة من الإيجار السوقي السنوي */
  fitoutOfAnnualRent: number;
  note: string;
}

export const PROPERTY_PROFILES: Record<PropertyType, PropertyProfile> = {
  apartment: { label: 'شقة', maintenance: 0.05, management: 0.05, marketing: 0.02, capexReserve: 0.02, occupancy: 0.92, firstYearOccupancy: 0.85, badDebt: 0.02, fitoutOfAnnualRent: 0.65, note: 'الأكثر سيولة في التأجير، ومخاطرها التشغيلية محدودة.' },
  floor: { label: 'دور', maintenance: 0.05, management: 0.04, marketing: 0.02, capexReserve: 0.02, occupancy: 0.90, firstYearOccupancy: 0.80, badDebt: 0.02, fitoutOfAnnualRent: 0.55, note: 'طلب أضيق من الشقة، وفترة التسويق أطول.' },
  villa: { label: 'فلة', maintenance: 0.06, management: 0.04, marketing: 0.03, capexReserve: 0.03, occupancy: 0.88, firstYearOccupancy: 0.75, badDebt: 0.02, fitoutOfAnnualRent: 0.50, note: 'إيجار مرتفع لكن الفراغ مكلف، والصيانة أكبر.' },
  building: { label: 'عمارة', maintenance: 0.07, management: 0.07, marketing: 0.02, capexReserve: 0.04, occupancy: 0.88, firstYearOccupancy: 0.70, badDebt: 0.03, fitoutOfAnnualRent: 0.35, note: 'تنويع داخلي يقلّل أثر الفراغ، لكن الإدارة والصيانة أثقل.' },
  rest_house: { label: 'استراحة', maintenance: 0.08, management: 0.10, marketing: 0.06, capexReserve: 0.05, occupancy: 0.55, firstYearOccupancy: 0.40, badDebt: 0.01, fitoutOfAnnualRent: 0.80, note: 'إيراد يومي متقلّب وموسمي — الإشغال هنا مختلف تماماً عن السكني.' },
  shop: { label: 'محل / معرض', maintenance: 0.04, management: 0.05, marketing: 0.03, capexReserve: 0.03, occupancy: 0.85, firstYearOccupancy: 0.65, badDebt: 0.05, fitoutOfAnnualRent: 0.30, note: 'تجاري: تخضع لضريبة القيمة المضافة، وفترات الفراغ طويلة.' },
  office: { label: 'مكتب', maintenance: 0.05, management: 0.06, marketing: 0.04, capexReserve: 0.04, occupancy: 0.82, firstYearOccupancy: 0.60, badDebt: 0.04, fitoutOfAnnualRent: 0.70, note: 'تجاري، وحسّاس جداً للمعروض الجديد في المنطقة.' },
  warehouse: { label: 'مستودع', maintenance: 0.03, management: 0.04, marketing: 0.03, capexReserve: 0.02, occupancy: 0.88, firstYearOccupancy: 0.70, badDebt: 0.03, fitoutOfAnnualRent: 0.15, note: 'تجهيز منخفض ومستأجرون أطول بقاءً.' },
  land: { label: 'أرض', maintenance: 0.01, management: 0.03, marketing: 0.03, capexReserve: 0.01, occupancy: 0.85, firstYearOccupancy: 0.50, badDebt: 0.03, fitoutOfAnnualRent: 0.90, note: 'القيمة كلها في النشاط المقام عليها — التجهيز هو الاستثمار الحقيقي.' },
};

export const COMMERCIAL_TYPES: PropertyType[] = ['shop', 'office', 'warehouse', 'land'];

export function defaultRevenue(type: PropertyType, marketRentAnnual: number): RevenueAssumptions {
  const p = PROPERTY_PROFILES[type];
  return {
    units: [{ label: p.label, count: 1, marketRentAnnual }],
    growthRate: 0.03,
    occupancy: p.occupancy,
    firstYearOccupancy: p.firstYearOccupancy,
    badDebt: p.badDebt,
    otherIncomeAnnual: 0,
  };
}

export function defaultCosts(type: PropertyType, marketRentAnnual: number): CostAssumptions {
  const p = PROPERTY_PROFILES[type];
  return {
    fitout: Math.round(marketRentAnnual * p.fitoutOfAnnualRent),
    maintenance: p.maintenance,
    management: p.management,
    marketing: p.marketing,
    insuranceAnnual: Math.round(marketRentAnnual * 0.01),
    utilitiesAnnual: 0,
    feesAnnual: 1000,
    capexReserve: p.capexReserve,
    restoration: Math.round(marketRentAnnual * 0.25),
    fitoutSalvage: 0,
    costInflation: 0.03,
  };
}

export function defaultFinance(type: PropertyType): FinanceAssumptions {
  return {
    discountRate: 0.08,
    inflation: 0.02,
    vatApplies: COMMERCIAL_TYPES.includes(type),
    vatRate: 0.15,
    zakatApplies: false,
    zakatRate: 0.025,
  };
}

/** الجهل ليس أماناً: كل إجابة غير معروفة تُحسب كخطر حتى يثبت العكس. */
export const UNKNOWN_LEGAL: LegalAnswers = {
  subleaseExplicit: 'unknown', assignable: 'unknown', registered: 'unknown',
  survivesSale: 'unknown', earlyTerminationCompensation: 'unknown',
  titleUnencumbered: 'unknown', ownershipClear: 'unknown', notWaqf: 'unknown',
  signerVerified: 'unknown', compliant: 'unknown', structuralOnOwner: 'unknown',
  renewalOption: 'unknown', purchaseOption: 'unknown', insured: 'unknown',
  inspected: 'unknown', marketRentVerified: 'unknown',
};
