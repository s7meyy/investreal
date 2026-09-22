import type {
  Adjustment, LandSubject, NormalizedObservation, ObservationKind,
  PriceObservation, Proximity, Reliability,
} from './types.js';

/**
 * التطبيع: تحويل كل ملاحظة إلى «كم كان سعر مترها لو كانت أرضك».
 *
 * بلا هذه الطبقة تكون المقارنة كذبة مهذّبة: قطعة ٣٠٠م² على شارع ٣٠ زاوية
 * لا تُقارَن بقطعة ١٬٢٠٠م² على شارع ١٠ داخلية لمجرّد أنهما في الحي نفسه.
 *
 * كل معامل هنا قابل للتعديل من الواجهة، ويظهر في التقرير بنسبته وسببه.
 * الشفافية هنا ليست تجميلاً: قارئ التقرير يجب أن يستطيع الاعتراض على
 * تسوية بعينها لا أن يقبل الرقم أو يرفضه جملة.
 */
export interface AdjustmentConfig {
  /** مرونة سعر المتر تجاه المساحة: pps ∝ المساحة^-k. الأصغر أغلى للمتر. */
  areaElasticity: number;
  /** أثر كل متر فرق في عرض الشارع */
  streetWidthPerMeter: number;
  streetWidthCap: number;
  /** علاوة الزاوية (واجهتان) وثلاث واجهات فأكثر */
  cornerPremium: number;
  multiFrontagePremium: number;
  /** خصم الشكل غير المنتظم */
  irregularShapeDiscount: number;
  /** خصم لكل ١٪ انحدار */
  slopePerPct: number;
  slopeCap: number;
  /** مرونة السعر تجاه معامل البناء المسموح */
  farElasticity: number;
  farCap: number;
  /** خصم عدم جاهزية الخدمات */
  servicesDiscount: number;
  /** نمو سوق سنوي يُستخدم للتعديل الزمني */
  annualGrowth: number;
  /** فجوة السعر المعروض عن سعر البيع الفعلي */
  listingAskingGap: number;
  /** زيادة الخصم لكل شهر بقاء الإعلان، وسقفها */
  listingAgePerMonth: number;
  listingAgeCap: number;
  /** خصم الرأي غير المسنَد */
  opinionDiscount: number;
  /** أي مقارنة تجاوز مجموع تسوياتها هذا الحد تُستبعد */
  exclusionThreshold: number;
}

/**
 * الافتراضات مبنية على سلوك سوقي عام لأراضي الرياض السكنية، وهي
 * **نقطة بداية قابلة للتعديل** لا ثوابت. لكل حي سلوكه، ومن يعرف حيّه
 * أدرى بمعاملاته — الواجهة تعرضها للتعديل، والتقرير يذكر المستعملة منها.
 */
export const DEFAULT_ADJUSTMENTS: AdjustmentConfig = {
  areaElasticity: 0.08,
  streetWidthPerMeter: 0.008,
  streetWidthCap: 0.15,
  cornerPremium: 0.07,
  multiFrontagePremium: 0.12,
  irregularShapeDiscount: 0.06,
  slopePerPct: 0.005,
  slopeCap: 0.12,
  farElasticity: 0.7,
  farCap: 0.25,
  servicesDiscount: 0.05,
  annualGrowth: 0.05,
  listingAskingGap: 0.05,
  listingAgePerMonth: 0.005,
  listingAgeCap: 0.10,
  opinionDiscount: 0.08,
  exclusionThreshold: 0.30,
};

const clamp = (v: number, cap: number) => Math.max(-cap, Math.min(cap, v));

export function yearsBetween(iso: string, now = new Date()): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 0;
  return (now.getTime() - then) / (365.2425 * 24 * 3600 * 1000);
}

/** وزن نوع الملاحظة: صفقة موثّقة تساوي رأياً ثلاث مرّات ونصف. */
const KIND_WEIGHT: Record<ObservationKind, number> = {
  deal_registered: 1.0,
  deal_reported: 0.7,
  listing: 0.5,
  opinion: 0.3,
  official_tariff: 1.0,
};

const PROXIMITY_WEIGHT: Record<Proximity, number> = {
  same_block: 1.0,
  same_district: 0.9,
  adjacent_district: 0.6,
  same_city: 0.3,
};

const RELIABILITY_WEIGHT: Record<Reliability, number> = { high: 1, medium: 0.85, low: 0.7 };

export const KIND_LABEL: Record<ObservationKind, string> = {
  deal_registered: 'صفقة موثّقة',
  deal_reported: 'صفقة مسموعة',
  listing: 'سعر معروض',
  opinion: 'رأي مكتب',
  official_tariff: 'تقدير رسمي',
};

export const TRACK_LABEL = {
  field: 'ميداني',
  app: 'التطبيقات العقارية',
  official: 'رسمي / تنفيذي',
} as const;

/** يبني قائمة التسويات لمقارنة واحدة مقابل أرضك. */
export function buildAdjustments(
  subject: LandSubject,
  obs: PriceObservation,
  cfg: AdjustmentConfig = DEFAULT_ADJUSTMENTS,
  now = new Date(),
): Adjustment[] {
  const out: Adjustment[] = [];
  const push = (key: string, label: string, pct: number, reason: string) => {
    if (Math.abs(pct) >= 0.001) out.push({ key, label, pct, reason });
  };

  // المساحة: سعر المتر يقلّ كلما كبرت القطعة، فنُعيد المقارنة إلى مساحتك.
  if (obs.areaSqm > 0 && subject.areaSqm > 0) {
    const pct = Math.pow(obs.areaSqm / subject.areaSqm, cfg.areaElasticity) - 1;
    push('area', 'المساحة', pct,
      `مساحة المقارنة ${Math.round(obs.areaSqm)}م² مقابل ${Math.round(subject.areaSqm)}م² لأرضك`);
  }

  if (obs.streetWidthM !== undefined) {
    const diff = subject.streetWidthM - obs.streetWidthM;
    push('street', 'عرض الشارع', clamp(diff * cfg.streetWidthPerMeter, cfg.streetWidthCap),
      `شارع أرضك ${subject.streetWidthM}م مقابل ${obs.streetWidthM}م للمقارنة`);
  }

  if (obs.frontages !== undefined) {
    const value = (n: number) => (n >= 3 ? cfg.multiFrontagePremium : n === 2 ? cfg.cornerPremium : 0);
    push('frontage', 'الواجهات', value(subject.frontages) - value(obs.frontages),
      `${subject.frontages} واجهة لأرضك مقابل ${obs.frontages} للمقارنة`);
  }

  if (obs.shape !== undefined) {
    const value = (s: string) => (s === 'irregular' ? -cfg.irregularShapeDiscount : 0);
    push('shape', 'انتظام الشكل', value(subject.shape) - value(obs.shape),
      subject.shape === obs.shape ? 'الشكل متماثل' : 'فرق في انتظام الشكل');
  }

  if (obs.slopePct !== undefined) {
    const diff = obs.slopePct - subject.slopePct;
    push('slope', 'الانحدار', clamp(diff * cfg.slopePerPct, cfg.slopeCap),
      `انحدار أرضك ${subject.slopePct}٪ مقابل ${obs.slopePct}٪ للمقارنة`);
  }

  // معامل البناء: المطوّر يدفع مقابل ما يُبنى لا مقابل التراب.
  if (obs.far !== undefined && obs.far > 0 && subject.far > 0) {
    const pct = Math.pow(subject.far / obs.far, cfg.farElasticity) - 1;
    push('far', 'معامل البناء', clamp(pct, cfg.farCap),
      `معامل أرضك ${subject.far} مقابل ${obs.far} للمقارنة`);
  }

  if (obs.servicesReady !== undefined && obs.servicesReady !== subject.servicesReady) {
    push('services', 'جاهزية الخدمات',
      subject.servicesReady ? cfg.servicesDiscount : -cfg.servicesDiscount,
      subject.servicesReady ? 'أرضك مخدومة والمقارنة غير مخدومة' : 'المقارنة مخدومة وأرضك غير مخدومة');
  }

  // التعديل الزمني: صفقة قبل سنة ليست صفقة اليوم.
  const age = yearsBetween(obs.observedAt, now);
  if (age > 0.08) {
    push('time', 'التعديل الزمني', Math.pow(1 + cfg.annualGrowth, age) - 1,
      `مضى على الملاحظة ${age.toFixed(1)} سنة، عُدّلت بنمو ${(cfg.annualGrowth * 100).toFixed(1)}٪ سنوياً`);
  } else if (age < -0.08) {
    push('time', 'التعديل الزمني', 0, 'تاريخ الملاحظة في المستقبل — تحقّق منه');
  }

  // سعر المعروض ليس سعر البيع، وكلما طال بقاء الإعلان اتّسعت الفجوة.
  if (obs.kind === 'listing') {
    const months = Math.max(0, (obs.listingAgeDays ?? 0) / 30.44);
    const ageGap = Math.min(months * cfg.listingAgePerMonth, cfg.listingAgeCap);
    push('asking', 'فجوة السعر المعروض', -(cfg.listingAskingGap + ageGap),
      months >= 1
        ? `سعر معروض، والإعلان قائم منذ ${months.toFixed(0)} شهراً`
        : 'سعر معروض لا سعر بيع');
  }

  if (obs.kind === 'opinion') {
    push('opinion', 'رأي غير مسنَد', -cfg.opinionDiscount, 'تقدير شفهي بلا صفقة تسنده');
  }

  return out;
}

/** يطبّق التسويات ويحسب الوزن ويقرّر الاستبعاد. */
export function normalize(
  subject: LandSubject,
  obs: PriceObservation,
  cfg: AdjustmentConfig = DEFAULT_ADJUSTMENTS,
  now = new Date(),
): NormalizedObservation {
  const adjustments = buildAdjustments(subject, obs, cfg, now);
  const totalAbsAdjustment = adjustments.reduce((s, a) => s + Math.abs(a.pct), 0);
  const adjusted = adjustments.reduce((p, a) => p * (1 + a.pct), obs.pricePerSqm);

  const age = Math.max(0, yearsBetween(obs.observedAt, now));
  const recency = Math.max(0.2, 1 - age / 2);
  const penalty = Math.max(0.3, 1 - totalAbsAdjustment);
  const weight =
    KIND_WEIGHT[obs.kind] *
    PROXIMITY_WEIGHT[obs.proximity] *
    RELIABILITY_WEIGHT[obs.reliability] *
    recency * penalty;

  // مقارنة تحتاج تعديلاً ثلثَ قيمتها ليست مقارنة — تُعرض ولا تُحسب.
  let excluded = false;
  let exclusionReason: string | undefined;
  if (obs.pricePerSqm <= 0) {
    excluded = true;
    exclusionReason = 'سعر المتر غير صالح';
  } else if (totalAbsAdjustment > cfg.exclusionThreshold) {
    excluded = true;
    exclusionReason = `مجموع التسويات ${(totalAbsAdjustment * 100).toFixed(0)}٪ يتجاوز الحد ${(cfg.exclusionThreshold * 100).toFixed(0)}٪`;
  } else if (age > 3) {
    excluded = true;
    exclusionReason = `الملاحظة أقدم من ثلاث سنوات (${age.toFixed(1)} سنة)`;
  }

  return {
    observation: obs,
    adjustments,
    totalAbsAdjustment,
    adjustedPricePerSqm: adjusted,
    weight: excluded ? 0 : weight,
    excluded,
    exclusionReason,
  };
}
