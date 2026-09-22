/**
 * تقييم الأرض — السوق السعودي، والرياض هي حالة الاستخدام الأولى.
 *
 * الفرق الجوهري عن محرّك الإيجار: هناك نُقيّم *عقداً*، وهنا نُقيّم *أصلاً*.
 * والمنهج هنا مقارني: نجمع ملاحظات سعرية من ثلاثة مسارات مستقلة،
 * نُطبّعها إلى «سعر متر مكافئ لأرضك»، ثم نُصالحها في نطاق واحد بثقة معلنة.
 *
 * انظر `docs/12-تقييم-الأرض-وتقرير-السعر.md` للمنهج كاملاً.
 */

/** المسار الذي جاءت منه الملاحظة. لا يُدمج المسار الرسمي مع السوقي أبداً. */
export type PriceTrack = 'field' | 'app' | 'official';

/**
 * نوع الملاحظة — أهم حقل في السطر كلّه، لأنه يحدّد الوزن.
 * صفقة موثّقة ≠ صفقة مسموعة ≠ سعر معروض ≠ رأي مكتب.
 */
export type ObservationKind =
  | 'deal_registered'  // صفقة بإفراغ/عقد موثّق
  | 'deal_reported'    // صفقة تمّت حسب ما سمعت
  | 'listing'          // سعر معروض في تطبيق أو لوحة
  | 'opinion'          // رأي مكتب عقاري
  | 'official_tariff'; // تقدير رسمي / نشرة

export type LandShape = 'regular' | 'irregular';

/** قُرب المقارنة جغرافياً من أرضك. */
export type Proximity = 'same_block' | 'same_district' | 'adjacent_district' | 'same_city';

export type Reliability = 'high' | 'medium' | 'low';

/** صفات الأرض التي تدخل في التطبيع. كلها اختيارية في المقارنات، إلزامية في أرضك. */
export interface LandAttributes {
  areaSqm: number;
  /** عدد الواجهات على شوارع نافذة */
  frontages: number;
  /** عرض أوسع شارع بالمتر */
  streetWidthM: number;
  shape: LandShape;
  /** انحدار الأرض ٪ — يُحوَّل إلى خصم لأنه تكلفة تسوية فعلية */
  slopePct: number;
  /** معامل البناء: إجمالي المسطحات المسموحة ÷ مساحة الأرض (مثلاً ١٫٥) */
  far: number;
  /** الخدمات موصولة فعلياً على الأرض لا على المخطط */
  servicesReady: boolean;
}

export interface LandSubject extends LandAttributes {
  city: string;
  district: string;
  /** رقم المخطط والقطعة — للتقرير لا للحساب */
  planNo?: string;
  parcelNo?: string;
  zoningLabel?: string;
}

/** ملاحظة سعرية واحدة كما أدخلها المستخدم — يدوياً أو عبر موصّل. */
export interface PriceObservation extends Partial<LandAttributes> {
  id: string;
  track: PriceTrack;
  kind: ObservationKind;
  /** اسم المكتب أو التطبيق أو النشرة — إلزامي، لا سطر بلا مصدر */
  source: string;
  /** تاريخ الملاحظة لا تاريخ الإدخال (ISO) */
  observedAt: string;
  areaSqm: number;
  /** سعر المتر؛ إن أُدخل الإجمالي فقط يُشتق منه */
  pricePerSqm: number;
  proximity: Proximity;
  reliability: Reliability;
  /** عمر الإعلان بالأيام — إعلان عمره ثمانية أشهر ليس سعر سوق */
  listingAgeDays?: number;
  note?: string;
}

/** تسوية واحدة مطبَّقة على مقارنة، بنسبتها وسببها — تُعرض في التقرير. */
export interface Adjustment {
  key: string;
  label: string;
  /** نسبة التعديل (٠٫٠٧ = +٧٪) */
  pct: number;
  reason: string;
}

export interface NormalizedObservation {
  observation: PriceObservation;
  adjustments: Adjustment[];
  /** مجموع القيم المطلقة للتسويات — أساس قاعدة الاستبعاد */
  totalAbsAdjustment: number;
  adjustedPricePerSqm: number;
  weight: number;
  excluded: boolean;
  exclusionReason?: string;
}

export interface TrackSummary {
  track: PriceTrack;
  median: number;
  p25: number;
  p75: number;
  n: number;
  sources: string[];
}

export interface ConfidenceResult {
  /** ٠–١٠٠ */
  score: number;
  grade: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface LandValuation {
  subject: LandSubject;
  normalized: NormalizedObservation[];
  tracks: Partial<Record<PriceTrack, TrackSummary>>;
  /** القيمة السوقية المُصالَحة لسعر المتر */
  perSqm: { low: number; likely: number; high: number };
  totalValue: { low: number; likely: number; high: number };
  /** سعر البيع السريع (٣٠–٦٠ يوماً) وسعر الصبر (٦–١٢ شهراً) */
  quickSalePerSqm: number;
  patientPerSqm: number;
  /** الفجوات بين المسارات — نسبة مئوية موجبة تعني الأول أعلى */
  gaps: { appVsField: number | null; fieldVsOfficial: number | null };
  confidence: ConfidenceResult;
  warnings: string[];
  asOf: string;
}
