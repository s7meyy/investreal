import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ADJUSTMENTS, DEFAULT_RESIDUAL, DEFAULT_TRANSACTION_COSTS,
  UNKNOWN_LAND_LEGAL, analyzeLand, analyzeLiquidity, analyzeTrend, bestUse, buildAdjustments,
  compareOpportunities, equivalentOffers, holdingReturn, landSensitivity, maxLandPriceForMargin,
  normalize, scoreLandLegal, sensitivityHeadline,
  profitAtLandPrice, reconcile, residualLandValue, transactionCosts, weightedPercentile,
  type LandSubject, type PriceObservation,
} from '../src/index.js';

const NOW = new Date('2026-09-22T00:00:00Z');

/** أرض سكنية في الرياض — الحالة المرجعية لهذا المحرّك. */
const subject: LandSubject = {
  city: 'الرياض',
  district: 'النرجس',
  areaSqm: 750,
  frontages: 1,
  streetWidthM: 20,
  shape: 'regular',
  slopePct: 0,
  far: 1.5,
  servicesReady: true,
};

const obs = (o: Partial<PriceObservation> & Pick<PriceObservation, 'id' | 'track' | 'kind' | 'pricePerSqm'>): PriceObservation => ({
  source: 'مصدر',
  observedAt: '2026-08-01',
  areaSqm: 750,
  proximity: 'same_district',
  reliability: 'medium',
  frontages: 1,
  streetWidthM: 20,
  shape: 'regular',
  slopePct: 0,
  far: 1.5,
  servicesReady: true,
  ...o,
});

describe('المئين المرجّح', () => {
  it('يُرجع القيمة الوحيدة عند وجود ملاحظة واحدة', () => {
    expect(weightedPercentile([{ value: 4000, weight: 1 }], 0.5)).toBe(4000);
  });

  it('ينحاز للقيمة الأثقل وزناً لا لعددها', () => {
    const pairs = [
      { value: 3000, weight: 1 },
      { value: 5000, weight: 9 },
    ];
    expect(weightedPercentile(pairs, 0.5)).toBeGreaterThan(4800);
  });

  it('يتجاهل الأوزان الصفرية (المستبعدات)', () => {
    const pairs = [{ value: 100, weight: 0 }, { value: 4000, weight: 1 }];
    expect(weightedPercentile(pairs, 0.5)).toBe(4000);
  });
});

describe('التطبيع', () => {
  it('يخفض سعر متر المقارنة الأصغر مساحةً', () => {
    const small = obs({ id: '1', track: 'field', kind: 'deal_registered', pricePerSqm: 5000, areaSqm: 375 });
    const n = normalize(subject, small, DEFAULT_ADJUSTMENTS, NOW);
    expect(n.adjustedPricePerSqm).toBeLessThan(5000);
  });

  it('يرفع مقارنة على شارع أضيق من شارع أرضك', () => {
    const narrow = obs({ id: '2', track: 'field', kind: 'deal_registered', pricePerSqm: 5000, streetWidthM: 12 });
    const n = normalize(subject, narrow, DEFAULT_ADJUSTMENTS, NOW);
    expect(n.adjustedPricePerSqm).toBeGreaterThan(5000);
  });

  it('يخصم من السعر المعروض، ويزيد الخصم كلما طال بقاء الإعلان', () => {
    const fresh = normalize(subject, obs({ id: '3', track: 'app', kind: 'listing', pricePerSqm: 5000, listingAgeDays: 5 }), DEFAULT_ADJUSTMENTS, NOW);
    const stale = normalize(subject, obs({ id: '4', track: 'app', kind: 'listing', pricePerSqm: 5000, listingAgeDays: 240 }), DEFAULT_ADJUSTMENTS, NOW);
    expect(fresh.adjustedPricePerSqm).toBeLessThan(5000);
    expect(stale.adjustedPricePerSqm).toBeLessThan(fresh.adjustedPricePerSqm);
  });

  it('يرفع الملاحظة القديمة بنمو السوق', () => {
    const old = obs({ id: '5', track: 'field', kind: 'deal_registered', pricePerSqm: 5000, observedAt: '2025-09-22' });
    const adj = buildAdjustments(subject, old, DEFAULT_ADJUSTMENTS, NOW).find((a) => a.key === 'time');
    expect(adj?.pct).toBeCloseTo(0.05, 2);
  });

  it('يستبعد المقارنة التي تتجاوز تسوياتها الحد', () => {
    const far = obs({
      id: '6', track: 'field', kind: 'deal_registered', pricePerSqm: 5000,
      areaSqm: 60, streetWidthM: 60, far: 4, shape: 'irregular', slopePct: 25,
    });
    const n = normalize(subject, far, DEFAULT_ADJUSTMENTS, NOW);
    expect(n.excluded).toBe(true);
    expect(n.weight).toBe(0);
  });

  it('يستبعد الملاحظة الأقدم من ثلاث سنوات', () => {
    const ancient = obs({ id: '7', track: 'field', kind: 'deal_registered', pricePerSqm: 5000, observedAt: '2021-01-01' });
    expect(normalize(subject, ancient, DEFAULT_ADJUSTMENTS, NOW).excluded).toBe(true);
  });

  it('يزن الصفقة الموثّقة أثقل من الرأي', () => {
    const deal = normalize(subject, obs({ id: '8', track: 'field', kind: 'deal_registered', pricePerSqm: 5000 }), DEFAULT_ADJUSTMENTS, NOW);
    const opinion = normalize(subject, obs({ id: '9', track: 'field', kind: 'opinion', pricePerSqm: 5000 }), DEFAULT_ADJUSTMENTS, NOW);
    expect(deal.weight).toBeGreaterThan(opinion.weight * 2);
  });
});

describe('المصالحة', () => {
  const sample: PriceObservation[] = [
    obs({ id: 'a', track: 'field', kind: 'deal_registered', pricePerSqm: 4400, source: 'مكتب النرجس', reliability: 'high' }),
    obs({ id: 'b', track: 'field', kind: 'deal_registered', pricePerSqm: 4600, source: 'مكتب القمّة', reliability: 'high' }),
    obs({ id: 'c', track: 'field', kind: 'deal_reported', pricePerSqm: 4300, source: 'جولة ميدانية' }),
    obs({ id: 'd', track: 'app', kind: 'listing', pricePerSqm: 5400, source: 'تطبيق', listingAgeDays: 90 }),
    obs({ id: 'e', track: 'app', kind: 'listing', pricePerSqm: 5200, source: 'تطبيق', listingAgeDays: 30 }),
    obs({ id: 'f', track: 'official', kind: 'official_tariff', pricePerSqm: 3600, source: 'تقدير رسمي' }),
  ];

  const v = reconcile(subject, sample, { now: NOW });

  it('لا يُدخل المسار الرسمي في القيمة السوقية', () => {
    expect(v.perSqm.likely).toBeGreaterThan(v.tracks.official!.median);
    expect(v.tracks.official!.n).toBe(1);
  });

  it('يُخرج نطاقاً مرتّباً لا رقماً واحداً', () => {
    expect(v.perSqm.low).toBeLessThanOrEqual(v.perSqm.likely);
    expect(v.perSqm.likely).toBeLessThanOrEqual(v.perSqm.high);
    expect(v.quickSalePerSqm).toBe(v.perSqm.low);
    expect(v.patientPerSqm).toBe(v.perSqm.high);
  });

  it('يحسب الإجمالي بمساحة الأرض', () => {
    expect(v.totalValue.likely).toBeCloseTo(v.perSqm.likely * subject.areaSqm, 6);
  });

  it('يُنبّه إلى تضخّم المعروض في التطبيقات', () => {
    expect(v.gaps.appVsField).not.toBeNull();
    expect(v.gaps.appVsField!).toBeGreaterThan(0);
  });

  it('يُحذّر حين يعلو التقدير الرسمي السعر الميداني', () => {
    const inverted = reconcile(subject, [
      obs({ id: 'g', track: 'field', kind: 'deal_registered', pricePerSqm: 3000 }),
      obs({ id: 'h', track: 'official', kind: 'official_tariff', pricePerSqm: 4200 }),
    ], { now: NOW });
    expect(inverted.warnings.some((w) => w.includes('التقدير الرسمي أعلى'))).toBe(true);
  });

  it('يرفع الثقة بالعيّنة الموثّقة الحديثة ويخفضها بالضعيفة', () => {
    const strong = reconcile(subject, [
      ...Array.from({ length: 8 }, (_, i) => obs({
        id: `s${i}`, track: 'field', kind: 'deal_registered',
        pricePerSqm: 4400 + i * 25, reliability: 'high', observedAt: '2026-07-01',
      })),
      obs({ id: 'so', track: 'official', kind: 'official_tariff', pricePerSqm: 4000 }),
    ], { now: NOW });
    const weak = reconcile(subject, [
      obs({ id: 'w1', track: 'app', kind: 'opinion', pricePerSqm: 4000, observedAt: '2024-06-01' }),
    ], { now: NOW });
    expect(strong.confidence.score).toBeGreaterThan(weak.confidence.score);
    expect(strong.confidence.grade).toBe('high');
    expect(weak.confidence.grade).toBe('low');
  });

  it('لا يُصدر رقماً بلا مقارنة سوقية مقبولة', () => {
    const empty = reconcile(subject, [obs({ id: 'x', track: 'official', kind: 'official_tariff', pricePerSqm: 3600 })], { now: NOW });
    expect(empty.perSqm.likely).toBe(0);
    expect(empty.warnings.some((w) => w.includes('غير قابل للإصدار'))).toBe(true);
  });
});

describe('القيمة المتبقّية', () => {
  const r = residualLandValue(subject, DEFAULT_RESIDUAL);

  it('يبني المسطحات من معامل البناء والمساحة القابلة للبيع من الكفاءة', () => {
    expect(r.grossFloorAreaSqm).toBe(750 * 1.5);
    expect(r.saleableAreaSqm).toBeCloseTo(750 * 1.5 * 0.78, 6);
  });

  it('يوازن المعادلة: الإيراد = كل التكاليف + الربح + ميزانية الأرض', () => {
    const sum = r.constructionCost + r.softCosts + r.marketingCost + r.financeCost + r.targetProfit + r.landBudget;
    expect(sum).toBeCloseTo(r.revenue, 6);
  });

  it('يستبعد رسوم التملّك من ثمن الأرض نفسه', () => {
    expect(r.landValue).toBeCloseTo(r.landBudget / (1 + DEFAULT_RESIDUAL.acquisitionCostPct), 6);
  });

  it('يحقّق الهامش المستهدف تماماً عند الشراء بالسعر المتبقّي', () => {
    const at = profitAtLandPrice(subject, r.landValuePerSqm, DEFAULT_RESIDUAL);
    expect(at.marginOnRevenue).toBeCloseTo(DEFAULT_RESIDUAL.developerProfitPct, 6);
  });

  it('يقلّ السعر المحتمل كلما ارتفع الهامش المطلوب', () => {
    expect(maxLandPriceForMargin(subject, 0.25, DEFAULT_RESIDUAL))
      .toBeLessThan(maxLandPriceForMargin(subject, 0.15, DEFAULT_RESIDUAL));
  });

  it('يُعلن عدم الجدوى حين لا يحتمل المشروع أي ثمن للأرض', () => {
    const bad = residualLandValue(subject, { ...DEFAULT_RESIDUAL, constructionCostPerSqm: 4800 });
    expect(bad.feasible).toBe(false);
  });
});

describe('التكاليف والحيازة', () => {
  it('يوزّع الرسوم على الطرفين حسب الاتفاق', () => {
    const c = transactionCosts(1_000_000, DEFAULT_TRANSACTION_COSTS);
    expect(c.sellerTotal).toBeCloseTo(50_000, 6);        // تصرفات عقارية على البائع
    expect(c.buyerTotal).toBeCloseTo(25_000 + 5_000, 6); // سعي + رسوم مقطوعة
    expect(c.buyerAllIn).toBeCloseTo(1_030_000, 6);
    expect(c.sellerNet).toBeCloseTo(950_000, 6);
  });

  it('ينقل الضريبة إلى المشتري عند الاتفاق على ذلك', () => {
    const c = transactionCosts(1_000_000, { ...DEFAULT_TRANSACTION_COSTS, rettPaidBy: 'buyer' });
    expect(c.buyerAllIn).toBeCloseTo(1_080_000, 6);
  });

  it('يكشف أن نمو السعر وحده لا يعني ربحاً', () => {
    const h = holdingReturn(4500, 750, { years: 3, appreciation: 0.05, annualLevyPct: 0.025, annualUpkeep: 0, opportunityRate: 0.05 });
    expect(h.annualizedReturn!).toBeLessThan(0.05);
    expect(h.excessOverOpportunity!).toBeLessThan(0);
  });

  it('يحسب نمو التعادل بحيث يساوي العائد تكلفة الفرصة عنده', () => {
    const base = { years: 4, appreciation: 0.05, annualLevyPct: 0.01, annualUpkeep: 2000, opportunityRate: 0.06 };
    const be = holdingReturn(4500, 750, base).breakevenAppreciation;
    const at = holdingReturn(4500, 750, { ...base, appreciation: be });
    expect(at.annualizedReturn!).toBeCloseTo(base.opportunityRate, 3);
  });
});

describe('التحليل الكامل', () => {
  const sample: PriceObservation[] = [
    obs({ id: 'a', track: 'field', kind: 'deal_registered', pricePerSqm: 4400, reliability: 'high' }),
    obs({ id: 'b', track: 'field', kind: 'deal_registered', pricePerSqm: 4600, reliability: 'high' }),
    obs({ id: 'c', track: 'app', kind: 'listing', pricePerSqm: 5300, listingAgeDays: 60 }),
    obs({ id: 'd', track: 'official', kind: 'official_tariff', pricePerSqm: 3600 }),
  ];

  it('لا يتجاوز سقف المطوّر ما تحتمله القيمة المتبقّية', () => {
    const a = analyzeLand({ subject, observations: sample, lens: 'developer' });
    expect(a.recommendation.ceilingPerSqm).toBeLessThanOrEqual(a.residual.landValuePerSqm + 1e-6);
  });

  it('يجعل سقف المشتري عند أعلى النطاق العادل', () => {
    const a = analyzeLand({ subject, observations: sample, lens: 'buyer' });
    expect(a.recommendation.ceilingPerSqm).toBeCloseTo(a.valuation.perSqm.high, 6);
  });

  it('يذكر للمستثمر نمو التعادل صراحةً', () => {
    const a = analyzeLand({ subject, observations: sample, lens: 'investor' });
    expect(a.recommendation.reasons.some((r) => r.includes('التعادل'))).toBe(true);
  });

  it('يُصرّح في العنوان بالفرق بين ما يطلبه السوق وما يحتمله المشروع', () => {
    const a = analyzeLand({
      subject, observations: sample, lens: 'developer',
      residual: { ...DEFAULT_RESIDUAL, constructionCostPerSqm: 2700, sellPricePerSqm: 5500 },
    });
    expect(a.recommendation.headline).toContain('لا يحتمل فوق');
  });

  it('يُنبّه حين يطلب السوق أكثر مما يحتمله المشروع', () => {
    const a = analyzeLand({
      subject, observations: sample, lens: 'developer',
      residual: { ...DEFAULT_RESIDUAL, constructionCostPerSqm: 2700, sellPricePerSqm: 5500 },
    });
    expect(a.recommendation.reasons.some((r) => r.includes('السوق يطلب أكثر'))).toBe(true);
  });
});

describe('الاتجاه والسيولة', () => {
  it('يحسب النمو المركّب عبر السلسلة', () => {
    const t = analyzeTrend([
      { year: 2023, pricePerSqm: 4000 },
      { year: 2026, pricePerSqm: 4630 },
    ]);
    expect(t.cagr!).toBeCloseTo(0.05, 2);
    expect(t.direction).toBe('rising');
    expect(t.project(2)!).toBeCloseTo(4630 * 1.05 ** 2, 0);
  });

  it('لا يرسم اتجاهاً من نقطة واحدة', () => {
    const t = analyzeTrend([{ year: 2026, pricePerSqm: 4000 }]);
    expect(t.cagr).toBeNull();
    expect(t.direction).toBe('unknown');
    expect(t.project(3)).toBeNull();
  });

  it('لا يُخفي انعكاس السنة الأخيرة خلف الاتجاه العام', () => {
    const t = analyzeTrend([
      { year: 2022, pricePerSqm: 3000 },
      { year: 2023, pricePerSqm: 3800 },
      { year: 2024, pricePerSqm: 4600 },
      { year: 2025, pricePerSqm: 4300 },
    ]);
    expect(t.direction).toBe('rising');
    expect(t.lastYearChange!).toBeLessThan(0);
    expect(t.note).toContain('آخر سنة هابطة');
  });

  it('يكشف الاتجاه الهابط', () => {
    const t = analyzeTrend([
      { year: 2024, pricePerSqm: 5000 },
      { year: 2026, pricePerSqm: 4200 },
    ]);
    expect(t.direction).toBe('falling');
  });

  it('يعدّ السوق راكداً بلا صفقات', () => {
    const l = analyzeLiquidity({ dealsLastSixMonths: 0, avgDaysOnMarket: 200, activeListings: 40 });
    expect(l.grade).toBe('frozen');
    expect(l.monthsOfSupply).toBeNull();
  });

  it('يحسب شهور التصريف من المعروض ومعدّل البيع', () => {
    const l = analyzeLiquidity({ dealsLastSixMonths: 12, avgDaysOnMarket: 60, activeListings: 10 });
    expect(l.monthsOfSupply).toBeCloseTo(5, 6);
    expect(l.grade).toBe('liquid');
  });
});

describe('ورقة التفاوض', () => {
  const input = { basePricePerSqm: 4500, areaSqm: 750, discountRate: 0.08, deferMonths: 12, downPaymentPct: 0.3, cashDiscountPct: 0.05 };

  it('يجعل القيمة الحالية للعروض واحدة ورقمها المعلن مختلفاً', () => {
    const { offers, presentValue } = equivalentOffers(input);
    expect(offers).toHaveLength(2);
    for (const o of offers) expect(o.presentValue).toBeCloseTo(presentValue, 6);
    expect(offers[1]!.headlinePrice).toBeGreaterThan(offers[0]!.headlinePrice);
  });

  it('يتحقّق يدوياً من تكافؤ العرض المؤجّل', () => {
    const { offers } = equivalentOffers(input);
    const deferred = offers.find((o) => o.key === 'deferred')!;
    const pv = deferred.headlinePrice * 0.3 + (deferred.headlinePrice * 0.7) / 1.08;
    expect(pv).toBeCloseTo(deferred.presentValue, 4);
  });

  it('يضيف الشراكة حين يحتمل المشروع الثمن، بحصة من ربحه', () => {
    const { offers } = equivalentOffers({ ...input, basePricePerSqm: 1500 }, subject, DEFAULT_RESIDUAL);
    const p = offers.find((o) => o.key === 'partnership');
    expect(p).toBeDefined();
    expect(p!.terms[0]).toMatch(/حصة \d+٪/);
  });

  it('لا يعرض شراكة حين يبتلع ثمن الأرض ربح المشروع كلّه', () => {
    // حصة تتجاوز ١٠٠٪ ليست عرضاً بل مشروعاً خاسراً
    const { offers } = equivalentOffers(input, subject, DEFAULT_RESIDUAL);
    expect(offers.find((o) => o.key === 'partnership')).toBeUndefined();
  });

  it('لا يُصدر عروضاً بلا سعر أساس', () => {
    expect(equivalentOffers({ ...input, basePricePerSqm: 0 }).offers).toHaveLength(0);
  });

  it('يرتّب سيناريوهات الاستخدام بالقيمة التي تُعطيها للأرض', () => {
    const ranked = bestUse(subject, [
      { label: 'سكني عادي', far: 1.5, sellPricePerSqm: 6500, constructionCostPerSqm: 2200 },
      { label: 'سكني استثماري', far: 2.4, sellPricePerSqm: 6200, constructionCostPerSqm: 2400 },
    ], DEFAULT_RESIDUAL);
    expect(ranked[0]!.landValuePerSqm).toBeGreaterThanOrEqual(ranked[1]!.landValuePerSqm);
    expect(ranked[0]!.label).toBe('سكني استثماري');
  });
});

describe('السجلّ النظامي', () => {
  it('يبدأ بلا تحقّق فيكون الخطر جزئياً لا كاملاً', () => {
    const r = scoreLandLegal(UNKNOWN_LAND_LEGAL);
    expect(r.score).toBe(60);
    expect(r.band).toBe('serious');
    expect(r.blockers).toHaveLength(0);
    expect(r.headline).toContain('لم يُتحقَّق');
  });

  it('يميّز «لا» عن «لا أعرف» في البند القاتل', () => {
    const answered = { ...UNKNOWN_LAND_LEGAL, notMortgaged: 'no' as const };
    const r = scoreLandLegal(answered);
    expect(r.band).toBe('blocking');
    expect(r.blockers.map((b) => b.id)).toEqual(['notMortgaged']);
    expect(scoreLandLegal(UNKNOWN_LAND_LEGAL).band).not.toBe('blocking');
  });

  it('يُصفّي الخطر حين تُتحقَّق البنود كلها', () => {
    const allYes = Object.fromEntries(
      Object.keys(UNKNOWN_LAND_LEGAL).map((k) => [k, 'yes']),
    ) as typeof UNKNOWN_LAND_LEGAL;
    const r = scoreLandLegal(allYes);
    expect(r.score).toBe(0);
    expect(r.band).toBe('clear');
    expect(r.unverified).toHaveLength(0);
  });

  it('لا يُسقط الصفقة ببند غير قاتل أُجيب بـلا', () => {
    const r = scoreLandLegal({ ...UNKNOWN_LAND_LEGAL, noUnpaidDues: 'no' });
    expect(r.blockers).toHaveLength(0);
    expect(r.band).not.toBe('blocking');
  });

  it('يُقدّم المانع النظامي على السعر في التحليل الكامل', () => {
    const a = analyzeLand({
      subject,
      observations: [obs({ id: 'z', track: 'field', kind: 'deal_registered', pricePerSqm: 4500 })],
      lens: 'buyer',
      legal: { ...UNKNOWN_LAND_LEGAL, accessRoad: 'no' },
    });
    expect(a.recommendation.headline).toContain('مانع نظامي');
    expect(a.recommendation.reasons[0]).toContain('الطريق النافذ');
  });
});

describe('حساسية قيمة الأرض', () => {
  const s = landSensitivity(subject, DEFAULT_RESIDUAL);

  it('يرتّب المتغيّرات بقوة أثرها', () => {
    for (let i = 1; i < s.items.length; i++) {
      expect(s.items[i - 1]!.swing).toBeGreaterThanOrEqual(s.items[i]!.swing);
    }
  });

  it('يجعل سعر البيع أقوى من التكاليف غير المباشرة', () => {
    const keys = s.items.map((i) => i.key);
    expect(keys.indexOf('sellPrice')).toBeLessThan(keys.indexOf('softCosts'));
  });

  it('يقيس الأثر على القيمة المتبقّية لا على الربح', () => {
    expect(s.base).toBeCloseTo(residualLandValue(subject, DEFAULT_RESIDUAL).landValuePerSqm, 6);
    const sell = s.items.find((i) => i.key === 'sellPrice')!;
    expect(sell.highValue).toBeGreaterThan(sell.lowValue);
  });

  it('يُخرج جملة تدلّ على موضع التحقّق', () => {
    expect(sensitivityHeadline(s)).toContain('العامل الأخطر');
  });
});

describe('مقارنة الفرص', () => {
  const entry = (over: Partial<Parameters<typeof compareOpportunities>[0][number]>) => ({
    id: 'x', label: 'فرصة', subject: { city: 'الرياض', district: 'النرجس', areaSqm: 750, far: 1.5 },
    marketPerSqm: 4000, residualPerSqm: 4400, landCostPerSaleableSqm: 3800,
    confidenceScore: 70, legalScore: 10, hasBlocker: false, ...over,
  });

  it('يرتّب بالفائض عن السوق', () => {
    const rows = compareOpportunities([
      entry({ id: 'a', label: 'أ', residualPerSqm: 4200 }),
      entry({ id: 'b', label: 'ب', residualPerSqm: 5000 }),
    ]);
    expect(rows[0]!.id).toBe('b');
    expect(rows[0]!.headroom).toBeCloseTo(0.25, 6);
  });

  it('يُنزل صاحب المانع النظامي إلى آخر القائمة مهما كان فائضه', () => {
    const rows = compareOpportunities([
      entry({ id: 'blocked', residualPerSqm: 9000, hasBlocker: true }),
      entry({ id: 'clean', residualPerSqm: 4100 }),
    ]);
    expect(rows[0]!.id).toBe('clean');
    expect(rows[1]!.verdict).toContain('مانع نظامي');
  });

  it('يصف الفائض الضيّق بما هو', () => {
    const rows = compareOpportunities([entry({ residualPerSqm: 4100 })]);
    expect(rows[0]!.verdict).toContain('ضيّق');
  });

  it('يُلحق تحفّظ الثقة المنخفضة بالحكم', () => {
    const rows = compareOpportunities([entry({ confidenceScore: 30 })]);
    expect(rows[0]!.verdict).toContain('ثقة التقييم منخفضة');
  });
});
