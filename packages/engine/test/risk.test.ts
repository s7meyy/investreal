import { describe, expect, it } from 'vitest';
import { referenceCase } from './fixtures.js';
import { analyze } from '../src/analyze.js';
import { UNKNOWN_LEGAL } from '../src/defaults.js';

describe('درجة المخاطرة', () => {
  it('«غير معروف» يُحسب كخطر لا كحياد', () => {
    const o = referenceCase();
    o.legal = { ...UNKNOWN_LEGAL };
    const unknown = analyze(o).risk;
    expect(unknown.score).toBeGreaterThan(analyze(referenceCase()).risk.score);
    expect(unknown.band).toBe('high');
  });

  it('الجهل مخاطرة مرتفعة، أما «لا» على كل شيء فمخاطرة حرجة', () => {
    const unknownCase = referenceCase();
    unknownCase.legal = { ...UNKNOWN_LEGAL };

    const noCase = referenceCase();
    noCase.legal = Object.fromEntries(
      Object.keys(UNKNOWN_LEGAL).map((k) => [k, 'no']),
    ) as typeof noCase.legal;

    const unknownRisk = analyze(unknownCase).risk;
    const noRisk = analyze(noCase).risk;
    expect(unknownRisk.score).toBeLessThan(noRisk.score);
    expect(noRisk.band).toBe('critical');
    // مَن لم يُجب شيئاً بعد لا تُرفض فرصته لمجرّد جهله بها.
    expect(analyze(unknownCase).verdict.grade).not.toBe('rejected');
  });

  it('غياب حق التأجير من الباطن بند قاتل', () => {
    const o = referenceCase();
    o.legal.subleaseExplicit = 'no';
    const r = analyze(o);
    expect(r.risk.blockers).toContain('حق التأجير من الباطن');
    expect(r.verdict.grade).toBe('rejected');
  });

  it('«لا أعرف» في بند قاتل لا يرفض الفرصة بل يمنع ترقيتها', () => {
    const o = referenceCase();
    o.deal.contractRentAnnual = 6000; // عائد يستحق «ممتازة» لولا التحفّظ
    o.legal.subleaseExplicit = 'unknown';
    const r = analyze(o);
    expect(r.risk.blockers).toHaveLength(0);
    expect(r.risk.unverifiedBlockers).toContain('حق التأجير من الباطن');
    expect(r.verdict.grade).toBe('marginal');
    expect(r.verdict.reason).toContain('لم يُحسم بعد');
  });

  it('التحقّق من البند يرفع السقف فوراً', () => {
    const o = referenceCase();
    o.deal.contractRentAnnual = 6000;
    o.legal.subleaseExplicit = 'unknown';
    expect(analyze(o).verdict.grade).toBe('marginal');
    o.legal.subleaseExplicit = 'yes';
    expect(analyze(o).verdict.grade).toBe('excellent');
  });

  it('البند القاتل المؤكّد يُسقط الفرصة مهما كان العائد مرتفعاً', () => {
    const o = referenceCase();
    o.deal.contractRentAnnual = 3000; // عائد خيالي
    o.legal.ownershipClear = 'no';
    expect(analyze(o).verdict.grade).toBe('rejected');
  });

  it('الدرجة تبقى ضمن ٠–١٠٠', () => {
    const worst = referenceCase();
    worst.legal = Object.fromEntries(Object.keys(UNKNOWN_LEGAL).map((k) => [k, 'no'])) as typeof worst.legal;
    worst.deal.termYears = 30;
    worst.finance.totalLiquidity = 100000;
    const s = analyze(worst).risk.score;
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});

describe('الحكم النهائي', () => {
  it('الرفض بسبب المخاطرة يُفسَّر بالمخاطرة لا بالعائد', () => {
    const o = referenceCase();
    o.deal.contractRentAnnual = 6000; // عائد مرتفع
    o.legal = Object.fromEntries(
      // البنود القاتلة لم يُتحقَّق منها (فلا تُفعّل مسار التجاوز)، وكل ما عداها
      // سيّئ. الرفض هنا يأتي من تراكم المخاطر، فيجب أن يُفسَّر بذلك لا بالعائد.
      Object.keys(UNKNOWN_LEGAL).map((k) => [
        k,
        ['subleaseExplicit', 'ownershipClear', 'notWaqf'].includes(k) ? 'unknown' : 'no',
      ]),
    ) as typeof o.legal;
    const v = analyze(o).verdict;
    expect(v.grade).toBe('rejected');
    expect(v.reason).toContain('حرجة');
    expect(v.reason).toContain('أثقل ما عليك');
  });

  it('عائد دون تكلفة الفرصة يعطي حكماً ضعيفاً لا جيداً', () => {
    const o = referenceCase();
    o.finance.discountRate = 0.25;
    const v = analyze(o).verdict;
    expect(['weak', 'rejected']).toContain(v.grade);
  });

  it('صفقة رخيصة بمخاطرة منخفضة تُصنَّف ممتازة', () => {
    const o = referenceCase();
    o.deal.contractRentAnnual = 6000;
    o.legal.earlyTerminationCompensation = 'yes';
    o.legal.renewalOption = 'yes';
    o.legal.purchaseOption = 'yes';
    const r = analyze(o);
    expect(r.risk.band).toBe('low');
    expect(r.verdict.grade).toBe('excellent');
  });
});

describe('التوصيات', () => {
  it('تُقترح فترة سماح حين لا توجد، بأثر موجب مقيس', () => {
    const rec = analyze(referenceCase()).recommendations.find((r) => r.id === 'grace');
    expect(rec).toBeDefined();
    expect(rec!.irrDelta!).toBeGreaterThan(0);
  });

  it('البنود القاتلة تتصدّر التوصيات', () => {
    const o = referenceCase();
    o.legal.notWaqf = 'no';
    expect(analyze(o).recommendations[0]!.id).toContain('blocker');
  });

  it('يُنبَّه على الفرق المريب عن السوق', () => {
    expect(analyze(referenceCase()).recommendations.some((r) => r.id === 'suspicious_gap')).toBe(true);
  });
});

describe('قواعد الصحّة', () => {
  it('تُحذّر من إشغال متفائل', () => {
    const o = referenceCase();
    o.revenue.occupancy = 0.99;
    expect(analyze(o).warnings.some((w) => w.includes('متفائل'))).toBe(true);
  });

  it('تُنبّه على أثر التقويم الهجري', () => {
    const o = referenceCase();
    o.deal.calendar = 'hijri';
    expect(analyze(o).warnings.some((w) => w.includes('الهجري'))).toBe(true);
  });
});
