import { describe, expect, it } from 'vitest';
import { referenceCase } from './fixtures.js';
import { analyze } from '../src/analyze.js';
import { computeMetrics } from '../src/metrics.js';
import { maxContractRentFor } from '../src/solver.js';
import { buildCashflow, paymentSchedule, toAnnual } from '../src/cashflow.js';

describe('الحالة المرجعية: ٣٠ مقابل ١٢ لعشر سنوات', () => {
  const result = analyze(referenceCase());

  it('يدفع ١٢٠ ألف مقدّماً في الشهر صفر', () => {
    expect(paymentSchedule(referenceCase()).get(0)).toBe(120000);
    expect(result.periods[0]!.net).toBe(-140000);
  });

  it('يُنتج ١٢٠ شهراً + شهر التأسيس', () => {
    expect(result.periods).toHaveLength(121);
    expect(result.annual).toHaveLength(11);
  });

  it('الربح الإجمالي هو مجموع التدفقات، والتراكمي يطابقه', () => {
    const sum = result.periods.reduce((s, p) => s + p.net, 0);
    expect(result.metrics.totalNet).toBeCloseTo(sum, 6);
    expect(result.annual.at(-1)!.cumulative).toBeCloseTo(sum, 6);
  });

  it('العائد الداخلي حدّي لا ذهبي — وهذه الرسالة الأساسية للمنصّة', () => {
    // ‏«٢٠٠٪ ربح» ظاهرياً، والحقيقة عائد قريب من تكلفة الفرصة البديلة.
    expect(result.metrics.irr!).toBeGreaterThan(0.12);
    expect(result.metrics.irr!).toBeLessThan(0.17);
    expect(result.metrics.roi).toBeGreaterThan(0.8);
  });

  it('صافي القيمة الحالية يتّسق مع موقع العائد من معدل الخصم', () => {
    const { irr, npv } = result.metrics;
    expect(Math.sign(npv)).toBe(Math.sign(irr! - 0.12));
  });

  it('يحسب خصم الصفقة عن السوق بدقة', () => {
    expect(result.metrics.discountToMarket).toBeCloseTo(0.6, 9);
  });

  it('السيناريو المتشائم أسوأ من الأساسي وهو أسوأ من المتفائل', () => {
    const { pessimistic, base, optimistic } = result.scenarios;
    expect(pessimistic.irr!).toBeLessThan(base.irr!);
    expect(base.irr!).toBeLessThan(optimistic.irr!);
  });

  it('إيجار السوق هو المتغيّر الأقوى أثراً', () => {
    expect(result.sensitivity[0]!.variable).toBe('marketRent');
  });
});

describe('الحسبة العكسية (السقف التفاوضي)', () => {
  it('السقف المحسوب يُنتج فعلاً العائد المستهدف', () => {
    const o = referenceCase();
    for (const target of [0.10, 0.15, 0.20]) {
      const rent = maxContractRentFor(o, target)!;
      const at = computeMetrics({ ...o, deal: { ...o.deal, contractRentAnnual: rent } });
      expect(at.irr!).toBeCloseTo(target, 4);
    }
  });

  it('كلما ارتفع العائد المستهدف انخفض السقف', () => {
    const o = referenceCase();
    const ceilings = analyze(o).ceilings;
    for (let i = 1; i < ceilings.length; i++) {
      expect(ceilings[i]!.maxContractRentAnnual).toBeLessThan(ceilings[i - 1]!.maxContractRentAnnual);
    }
  });

  it('إجمالي السقف = الإيجار السنوي × المدة عند الدفع الكامل', () => {
    const c = analyze(referenceCase()).ceilings[0]!;
    expect(c.maxUpfrontTotal).toBeCloseTo(c.maxContractRentAnnual * 10, 6);
  });
});

describe('نقاط التعادل', () => {
  const m = analyze(referenceCase()).metrics;

  it('إشغال التعادل بين صفر وواحد وأقل من الإشغال المفترض', () => {
    expect(m.breakevenOccupancy!).toBeGreaterThan(0);
    expect(m.breakevenOccupancy!).toBeLessThan(0.92);
  });

  it('إيجار سوق التعادل أقل من إيجار السوق المفترض', () => {
    expect(m.breakevenMarketRent!).toBeLessThan(30000);
  });

  it('عند إشغال التعادل يصير الربح صفراً', () => {
    const o = referenceCase();
    o.revenue.occupancy = m.breakevenOccupancy!;
    o.revenue.firstYearOccupancy = m.breakevenOccupancy!;
    const total = buildCashflow(o).reduce((s, r) => s + r.net, 0);
    expect(total).toBeCloseTo(0, 2);
  });
});

describe('التقويم المزدوج', () => {
  it('العقد الهجري يعطي عائداً أقل لنفس عدد السنوات', () => {
    // ‏السنة الهجرية أقصر ١١ يوماً، فالمستثمر يشتري وقتاً أقل بنفس المبلغ.
    const greg = computeMetrics(referenceCase()).irr!;
    const o = referenceCase();
    o.deal.calendar = 'hijri';
    expect(computeMetrics(o).irr!).toBeLessThan(greg);
  });

  it('مدة العقد الهجري أقصر بنحو ٣٪ من الميلادي بالزمن الحقيقي', () => {
    const o = referenceCase();
    o.deal.calendar = 'hijri';
    const hijriSpan = buildCashflow(o).at(-1)!.elapsedSolarYears;
    const gregSpan = buildCashflow(referenceCase()).at(-1)!.elapsedSolarYears;
    expect(hijriSpan / gregSpan).toBeCloseTo(354.36707 / 365.2425, 5);
  });

  it('الفارق يتراكم إلى نحو سنة كاملة على مدى ٣٠ سنة', () => {
    const o = referenceCase();
    o.deal.calendar = 'hijri';
    o.deal.termYears = 30;
    const greg = referenceCase();
    greg.deal.termYears = 30;
    const gap = buildCashflow(greg).at(-1)!.elapsedSolarYears - buildCashflow(o).at(-1)!.elapsedSolarYears;
    expect(gap).toBeGreaterThan(0.85);
    expect(gap).toBeLessThan(1.0);
  });
});

describe('حالات حدّية', () => {
  it('الإيجار التعاقدي = السوقي يعني خسارة مؤكّدة', () => {
    const o = referenceCase();
    o.deal.contractRentAnnual = 30000;
    expect(computeMetrics(o).totalNet).toBeLessThan(0);
  });

  it('إشغال صفر يعني خسارة كل رأس المال والتشغيل', () => {
    const o = referenceCase();
    o.revenue.occupancy = 0;
    o.revenue.firstYearOccupancy = 0;
    const m = computeMetrics(o);
    expect(m.totalNet).toBeLessThan(-140000);
    expect(m.irr).toBeNull();
  });

  it('مدة سنة واحدة لا تكسر الحساب', () => {
    const o = referenceCase();
    o.deal.termYears = 1;
    const m = computeMetrics(o);
    expect(Number.isFinite(m.totalNet)).toBe(true);
    expect(buildCashflow(o)).toHaveLength(13);
  });

  it('فترة السماح حيازة إضافية بنفس المبلغ، فترفع العائد', () => {
    const o = referenceCase();
    o.deal.graceMonths = 6;
    const rows = buildCashflow(o);
    // ‏ستة أشهر فوق ١٢٠ شهراً، والمدفوع للمالك لم يتغيّر.
    expect(rows).toHaveLength(127);
    expect(rows[0]!.net).toBe(-140000);
    expect(computeMetrics(o).irr!).toBeGreaterThan(computeMetrics(referenceCase()).irr!);
  });

  it('السماح في الدفع السنوي يؤجّل أول قسط أيضاً', () => {
    const o = referenceCase();
    o.deal.payment = { kind: 'annual' };
    o.deal.graceMonths = 6;
    const schedule = paymentSchedule(o);
    expect(schedule.get(0)).toBeUndefined();
    expect(schedule.get(6)).toBe(12000);
  });

  it('تجزئة الدفع ترفع العائد رغم ثبات الإجمالي', () => {
    const o = referenceCase();
    o.deal.payment = { kind: 'custom', items: [{ month: 0, amount: 60000 }, { month: 24, amount: 60000 }] };
    expect(computeMetrics(o).irr!).toBeGreaterThan(computeMetrics(referenceCase()).irr!);
  });
});

describe('التجميع السنوي', () => {
  it('لا يفقد ريالاً واحداً من الجدول الشهري', () => {
    const rows = buildCashflow(referenceCase());
    const monthly = rows.reduce((s, r) => s + r.net, 0);
    const annual = toAnnual(rows).reduce((s, r) => s + r.net, 0);
    expect(annual).toBeCloseTo(monthly, 6);
  });
});
