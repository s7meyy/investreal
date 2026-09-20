import { describe, expect, it } from 'vitest';
import { referenceCase } from './fixtures.js';
import { analyze } from '../src/analyze.js';
import { buildCashflow, peakExposure } from '../src/index.js';

describe('رأس المال = ذروة الانكشاف لا مجموع الأشهر السالبة', () => {
  it('الدفع المقدّم: رأس المال هو ما خرج في الشهر صفر', () => {
    const m = analyze(referenceCase()).metrics;
    expect(m.capitalInvested).toBe(140000); // ١٢٠ ألف إيجار + ٢٠ ألف تجهيز
  });

  it('تكلفة إعادة الحال الختامية لا تُضاف إلى رأس المال', () => {
    // تقع بعد استرداد رأس المال، فليست مالاً معرّضاً للخطر في البداية.
    const rows = buildCashflow(referenceCase());
    expect(rows.at(-1)!.net).toBeLessThan(0);
    expect(peakExposure(rows)).toBe(140000);
  });

  it('الدفع السنوي: رأس المال أقل كثيراً من مجموع الأشهر السالبة', () => {
    const o = referenceCase();
    o.deal.payment = { kind: 'annual' };
    const rows = buildCashflow(o);
    const sumOfNegatives = rows.reduce((s, r) => s + Math.max(0, -r.net), 0);
    const peak = peakExposure(rows);

    expect(peak).toBeLessThan(sumOfNegatives / 3);
    // أقساط سنوية ١٢ ألفاً + تجهيز ٢٠ ألفاً: الانكشاف لا يتجاوز هذا بكثير.
    expect(peak).toBeGreaterThan(20000);
    expect(peak).toBeLessThan(40000);
  });

  it('ذروة الانكشاف تساوي أعمق نقطة في التدفق التراكمي', () => {
    const annual = analyze(referenceCase()).annual;
    const deepest = Math.min(...annual.map((a) => a.cumulative));
    expect(analyze(referenceCase()).metrics.capitalInvested).toBeCloseTo(-deepest, 6);
  });
});

describe('التدفق النقدي ليس ربحاً', () => {
  const m = analyze(referenceCase()).metrics;

  it('يفصل استرداد رأس المال عن الربح', () => {
    expect(m.avgAnnualCapitalReturn).toBeCloseTo(m.capitalInvested / 10, 6);
    expect(m.avgAnnualProfit).toBeCloseTo(m.totalNet / 10, 6);
  });

  it('نسبة التدفق أعلى من نسبة الربح الحقيقية بفارق كبير', () => {
    // ‏هذا هو الخلط الذي كان يُظهر العائد ضعف حقيقته تقريباً.
    expect(m.cashOnCash).toBeGreaterThan(m.annualProfitRate * 1.8);
    expect(m.annualProfitRate).toBeCloseTo(m.totalNet / m.capitalInvested / 10, 9);
  });
});

describe('مكرر الأرباح', () => {
  it('لا يُعرض لصفقة خاسرة', () => {
    const o = referenceCase();
    o.deal.contractRentAnnual = 35000;
    const r = analyze(o);
    expect(r.metrics.totalNet).toBeLessThan(0);
    expect(r.metrics.earningsMultiple).toBeNull();
    expect(r.syndication.investorEarningsMultiple).toBeNull();
  });

  it('يُعرض لصفقة رابحة', () => {
    expect(analyze(referenceCase()).metrics.earningsMultiple).toBeGreaterThan(0);
  });
});

describe('تحذير الإيجار المقلوب', () => {
  it('يُنبَّه حين يتجاوز التعاقدي إيجار السوق', () => {
    const o = referenceCase();
    o.deal.contractRentAnnual = 35000;
    expect(analyze(o).warnings.some((w) => w.includes('ليست فرصة استثمارية'))).toBe(true);
  });

  it('يُنبَّه حين يتساويان', () => {
    const o = referenceCase();
    o.deal.contractRentAnnual = 30000;
    expect(analyze(o).warnings.some((w) => w.includes('لا يوجد فرق تربح منه'))).toBe(true);
  });

  it('لا يُنبَّه في الحالة الطبيعية', () => {
    expect(analyze(referenceCase()).warnings.some((w) => w.includes('لا يوجد فرق'))).toBe(false);
  });
});

describe('موثوقية العائد الداخلي', () => {
  it('تكلفة ختامية وحيدة لا تجعل العائد غير موثوق', () => {
    // ‏كانت تُظهر تنبيه «تعدّد الجذور» في أبسط حالة فتُربك المستثمر.
    const r = analyze(referenceCase());
    expect(r.metrics.irrReliable).toBe(true);
  });

  it('تعدّد حقيقي داخل المدة يُسقط الموثوقية', () => {
    const o = referenceCase();
    o.deal.payment = { kind: 'annual' };
    expect(analyze(o).metrics.irrReliable).toBe(false);
  });

  it('MIRR يفترض إعادة استثمار بتكلفة الفرصة لا بمعدل متحفّظ', () => {
    const o = referenceCase();
    o.finance.discountRate = 0.12;
    const m = analyze(o).metrics;
    // ‏عند تساوي المعدلين لا يكون MIRR أدنى بقدر مصطنع من العائد الداخلي.
    expect(m.mirr!).toBeGreaterThan(m.irr! - 0.03);
  });
});

describe('تسمية البنود', () => {
  it('بند الوقف يُصاغ سؤالاً لا إثباتاً', () => {
    const o = referenceCase();
    o.legal.notWaqf = 'unknown';
    const titles = analyze(o).risk.unverifiedBlockers;
    expect(titles).toContain('خلوّ العقار من الوقف');
    expect(titles).not.toContain('العقار ليس وقفاً');
  });
});

describe('تطابق التفكيك', () => {
  it('التدفق السنوي = استرداد رأس المال + صافي الربح، بلا فارق', () => {
    for (const rent of [6000, 12000, 18000]) {
      const o = referenceCase();
      o.deal.contractRentAnnual = rent;
      const m = analyze(o).metrics;
      expect(m.avgAnnualCapitalReturn + m.avgAnnualProfit).toBeCloseTo(m.avgAnnualDistribution, 6);
    }
  });

  it('نسبة التدفق = نسبة الاسترداد + نسبة الربح', () => {
    const m = analyze(referenceCase()).metrics;
    expect(m.cashOnCash).toBeCloseTo(1 / 10 + m.annualProfitRate, 9);
  });

  it('يبقى متطابقاً مع تجزئة الأسهم وحصة المشغّل', () => {
    const o = referenceCase();
    o.syndication = { shares: 4, operatorShare: 0.15, capitalFirst: true };
    const r = analyze(o);
    const s = r.syndication;
    expect(s.annualPerShare).toBeCloseTo(
      s.capitalPerShare / 10 + s.shareAnnualProfit, 6,
    );
  });
});
