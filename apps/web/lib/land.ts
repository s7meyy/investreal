import {
  DEFAULT_ADJUSTMENTS, DEFAULT_HOLDING, DEFAULT_RESIDUAL, DEFAULT_TRANSACTION_COSTS, UNKNOWN_LAND_LEGAL,
  type AdjustmentConfig, type HoldingInputs, type LandSubject, type LiquidityInputs,
  type PriceObservation, type PricePoint, type ReaderLens, type ResidualInputs,
  type ComparisonEntry, type LandLegalAnswers, type TransactionCostConfig, type UseScenario,
} from '@investreal/engine';
import { defaultSections, type ReportSections } from '@/components/ReportSections';

/** حالة شاشة تقييم الأرض كاملةً — تُحفظ وتُشارَك كوحدة واحدة. */
import type { ParcelDims } from '@/components/ParcelSketch';

export interface LandForm {
  subject: LandSubject;
  dims: ParcelDims;
  /** إحداثيات أو رابط خرائط — يُرمَّز في كيو آر التقرير */
  location: string;
  observations: PriceObservation[];
  lens: ReaderLens;
  adjustments: AdjustmentConfig;
  residual: ResidualInputs;
  holding: HoldingInputs;
  costs: TransactionCostConfig;
  preparedBy: { name: string; title: string; phone: string; reportNo: string };
  title: string;
  trend: PricePoint[];
  liquidity: LiquidityInputs;
  offers: { discountRate: number; deferMonths: number; downPaymentPct: number; cashDiscountPct: number };
  scenarios: UseScenario[];
  legal: LandLegalAnswers;
  report: ReportSections;
}

const today = () => new Date().toISOString().slice(0, 10);

export const defaultLandForm = (): LandForm => ({
  subject: {
    city: 'الرياض',
    district: '',
    areaSqm: 750,
    frontages: 1,
    streetWidthM: 20,
    shape: 'regular',
    slopePct: 0,
    far: 1.5,
    servicesReady: true,
    zoningLabel: 'سكني',
  },
  dims: { north: 0, south: 0, east: 0, west: 0, streetSides: ['north'] },
  location: '',
  observations: [],
  lens: 'developer',
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  residual: { ...DEFAULT_RESIDUAL },
  holding: { ...DEFAULT_HOLDING },
  costs: { ...DEFAULT_TRANSACTION_COSTS },
  preparedBy: { name: '', title: '', phone: '', reportNo: '' },
  title: '',
  trend: [],
  liquidity: { dealsLastSixMonths: 0, avgDaysOnMarket: 0, activeListings: 0 },
  offers: { discountRate: 0.08, deferMonths: 12, downPaymentPct: 0.3, cashDiscountPct: 0.05 },
  scenarios: [],
  legal: { ...UNKNOWN_LAND_LEGAL },
  report: defaultSections(),
});

let seq = 0;
export const newObservation = (track: PriceObservation['track']): PriceObservation => ({
  id: `o${Date.now().toString(36)}${(seq++).toString(36)}`,
  track,
  kind: track === 'official' ? 'official_tariff' : track === 'app' ? 'listing' : 'deal_reported',
  source: '',
  observedAt: today(),
  areaSqm: 750,
  pricePerSqm: 0,
  proximity: 'same_district',
  reliability: 'medium',
  ...(track === 'app' ? { listingAgeDays: 0 } : {}),
});

const KEY = 'investreal:land:v1';

export function saveLand(form: LandForm): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(form));
  } catch {
    // تصفّح خاص أو تخزين ممتلئ — الأداة تعمل بلا حفظ.
  }
}

export function loadLand(): LandForm | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LandForm>;
    const base = defaultLandForm();
    return {
      ...base,
      ...parsed,
      subject: { ...base.subject, ...parsed.subject },
      dims: { ...base.dims, ...parsed.dims },
      adjustments: { ...base.adjustments, ...parsed.adjustments },
      residual: { ...base.residual, ...parsed.residual },
      holding: { ...base.holding, ...parsed.holding },
      costs: { ...base.costs, ...parsed.costs },
      preparedBy: { ...base.preparedBy, ...parsed.preparedBy },
      liquidity: { ...base.liquidity, ...parsed.liquidity },
      offers: { ...base.offers, ...parsed.offers },
      legal: { ...base.legal, ...parsed.legal },
      report: { ...base.report, ...parsed.report },
      observations: parsed.observations ?? [],
      trend: parsed.trend ?? [],
      scenarios: parsed.scenarios ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * الفرص المحفوظة للمقارنة.
 *
 * تُخزَّن كنتائج مُلخّصة لا كحالات كاملة: المقارنة تحتاج ستة أرقام لكل
 * فرصة، وحفظ الحالات كاملةً يملأ التخزين بما لا يُقرأ.
 */
const CASES_KEY = 'investreal:land:cases:v1';

export function loadCases(): ComparisonEntry[] {
  try {
    const raw = localStorage.getItem(CASES_KEY);
    return raw ? (JSON.parse(raw) as ComparisonEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveCases(entries: ComparisonEntry[]): void {
  try {
    localStorage.setItem(CASES_KEY, JSON.stringify(entries));
  } catch {
    // تخزين ممتلئ أو معطّل — المقارنة تعمل داخل الجلسة بلا حفظ.
  }
}

/** المقارنات المقبولة فعلاً في الحساب — ما دونها لا يصلح لإصدار رقم. */
export const usableCount = (form: LandForm): number =>
  form.observations.filter((o) => o.pricePerSqm > 0 && o.track !== 'official').length;

/** ترميز آمن للعربية في الرابط (btoa وحده يختنق بغير اللاتينية). */
function encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(value: string): string {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

/**
 * رابط المشاركة يحمل المدخلات لا الصور: الصور تبقى على جهاز مُعِدّ التقرير،
 * ورابط يحمل لقطة قمر صناعي كاملة لا يصلح للإرسال أصلاً.
 */
export function toLandShareUrl(form: LandForm, origin: string): string {
  return `${origin}/land/#f=${encode(JSON.stringify(form))}`;
}

export function fromLandHash(hash: string): LandForm | null {
  const match = hash.match(/[#&]f=([^&]+)/);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(decode(match[1])) as Partial<LandForm>;
    const base = defaultLandForm();
    return {
      ...base, ...parsed,
      subject: { ...base.subject, ...parsed.subject },
      dims: { ...base.dims, ...parsed.dims },
      adjustments: { ...base.adjustments, ...parsed.adjustments },
      residual: { ...base.residual, ...parsed.residual },
      holding: { ...base.holding, ...parsed.holding },
      costs: { ...base.costs, ...parsed.costs },
      preparedBy: { ...base.preparedBy, ...parsed.preparedBy },
      liquidity: { ...base.liquidity, ...parsed.liquidity },
      offers: { ...base.offers, ...parsed.offers },
      legal: { ...base.legal, ...parsed.legal },
      report: { ...base.report, ...parsed.report },
      observations: parsed.observations ?? [],
      trend: parsed.trend ?? [],
      scenarios: parsed.scenarios ?? [],
    };
  } catch {
    return null;
  }
}

