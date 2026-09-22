/**
 * الاتجاه والسيولة — ما يشتريه المستثمر فعلاً.
 *
 * سعر اليوم لقطة. المستثمر يشتري المنحنى: إلى أين يتجه السعر، وكم يستغرق
 * تحويل الأرض إلى نقد. أصل لا يُباع خلال سنة ليس بسعره النظري مهما قالت
 * المقارنات.
 */

export interface PricePoint {
  /** السنة الميلادية */
  year: number;
  pricePerSqm: number;
}

export interface LiquidityInputs {
  /** عدد الصفقات في الحي خلال آخر ستة أشهر */
  dealsLastSixMonths: number;
  /** متوسط مدّة البيع بالأيام */
  avgDaysOnMarket: number;
  /** عدد الإعلانات القائمة حالياً في الحي */
  activeListings: number;
}

export interface TrendResult {
  /** النمو السنوي المركّب عبر كامل السلسلة */
  cagr: number | null;
  /** نمو آخر سنة وحدها — قد يخالف الاتجاه العام */
  lastYearChange: number | null;
  /** هل الاتجاه مستقرّ أم متذبذب؟ (انحراف التغيّرات السنوية) */
  volatility: number | null;
  direction: 'rising' | 'flat' | 'falling' | 'unknown';
  /** السعر المتوقّع بعد عدد سنوات، بامتداد الاتجاه نفسه */
  project: (years: number) => number | null;
  note: string;
}

export function analyzeTrend(points: PricePoint[]): TrendResult {
  const rows = [...points].filter((p) => p.pricePerSqm > 0).sort((a, b) => a.year - b.year);

  if (rows.length < 2) {
    return {
      cagr: null, lastYearChange: null, volatility: null, direction: 'unknown',
      project: () => null,
      note: 'نقطتان على الأقل مطلوبتان لرسم اتجاه. نقطة واحدة ليست اتجاهاً.',
    };
  }

  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const span = last.year - first.year;
  const cagr = span > 0 ? Math.pow(last.pricePerSqm / first.pricePerSqm, 1 / span) - 1 : null;

  const changes: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]!, cur = rows[i]!;
    const years = Math.max(1, cur.year - prev.year);
    changes.push(Math.pow(cur.pricePerSqm / prev.pricePerSqm, 1 / years) - 1);
  }
  const lastYearChange = changes.length ? changes[changes.length - 1]! : null;
  const mean = changes.reduce((s, c) => s + c, 0) / changes.length;
  const volatility = Math.sqrt(changes.reduce((s, c) => s + (c - mean) ** 2, 0) / changes.length);

  const direction: TrendResult['direction'] =
    cagr === null ? 'unknown' : cagr > 0.02 ? 'rising' : cagr < -0.02 ? 'falling' : 'flat';

  let note: string;
  if (direction === 'rising' && lastYearChange !== null && lastYearChange < 0) {
    // الاتجاه العام لا يُخفي انعكاس السنة الأخيرة
    note = 'الاتجاه العام صاعد لكن آخر سنة هابطة — لا تبنِ توقّعك على المتوسط وحده.';
  } else if (volatility > 0.08) {
    note = 'التذبذب عالٍ: النمو المتوسط رقم ضعيف الدلالة هنا.';
  } else if (direction === 'falling') {
    note = 'الاتجاه هابط — سعر السوق اليوم قد يكون أعلى من سعر الغد.';
  } else if (direction === 'flat') {
    note = 'السعر شبه ثابت: الربح لن يأتي من الانتظار وحده.';
  } else {
    note = 'اتجاه صاعد ومستقرّ نسبياً.';
  }

  return {
    cagr, lastYearChange, volatility, direction,
    project: (years: number) => (cagr === null ? null : last.pricePerSqm * Math.pow(1 + cagr, years)),
    note,
  };
}

export interface LiquidityResult {
  /** شهور التصريف المقدّرة: المعروض ÷ معدّل البيع الشهري */
  monthsOfSupply: number | null;
  grade: 'liquid' | 'normal' | 'slow' | 'frozen';
  label: string;
  note: string;
}

export function analyzeLiquidity(input: LiquidityInputs): LiquidityResult {
  const monthlySales = input.dealsLastSixMonths / 6;
  const monthsOfSupply = monthlySales > 0 ? input.activeListings / monthlySales : null;

  let grade: LiquidityResult['grade'];
  if (input.dealsLastSixMonths === 0) grade = 'frozen';
  else if ((monthsOfSupply ?? 99) <= 6 && input.avgDaysOnMarket <= 90) grade = 'liquid';
  else if ((monthsOfSupply ?? 99) <= 12 && input.avgDaysOnMarket <= 180) grade = 'normal';
  else grade = 'slow';

  const label = { liquid: 'سوق سائل', normal: 'سيولة معتادة', slow: 'سوق بطيء', frozen: 'سوق راكد' }[grade];
  const note = {
    liquid: 'التصريف سريع: سعر البيع السريع قريب من سعر الصبر.',
    normal: 'التصريف ضمن المعتاد — احسب فترة تسويق من ٣ إلى ٦ أشهر.',
    slow: 'التصريف بطيء: الفرق بين سعر السريع وسعر الصبر حقيقي، وتكلفة الانتظار تُحتسب.',
    frozen: 'لا صفقات مسجّلة في آخر ستة أشهر — السعر هنا نظري حتى تثبت صفقة.',
  }[grade];

  return { monthsOfSupply, grade, label, note };
}
