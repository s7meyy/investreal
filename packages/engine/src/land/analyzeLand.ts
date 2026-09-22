import { DEFAULT_ADJUSTMENTS, type AdjustmentConfig } from './adjust.js';
import { reconcile } from './reconcile.js';
import { DEFAULT_RESIDUAL, profitAtLandPrice, residualLandValue, type ResidualInputs, type ResidualResult } from './residual.js';
import {
  DEFAULT_HOLDING, DEFAULT_TRANSACTION_COSTS, holdingReturn, transactionCosts,
  type HoldingInputs, type HoldingResult, type TransactionCostConfig, type TransactionCosts,
} from './costs.js';
import type { LandSubject, LandValuation, PriceObservation } from './types.js';

/** عدسة القارئ: الأرقام واحدة، وما يُبنى فوقها يختلف. */
export type ReaderLens = 'developer' | 'investor' | 'buyer';

export const LENS_LABEL: Record<ReaderLens, string> = {
  developer: 'مطوّر',
  investor: 'مستثمر',
  buyer: 'مشترٍ',
};

export interface LandCase {
  subject: LandSubject;
  observations: PriceObservation[];
  lens: ReaderLens;
  adjustments?: AdjustmentConfig;
  residual?: ResidualInputs;
  holding?: HoldingInputs;
  costs?: TransactionCostConfig;
  /** بيانات التقرير: معِدّه وهويته */
  preparedBy?: { name: string; title?: string; phone?: string; reportNo?: string };
}

export interface LandAnalysis {
  valuation: LandValuation;
  residual: ResidualResult;
  /** ربح المطوّر لو اشترى بسعر السوق المُصالَح */
  developerAtMarket: { profit: number; marginOnRevenue: number; marginOnCost: number };
  holding: HoldingResult;
  costsAtMarket: TransactionCosts;
  /** السعر الموصى به للتفاوض والسقف الذي لا يُتجاوز */
  recommendation: { headline: string; targetPerSqm: number; ceilingPerSqm: number; reasons: string[] };
}

/**
 * التحليل الكامل لأرض واحدة.
 *
 * ترتيب مقصود: المقارنات أولاً (بكم تُباع)، ثم المتبقّية (بكم تستحق أن
 * تُشترى)، ثم التكاليف (كم تُكلّف فعلاً). السقف هو الأدنى بين ما يحتمله
 * السوق وما يحتمله المشروع — الأعلى منهما وعدٌ لا يُوفى به.
 */
export function analyzeLand(input: LandCase): LandAnalysis {
  const cfg = input.adjustments ?? DEFAULT_ADJUSTMENTS;
  const residualInputs = input.residual ?? DEFAULT_RESIDUAL;
  const costCfg = input.costs ?? DEFAULT_TRANSACTION_COSTS;

  const valuation = reconcile(input.subject, input.observations, { adjustments: cfg });
  const residual = residualLandValue(input.subject, residualInputs);
  const market = valuation.perSqm.likely;
  const developerAtMarket = profitAtLandPrice(input.subject, market, residualInputs);
  const holding = holdingReturn(market, input.subject.areaSqm, input.holding ?? DEFAULT_HOLDING, costCfg);
  const costsAtMarket = transactionCosts(market * input.subject.areaSqm, costCfg);

  const reasons: string[] = [];
  let ceiling: number;

  if (input.lens === 'developer') {
    // المطوّر لا يدفع فوق ما يُبقي هامشه المستهدف، مهما قال السوق.
    ceiling = residual.feasible ? Math.min(residual.landValuePerSqm, valuation.perSqm.high) : 0;
    reasons.push(residual.feasible
      ? `القيمة المتبقّية تحتمل ${Math.round(residual.landValuePerSqm).toLocaleString('en-US')} ريال للمتر عند هامش ${Math.round(residualInputs.developerProfitPct * 100)}٪`
      : 'المشروع لا يحتمل أي ثمن للأرض بهذه الافتراضات — راجع تكلفة البناء أو سعر البيع.');
    if (residual.feasible && residual.landValuePerSqm < valuation.perSqm.low) {
      reasons.push('السوق يطلب أكثر مما يحتمله المشروع: إمّا هامش أقل، أو استخدام أكثف، أو أرض أخرى.');
    }
  } else if (input.lens === 'investor') {
    ceiling = valuation.perSqm.likely;
    reasons.push(holding.excessOverOpportunity !== null && holding.excessOverOpportunity > 0
      ? `العائد السنوي المتوقّع يتجاوز البديل الآمن بـ${(holding.excessOverOpportunity * 100).toFixed(1)} نقطة`
      : 'العائد المتوقّع لا يتجاوز البديل الآمن بعد الرسوم وتكاليف الحيازة');
    reasons.push(`تحتاج نمواً سنوياً ${(holding.breakevenAppreciation * 100).toFixed(1)}٪ لمجرّد التعادل مع البديل الآمن`);
  } else {
    ceiling = valuation.perSqm.high;
    reasons.push(`النطاق العادل ${Math.round(valuation.perSqm.low).toLocaleString('en-US')}–${Math.round(valuation.perSqm.high).toLocaleString('en-US')} ريال للمتر`);
    reasons.push(`فوق الثمن تُضاف تكاليف على المشتري بنحو ${Math.round(costsAtMarket.buyerTotal).toLocaleString('en-US')} ريال`);
  }

  const target = input.lens === 'developer' && residual.feasible
    ? Math.min(valuation.perSqm.low, residual.landValuePerSqm)
    : valuation.perSqm.low;

  if (valuation.confidence.grade === 'low') {
    reasons.push('درجة الثقة منخفضة: عامل هذه الأرقام كنطاق استرشادي، وزد المقارنات الموثّقة قبل الالتزام.');
  }

  const money = (v: number) => Math.round(v).toLocaleString('en-US');
  let headline: string;
  if (valuation.perSqm.likely <= 0) {
    headline = 'لا تكفي المقارنات لإصدار قيمة';
  } else if (input.lens === 'developer' && !residual.feasible) {
    headline = `السوق عند ${money(valuation.perSqm.likely)} ريال للمتر، ومشروعك بهذه الافتراضات لا يحتمل أي ثمن للأرض`;
  } else if (input.lens === 'developer' && ceiling < valuation.perSqm.low) {
    // إظهار الرقمين معاً أصدق من إظهار سقف منخفض بلا تفسير
    headline = `السوق عند ${money(valuation.perSqm.likely)} ريال للمتر، ومشروعك لا يحتمل فوق ${money(ceiling)}`;
  } else {
    headline = `القيمة المرجّحة ${money(valuation.perSqm.likely)} ريال للمتر، والسقف ${money(ceiling)}`;
  }

  return {
    valuation,
    residual,
    developerAtMarket,
    holding,
    costsAtMarket,
    recommendation: { headline, targetPerSqm: target, ceilingPerSqm: ceiling, reasons },
  };
}
