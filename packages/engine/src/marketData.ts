import type { PropertyType } from './types.js';

/**
 * طبقة بيانات السوق.
 *
 * إيجار السوق هو أخطر مُدخَل في المنصّة كلها: تحليل الحساسية يُظهر أنه
 * العامل الأقوى أثراً على العائد. لذلك لا نتركه لتقدير المستخدم وحده،
 * بل نُغذّيه من مصادر مرجعية.
 *
 * المصادر المستهدفة: «سهيل» و«بسيطة». كلاهما يُوصَّل عبر نفس الواجهة أدناه،
 * فإضافة مصدر جديد لا تمسّ المحرّك ولا الواجهة.
 *
 * ملاحظة صريحة: عقود الوصول لهذين المصدرين لم تُثبَّت بعد في هذا الكود —
 * `SuhailProvider` و`BaseetahProvider` يحملان الشكل المتوقّع للطلب والاستجابة
 * وتبقى نقاط الوصول ومفاتيحها مما يُضبط عند التعاقد. حتى ذلك الحين
 * `ManualProvider` و`DatasetProvider` يعملان بالكامل، ولا شيء في المحرّك
 * يتعطّل بغياب المصادر الخارجية.
 */

export interface MarketQuery {
  city: string;
  district?: string;
  propertyType: PropertyType;
  areaSqm?: number;
  bedrooms?: number;
}

export interface MarketComparable {
  /** إيجار سنوي بالريال */
  rentAnnual: number;
  areaSqm?: number;
  /** تاريخ العقد أو الرصد (ISO) */
  date?: string;
  source: string;
  /** عقد موثّق أم سعر إعلان — الفرق جوهري ويجب أن يظهر للمستخدم */
  kind: 'contract' | 'listing';
}

export interface MarketEstimate {
  city: string;
  district?: string;
  propertyType: PropertyType;
  /** الوسيط هو المرجع، لا المتوسط — أقل تأثراً بالقيم الشاذة */
  medianRentAnnual: number;
  p25RentAnnual: number;
  p75RentAnnual: number;
  sampleSize: number;
  /** نسبة العينة التي هي عقود موثّقة لا إعلانات */
  contractShare: number;
  asOf: string;
  sources: string[];
  /** ثقة التقدير: تقلّ مع صغر العينة وقِدمها وغلبة الإعلانات عليها */
  confidence: 'high' | 'medium' | 'low';
}

export interface MarketDataProvider {
  readonly id: string;
  readonly label: string;
  fetchComparables(query: MarketQuery): Promise<MarketComparable[]>;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  const a = sorted[lo]!, b = sorted[hi]!;
  return a + (b - a) * (idx - lo);
}

function yearsSince(iso?: string): number {
  if (!iso) return 99;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 99;
  return (Date.now() - then) / (365.2425 * 24 * 3600 * 1000);
}

function rateConfidence(comps: MarketComparable[]): MarketEstimate['confidence'] {
  const contractShare = comps.filter((c) => c.kind === 'contract').length / comps.length;
  const fresh = comps.filter((c) => yearsSince(c.date) <= 2).length / comps.length;
  if (comps.length >= 15 && contractShare >= 0.6 && fresh >= 0.6) return 'high';
  if (comps.length >= 6 && contractShare >= 0.3) return 'medium';
  return 'low';
}

/** يُلخّص عيّنة المقارنات إلى تقدير قابل للعرض والاستخدام كقيمة افتراضية. */
export function summarize(query: MarketQuery, comps: MarketComparable[], sources: string[]): MarketEstimate | null {
  if (comps.length === 0) return null;
  const sorted = comps.map((c) => c.rentAnnual).sort((a, b) => a - b);
  return {
    city: query.city,
    district: query.district,
    propertyType: query.propertyType,
    medianRentAnnual: percentile(sorted, 0.5),
    p25RentAnnual: percentile(sorted, 0.25),
    p75RentAnnual: percentile(sorted, 0.75),
    sampleSize: comps.length,
    contractShare: comps.filter((c) => c.kind === 'contract').length / comps.length,
    asOf: new Date().toISOString().slice(0, 10),
    sources,
    confidence: rateConfidence(comps),
  };
}

/** مقارنات يُدخلها المستثمر بنفسه من معاينته — يعمل بلا أي اتصال. */
export class ManualProvider implements MarketDataProvider {
  readonly id = 'manual';
  readonly label = 'إدخال يدوي';
  constructor(private readonly comps: MarketComparable[]) {}
  async fetchComparables(): Promise<MarketComparable[]> {
    return this.comps;
  }
}

/** مجموعة بيانات محلية (CSV/JSON مستورد) — للاستخدام دون اتصال أو للاختبار. */
export class DatasetProvider implements MarketDataProvider {
  readonly id: string;
  readonly label: string;
  constructor(id: string, label: string, private readonly rows: (MarketComparable & MarketQuery)[]) {
    this.id = id;
    this.label = label;
  }
  async fetchComparables(q: MarketQuery): Promise<MarketComparable[]> {
    return this.rows.filter(
      (r) =>
        r.city === q.city &&
        r.propertyType === q.propertyType &&
        (q.district === undefined || r.district === q.district),
    );
  }
}

export interface HttpProviderConfig {
  baseUrl: string;
  apiKey?: string;
  /** يحوّل استجابة المزوّد إلى مقارنات — يُضبط عند التعاقد مع المصدر. */
  parse: (payload: unknown) => MarketComparable[];
  fetchImpl?: typeof fetch;
}

/** أساس مشترك لأي مصدر يُقرأ عبر HTTP. */
export class HttpProvider implements MarketDataProvider {
  constructor(
    readonly id: string,
    readonly label: string,
    private readonly config: HttpProviderConfig,
  ) {}

  async fetchComparables(q: MarketQuery): Promise<MarketComparable[]> {
    const doFetch = this.config.fetchImpl ?? fetch;
    const url = new URL(this.config.baseUrl);
    url.searchParams.set('city', q.city);
    if (q.district) url.searchParams.set('district', q.district);
    url.searchParams.set('type', q.propertyType);
    if (q.areaSqm) url.searchParams.set('area', String(q.areaSqm));

    const res = await doFetch(url, {
      headers: this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {},
    });
    if (!res.ok) throw new Error(`${this.label}: تعذّر جلب البيانات (${res.status})`);
    return this.config.parse(await res.json());
  }
}

export const suhailProvider = (config: HttpProviderConfig) => new HttpProvider('suhail', 'سهيل', config);
export const baseetahProvider = (config: HttpProviderConfig) => new HttpProvider('baseetah', 'بسيطة', config);

/**
 * يجمع عدة مصادر في تقدير واحد. المصدر الذي يفشل لا يُسقط البقية —
 * أداة تُستخدم أثناء المعاينة الميدانية يجب ألا تتعطّل لأن مزوّداً لم يستجب.
 */
export async function estimateMarketRent(
  query: MarketQuery,
  providers: MarketDataProvider[],
): Promise<{ estimate: MarketEstimate | null; errors: string[] }> {
  const all: MarketComparable[] = [];
  const used: string[] = [];
  const errors: string[] = [];

  const results = await Promise.allSettled(providers.map((p) => p.fetchComparables(query)));
  results.forEach((r, i) => {
    const provider = providers[i]!;
    if (r.status === 'fulfilled' && r.value.length > 0) {
      all.push(...r.value);
      used.push(provider.label);
    } else if (r.status === 'rejected') {
      errors.push(`${provider.label}: ${String(r.reason)}`);
    }
  });

  return { estimate: summarize(query, all, used), errors };
}
