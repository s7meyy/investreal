/** أنواع المحرّك المالي — كل المبالغ بالريال السعودي ما لم يُذكر غير ذلك. */

export type Calendar = 'gregorian' | 'hijri';

export type PropertyType =
  | 'apartment' | 'floor' | 'villa' | 'duplex' | 'penthouse' | 'building'
  | 'room' | 'driver_room' | 'rest_house'
  | 'shop' | 'showroom' | 'office' | 'warehouse' | 'workshop' | 'parking' | 'land';

/** نسبة مئوية كسرية: 0.05 = ٥٪ */
export type Rate = number;

export interface Unit {
  label: string;
  count: number;
  /** إيجار السوق السنوي للوحدة الواحدة */
  marketRentAnnual: number;
}

export interface PaymentItem {
  /** شهر الدفع بترتيب تقويم العقد؛ 0 = عند التوقيع */
  month: number;
  amount: number;
}

export type PaymentPlan =
  | { kind: 'upfront_full' }
  | { kind: 'annual' }
  | { kind: 'custom'; items: PaymentItem[] };

export interface DealTerms {
  termYears: number;
  /** الإيجار التعاقدي لسنة واحدة من تقويم العقد */
  contractRentAnnual: number;
  payment: PaymentPlan;
  /** تصاعد سنوي على الإيجار التعاقدي (0 = ثابت) */
  contractEscalation: Rate;
  /** أشهر سماح مجانية في بداية العقد (لا إيراد متوقع فيها عادةً) */
  graceMonths: number;
  calendar: Calendar;
}

export interface RevenueAssumptions {
  units: Unit[];
  /** نمو إيجارات السوق سنوياً (بالسنة الشمسية) */
  growthRate: Rate;
  /** سقف نمو تنظيمي اختياري؛ إن وُجد فالنمو الفعلي = min(growthRate, cap) */
  growthCap?: Rate;
  occupancy: Rate;
  firstYearOccupancy: Rate;
  /** نسبة التعثّر في التحصيل */
  badDebt: Rate;
  /** إيرادات أخرى سنوية (مواقف، لوحات، خدمات) */
  otherIncomeAnnual: number;
}

export interface CostAssumptions {
  /** تأثيث وتجهيز — دفعة واحدة عند البداية */
  fitout: number;
  /** صيانة كنسبة من الإيجار المحتمل (لا المُحصَّل) */
  maintenance: Rate;
  /** إدارة وعمولة تأجير كنسبة من المُحصَّل */
  management: Rate;
  /** تسويق كنسبة من المُحصَّل */
  marketing: Rate;
  insuranceAnnual: number;
  utilitiesAnnual: number;
  /** رسوم توثيق ومنصات وإدارية سنوية */
  feesAnnual: number;
  /** مخصّص إحلال كنسبة من الإيجار المحتمل */
  capexReserve: Rate;
  /** إعادة الحال في نهاية المدة */
  restoration: number;
  /** القيمة المتبقية للتجهيزات عند الخروج */
  fitoutSalvage: number;
  /** تضخّم يرفع المصاريف الثابتة سنوياً */
  costInflation: Rate;
}

export interface FinanceAssumptions {
  /** تكلفة الفرصة البديلة — معدل الخصم السنوي */
  discountRate: Rate;
  /** تضخّم عام لعرض المؤشرات الحقيقية */
  inflation: Rate;
  /** ضريبة القيمة المضافة على الإيجار (تجاري) */
  vatApplies: boolean;
  vatRate: Rate;
  /** احتساب الزكاة على صافي الدخل */
  zakatApplies: boolean;
  zakatRate: Rate;
  /** سيولة المستثمر الكلية — لقياس نسبة التجميد (اختياري) */
  totalLiquidity?: number;
}

export type Answer = 'yes' | 'no' | 'unknown';

export interface LegalAnswers {
  /** حق التأجير من الباطن منصوص عليه صراحةً */
  subleaseExplicit: Answer;
  /** حق التنازل عن العقد لطرف آخر */
  assignable: Answer;
  /** العقد مسجَّل رسمياً (إيجار) */
  registered: Answer;
  /** استمرار العقد عند بيع العقار منصوص عليه */
  survivesSale: Answer;
  /** تعويض عادل عند الإنهاء المبكر */
  earlyTerminationCompensation: Answer;
  /** الصك حرّ من الرهن */
  titleUnencumbered: Answer;
  /** الملكية مفرزة وغير متنازع عليها */
  ownershipClear: Answer;
  /** العقار ليس وقفاً */
  notWaqf: Answer;
  /** الموقّع هو المالك أو وكيل بوكالة سارية */
  signerVerified: Answer;
  /** خلوّ من المخالفات البلدية وشهادة إشغال سارية */
  compliant: Answer;
  /** الصيانة الإنشائية على المالك */
  structuralOnOwner: Answer;
  /** خيار تمديد بسعر محدد مسبقاً */
  renewalOption: Answer;
  /** حق شفعة أو خيار شراء */
  purchaseOption: Answer;
  /** تأمين ساري على المنشأة */
  insured: Answer;
  /** فحص هندسي تمّ */
  inspected: Answer;
  /** مقارنة إيجارات موثّقة فعلية (لا إعلانات) */
  marketRentVerified: Answer;
}

/**
 * تجزئة الفرصة على مستثمرين، وهيكل المشغّل.
 *
 * كثير من هذه الفرص لا يدخلها مستثمر واحد: تُقسّم على أسهم، ويأخذ من
 * يُدير التشغيل حصةً من صافي الدخل مقابل إدارته. هذا يغيّر عائد المستثمر
 * جذرياً عن عائد الفرصة، والخلط بينهما هو أشيع خطأ في هذه الصفقات.
 */
export interface Syndication {
  /** عدد الأسهم التي تُقسّم عليها الفرصة (١ = مستثمر واحد) */
  shares: number;
  /** حصة المشغّل من صافي الدخل التشغيلي (٠ = لا مشغّل) */
  operatorShare: Rate;
  /** هل يسترد المستثمرون رأس مالهم قبل أن يأخذ المشغّل حصته */
  capitalFirst: boolean;
}

export interface Property {
  type: PropertyType;
  city: string;
  district: string;
  areaSqm?: number;
  ageYears?: number;
}

export interface Opportunity {
  id: string;
  name: string;
  property: Property;
  deal: DealTerms;
  revenue: RevenueAssumptions;
  costs: CostAssumptions;
  finance: FinanceAssumptions;
  legal: LegalAnswers;
  syndication: Syndication;
  /** بيانات التقرير — لا تدخل في أي حساب */
  report?: ReportMeta;
}

export interface ReportMeta {
  /** عنوان الصفحة الأولى من التقرير */
  title: string;
  /** اسم مُعدّ التقرير */
  preparedBy: string;
  /** ملاحظة تظهر على الغلاف */
  note?: string;
}

export interface PeriodRow {
  /** رقم الشهر بترتيب تقويم العقد، 0 = التوقيع */
  month: number;
  /** السنوات الشمسية المنقضية منذ التوقيع حتى بداية هذه الفترة */
  elapsedSolarYears: number;
  potentialIncome: number;
  collectedIncome: number;
  otherIncome: number;
  operatingCosts: number;
  contractRentPaid: number;
  capitalCosts: number;
  tax: number;
  net: number;
}

export interface AnnualRow {
  year: number;
  income: number;
  operatingCosts: number;
  contractRentPaid: number;
  capitalCosts: number;
  tax: number;
  net: number;
  cumulative: number;
}

export interface Metrics {
  capitalInvested: number;
  totalNet: number;
  roi: number;
  irr: number | null;
  mirr: number | null;
  npv: number;
  profitabilityIndex: number;
  cagr: number | null;
  paybackYears: number | null;
  discountedPaybackYears: number | null;
  breakevenOccupancy: number | null;
  breakevenMarketRent: number | null;
  /** خصم الصفقة عن السوق: 1 − (تعاقدي ÷ سوقي) */
  discountToMarket: number;
  /** نسبة تجميد السيولة إن أُدخلت */
  liquidityLockRatio: number | null;
  /** IRR بعد خصم التضخّم */
  realIrr: number | null;
  /** هل IRR موثوق (إشارة واحدة فقط في التدفقات) */
  irrReliable: boolean;
  /** التكلفة التعاقدية الشهرية — رقم يفهمه المستثمر بالحدس */
  monthlyContractCost: number;
  /**
   * مكرر الأرباح: رأس المال ÷ متوسط التوزيع السنوي.
   * «كم سنة من التوزيعات تساوي ما دفعته؟» — أوضح مقياس لغير المتخصّص.
   */
  earningsMultiple: number | null;
  /** متوسط التوزيع السنوي للمستثمرين بعد حصة المشغّل */
  avgAnnualDistribution: number;
  /** نسبة العائد البسيط للفترة كلها */
  totalReturnRate: number;
  /** نسبة العائد البسيط السنوي (الإجمالي ÷ المدة) */
  simpleAnnualReturn: number;
  /** العائد النقدي السنوي = التوزيع السنوي ÷ رأس المال */
  cashOnCash: number;
}

/** توزيع الفرصة على الأسهم والمشغّل. */
export interface SyndicationResult {
  shares: number;
  /** ما يدفعه صاحب السهم الواحد */
  capitalPerShare: number;
  /** صافي الربح الكلي بعد حصة المشغّل */
  investorsTotalNet: number;
  /** ما يأخذه المشغّل طوال المدة */
  operatorTotalNet: number;
  /** التوزيع السنوي للسهم الواحد (متوسط) */
  annualPerShare: number;
  /** إجمالي ما يقبضه السهم الواحد طوال المدة */
  totalPerShare: number;
  /** نسبة العائد الإجمالي للسهم */
  shareTotalReturn: number;
  /** نسبة العائد السنوي البسيط للسهم (صافي الربح ÷ رأس المال ÷ المدة) */
  shareAnnualReturn: number;
  /**
   * العائد النقدي السنوي للسهم = التوزيع السنوي ÷ رأس مال السهم.
   * هذا ما يسأل عنه المستثمر فعلاً: «كم يدخل جيبي كل سنة؟»
   */
  shareCashYield: number;
  /** العائد الداخلي للمستثمر بعد حصة المشغّل */
  investorIrr: number | null;
  /** مكرر الأرباح للمستثمرين */
  investorEarningsMultiple: number | null;
}

/** أثر إعادة استثمار الأرباح بدل استهلاكها. */
export interface ReinvestmentRow {
  year: number;
  /** رأس المال في بداية السنة */
  opening: number;
  /** العائد المحقّق في السنة */
  gain: number;
  /** رأس المال في نهاية السنة */
  closing: number;
}

export type RiskBand = 'low' | 'medium' | 'high' | 'critical';

export interface ScoredRisk {
  id: string;
  title: string;
  category: 'legal' | 'market' | 'operational' | 'financial' | 'property';
  severity: number;
  note: string;
  mitigation: string;
}

export interface RiskResult {
  score: number;
  band: RiskBand;
  items: ScoredRisk[];
  /** بنود قاتلة مؤكّدة (أُجيب عنها بـ«لا») — تُسقط الفرصة */
  blockers: string[];
  /** بنود قاتلة لم يتحقّق منها بعد — تمنع الترقية لا أكثر */
  unverifiedBlockers: string[];
}

export interface Ceiling {
  targetIrr: number;
  maxContractRentAnnual: number;
  maxUpfrontTotal: number;
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  /** أثر التطبيق على IRR بالنقاط المئوية، إن أمكن قياسه */
  irrDelta: number | null;
  effort: 'low' | 'medium' | 'high';
  priority: number;
}

export interface TornadoItem {
  variable: string;
  label: string;
  lowIrr: number | null;
  highIrr: number | null;
  swing: number;
}

export type Grade = 'excellent' | 'very_good' | 'good' | 'marginal' | 'weak' | 'rejected';

export interface Verdict {
  grade: Grade;
  label: string;
  reason: string;
  overrides: string[];
}

export interface AnalysisResult {
  engineVersion: string;
  periods: PeriodRow[];
  annual: AnnualRow[];
  metrics: Metrics;
  scenarios: {
    pessimistic: Metrics;
    base: Metrics;
    optimistic: Metrics;
  };
  sensitivity: TornadoItem[];
  risk: RiskResult;
  ceilings: Ceiling[];
  recommendations: Recommendation[];
  verdict: Verdict;
  warnings: string[];
  syndication: SyndicationResult;
  reinvestment: ReinvestmentRow[];
}
