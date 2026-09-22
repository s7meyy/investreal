import {
  DEFAULT_ADJUSTMENTS, DEFAULT_HOLDING, DEFAULT_RESIDUAL, DEFAULT_TRANSACTION_COSTS,
  type AdjustmentConfig, type HoldingInputs, type LandSubject, type PriceObservation,
  type ReaderLens, type ResidualInputs, type TransactionCostConfig,
} from '@investreal/engine';

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
      observations: parsed.observations ?? [],
    };
  } catch {
    return null;
  }
}

/** المقارنات المقبولة فعلاً في الحساب — ما دونها لا يصلح لإصدار رقم. */
export const usableCount = (form: LandForm): number =>
  form.observations.filter((o) => o.pricePerSqm > 0 && o.track !== 'official').length;
