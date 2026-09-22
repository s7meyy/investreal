import { DEFAULT_ADJUSTMENTS, normalize, yearsBetween, type AdjustmentConfig } from './adjust.js';
import type {
  ConfidenceResult, LandSubject, LandValuation, NormalizedObservation,
  PriceObservation, PriceTrack, TrackSummary,
} from './types.js';

/**
 * المصالحة: من عشرات الملاحظات المتفرّقة إلى نطاق واحد بثقة معلنة.
 *
 * ثلاثة مبادئ محكّمة هنا:
 * ١. الوسيط المرجّح لا المتوسط — صفقة شاذة واحدة تُفسد المتوسط.
 * ٢. المخرَج نطاق لا رقم، ومعه سعران: سريع وصبور. السعر بلا زمن نصف معلومة.
 * ٣. المسار الرسمي يُعرض ولا يُدمج — هو أساس الرسوم لا سعر البيع.
 */

/** مئين مرجّح: يوزّع الوزن على المحور ثم يقرأ عنده. */
export function weightedPercentile(
  pairs: { value: number; weight: number }[],
  p: number,
): number {
  const rows = pairs.filter((r) => r.weight > 0).sort((a, b) => a.value - b.value);
  if (rows.length === 0) return 0;
  if (rows.length === 1) return rows[0]!.value;
  const total = rows.reduce((s, r) => s + r.weight, 0);
  const target = p * total;
  let cum = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const start = cum;
    cum += row.weight;
    if (cum >= target) {
      const next = rows[i + 1];
      if (!next) return row.value;
      // استيفاء خطّي داخل شريحة الوزن حتى لا يقفز المئين بين قيمتين
      const within = row.weight === 0 ? 0 : (target - start) / row.weight;
      return row.value + (next.value - row.value) * Math.max(0, Math.min(1, within));
    }
  }
  return rows[rows.length - 1]!.value;
}

function summarizeTrack(track: PriceTrack, rows: NormalizedObservation[]): TrackSummary | undefined {
  const usable = rows.filter((r) => !r.excluded && r.weight > 0);
  if (usable.length === 0) return undefined;
  const pairs = usable.map((r) => ({ value: r.adjustedPricePerSqm, weight: r.weight }));
  return {
    track,
    median: weightedPercentile(pairs, 0.5),
    p25: weightedPercentile(pairs, 0.25),
    p75: weightedPercentile(pairs, 0.75),
    n: usable.length,
    sources: [...new Set(usable.map((r) => r.observation.source))],
  };
}

function rateConfidence(
  rows: NormalizedObservation[],
  tracks: Partial<Record<PriceTrack, TrackSummary>>,
  now: Date,
): ConfidenceResult {
  const usable = rows.filter((r) => !r.excluded);
  const reasons: string[] = [];
  let score = 0;

  // ١) حجم العيّنة (٣٠)
  const n = usable.length;
  const sizePoints = Math.min(30, n * 5);
  score += sizePoints;
  reasons.push(n >= 6 ? `عدد المقارنات المقبولة ${n}` : `عيّنة صغيرة: ${n} مقارنة فقط`);

  // ٢) نسبة الموثّق (٢٥) — أهم عامل في مصداقية الرقم
  const documented = usable.filter((r) => r.observation.kind === 'deal_registered').length;
  const share = n === 0 ? 0 : documented / n;
  score += share * 25;
  reasons.push(share >= 0.4
    ? `${Math.round(share * 100)}٪ من العيّنة صفقات موثّقة`
    : `الصفقات الموثّقة ${Math.round(share * 100)}٪ فقط — أكثر الرقم مبني على معروض أو سماع`);

  // ٣) الحداثة (٢٠)
  const ages = usable.map((r) => Math.max(0, yearsBetween(r.observation.observedAt, now)));
  const avgAge = ages.length === 0 ? 99 : ages.reduce((s, a) => s + a, 0) / ages.length;
  score += Math.max(0, 20 - avgAge * 13);
  if (ages.length) {
    reasons.push(avgAge <= 0.5
      ? 'الملاحظات حديثة (أقل من ستة أشهر وسطياً)'
      : `متوسط عمر الملاحظات ${avgAge.toFixed(1)} سنة`);
  }

  // ٤) تماسك العيّنة (١٥): تشتّت واسع يعني أن السوق نفسه غير محسوم
  const market = [tracks.field, tracks.app].filter(Boolean) as TrackSummary[];
  const spread = market.length && market[0]!.median > 0
    ? (Math.max(...market.map((t) => t.p75)) - Math.min(...market.map((t) => t.p25))) /
      weightedPercentile(market.map((t) => ({ value: t.median, weight: t.n })), 0.5)
    : 1;
  score += Math.max(0, 15 - spread * 30);
  if (market.length) {
    reasons.push(spread <= 0.25
      ? 'المقارنات متقاربة'
      : `تشتّت المقارنات واسع (${Math.round(spread * 100)}٪) — السوق نفسه غير محسوم هنا`);
  }

  // ٥) تعدّد المسارات (١٠): مسار واحد يعني رأياً واحداً مهما كثر عدده
  const trackCount = Object.keys(tracks).length;
  score += Math.min(10, trackCount * 4);
  if (trackCount < 2) reasons.push('مسار واحد فقط — أضف مصدراً من مسار آخر لرفع الثقة');

  const rounded = Math.round(Math.max(0, Math.min(100, score)));
  return {
    score: rounded,
    grade: rounded >= 70 ? 'high' : rounded >= 45 ? 'medium' : 'low',
    reasons,
  };
}

export interface ReconcileOptions {
  adjustments?: AdjustmentConfig;
  now?: Date;
}

export function reconcile(
  subject: LandSubject,
  observations: PriceObservation[],
  opts: ReconcileOptions = {},
): LandValuation {
  const cfg = opts.adjustments ?? DEFAULT_ADJUSTMENTS;
  const now = opts.now ?? new Date();
  const normalized = observations.map((o) => normalize(subject, o, cfg, now));

  const tracks: Partial<Record<PriceTrack, TrackSummary>> = {};
  for (const track of ['field', 'app', 'official'] as PriceTrack[]) {
    const s = summarizeTrack(track, normalized.filter((r) => r.observation.track === track));
    if (s) tracks[track] = s;
  }

  // القيمة السوقية من المسارين السوقيين فقط — الرسمي يُعرض ولا يُدمج.
  const marketPairs = normalized
    .filter((r) => !r.excluded && r.weight > 0 && r.observation.track !== 'official')
    .map((r) => ({ value: r.adjustedPricePerSqm, weight: r.weight }));

  const likely = weightedPercentile(marketPairs, 0.5);
  const low = weightedPercentile(marketPairs, 0.25);
  const high = weightedPercentile(marketPairs, 0.75);

  const gap = (a?: TrackSummary, b?: TrackSummary) =>
    a && b && b.median > 0 ? (a.median - b.median) / b.median : null;

  const warnings: string[] = [];
  if (marketPairs.length === 0) warnings.push('لا توجد مقارنة سوقية مقبولة واحدة — الرقم غير قابل للإصدار.');
  if (marketPairs.length > 0 && marketPairs.length < 3) warnings.push('أقل من ثلاث مقارنات مقبولة: النطاق إرشادي لا أكثر.');

  const appVsField = gap(tracks.app, tracks.field);
  if (appVsField !== null && appVsField > 0.15) {
    warnings.push(`المعروض في التطبيقات أعلى من الميداني بـ${Math.round(appVsField * 100)}٪ — معروض متضخّم، وقوة التفاوض مع المشتري.`);
  }
  const fieldVsOfficial = gap(tracks.field, tracks.official);
  if (fieldVsOfficial !== null && fieldVsOfficial < 0) {
    warnings.push(`التقدير الرسمي أعلى من السعر الميداني بـ${Math.round(-fieldVsOfficial * 100)}٪ — إمّا السوق هابط أو التقدير متأخّر عن الواقع. راجع قبل الاعتماد.`);
  }
  const excludedCount = normalized.filter((r) => r.excluded).length;
  if (excludedCount > 0) warnings.push(`استُبعدت ${excludedCount} مقارنة وتظهر في ملحق المقارنات الضعيفة بسببها.`);

  return {
    subject,
    normalized,
    tracks,
    perSqm: { low, likely, high },
    totalValue: {
      low: low * subject.areaSqm,
      likely: likely * subject.areaSqm,
      high: high * subject.areaSqm,
    },
    quickSalePerSqm: low,
    patientPerSqm: high,
    gaps: { appVsField, fieldVsOfficial },
    confidence: rateConfidence(normalized, tracks, now),
    warnings,
    asOf: now.toISOString().slice(0, 10),
  };
}
