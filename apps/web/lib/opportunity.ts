import {
  defaultCosts, defaultFinance, defaultRevenue, UNKNOWN_LEGAL,
  type Calendar, type LegalAnswers, type Opportunity, type PropertyType,
} from '@investreal/engine';

/** مدخلات الطبقة الأولى: ثمانية حقول تُعطي نتيجة خلال دقيقة. */
export interface QuickForm {
  propertyType: PropertyType;
  city: string;
  district: string;
  termYears: number;
  contractRentAnnual: number;
  marketRentAnnual: number;
  paymentKind: 'upfront_full' | 'annual' | 'split';
  fitout: number;
  discountRate: number;
  calendar: Calendar;
  // الطبقة الثانية — لها افتراضات ذكية ولا تمنع النتيجة
  occupancy: number;
  firstYearOccupancy: number;
  growthRate: number;
  graceMonths: number;
  maintenance: number;
  management: number;
  restoration: number;
  // تجزئة الفرصة وهيكل المشغّل
  shares: number;
  operatorShare: number;
  // بيانات التقرير — لا تدخل في أي حساب
  reportTitle: string;
  preparedBy: string;
}

export function defaultForm(): QuickForm {
  const marketRentAnnual = 30000;
  const costs = defaultCosts('apartment', marketRentAnnual);
  const revenue = defaultRevenue('apartment', marketRentAnnual);
  return {
    propertyType: 'apartment',
    city: 'الرياض',
    district: '',
    termYears: 10,
    contractRentAnnual: 12000,
    marketRentAnnual,
    paymentKind: 'upfront_full',
    fitout: costs.fitout,
    discountRate: 0.08,
    calendar: 'gregorian',
    occupancy: revenue.occupancy,
    firstYearOccupancy: revenue.firstYearOccupancy,
    growthRate: revenue.growthRate,
    graceMonths: 0,
    maintenance: costs.maintenance,
    management: costs.management,
    restoration: costs.restoration,
    shares: 1,
    operatorShare: 0,
    reportTitle: 'دراسة جدوى فرصة استثمارية عقارية',
    preparedBy: '',
  };
}

/** يُعيد ضبط الحقول المشتقّة حين يتغيّر نوع العقار أو إيجار السوق. */
export function applyProfile(form: QuickForm, type: PropertyType, marketRent: number): QuickForm {
  const costs = defaultCosts(type, marketRent);
  const revenue = defaultRevenue(type, marketRent);
  return {
    ...form,
    propertyType: type,
    marketRentAnnual: marketRent,
    fitout: costs.fitout,
    restoration: costs.restoration,
    maintenance: costs.maintenance,
    management: costs.management,
    occupancy: revenue.occupancy,
    firstYearOccupancy: revenue.firstYearOccupancy,
  };
}

export function toOpportunity(form: QuickForm, legal: LegalAnswers = UNKNOWN_LEGAL): Opportunity {
  const costs = defaultCosts(form.propertyType, form.marketRentAnnual);
  const revenue = defaultRevenue(form.propertyType, form.marketRentAnnual);
  const finance = defaultFinance(form.propertyType);

  const totalUpfront = form.contractRentAnnual * form.termYears;
  const payment =
    form.paymentKind === 'split'
      ? {
          kind: 'custom' as const,
          items: [
            { month: form.graceMonths, amount: totalUpfront * 0.6 },
            { month: form.graceMonths + 24, amount: totalUpfront * 0.4 },
          ],
        }
      : { kind: form.paymentKind };

  return {
    id: 'current',
    name: `${form.city}${form.district ? ` — ${form.district}` : ''}`,
    property: { type: form.propertyType, city: form.city, district: form.district },
    deal: {
      termYears: form.termYears,
      contractRentAnnual: form.contractRentAnnual,
      payment,
      contractEscalation: 0,
      graceMonths: form.graceMonths,
      calendar: form.calendar,
    },
    revenue: {
      ...revenue,
      occupancy: form.occupancy,
      firstYearOccupancy: form.firstYearOccupancy,
      growthRate: form.growthRate,
    },
    costs: {
      ...costs,
      fitout: form.fitout,
      maintenance: form.maintenance,
      management: form.management,
      restoration: form.restoration,
    },
    finance: { ...finance, discountRate: form.discountRate },
    legal,
    syndication: {
      shares: Math.max(1, Math.round(form.shares)),
      operatorShare: form.operatorShare,
      capitalFirst: true,
    },
    report: {
      title: form.reportTitle.trim() || 'دراسة جدوى فرصة استثمارية عقارية',
      preparedBy: form.preparedBy.trim(),
    },
  };
}
