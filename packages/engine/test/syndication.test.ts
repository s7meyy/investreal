import { describe, expect, it } from 'vitest';
import { referenceCase } from './fixtures.js';
import { analyze } from '../src/analyze.js';
import { projectReinvestment } from '../src/syndication.js';

describe('تجزئة الفرصة على أسهم', () => {
  it('المستثمر الواحد بلا مشغّل يأخذ كل شيء', () => {
    const r = analyze(referenceCase());
    expect(r.syndication.shares).toBe(1);
    expect(r.syndication.operatorTotalNet).toBe(0);
    expect(r.syndication.investorsTotalNet).toBeCloseTo(r.metrics.totalNet, 6);
    expect(r.syndication.investorIrr).toBeCloseTo(r.metrics.irr!, 6);
  });

  it('تقسيم الفرصة لا يغيّر العائد، بل يغيّر حجم التذكرة', () => {
    const o = referenceCase();
    o.syndication.shares = 3;
    const r = analyze(o);
    expect(r.syndication.capitalPerShare).toBeCloseTo(r.metrics.capitalInvested / 3, 6);
    expect(r.syndication.totalPerShare).toBeCloseTo(r.metrics.totalNet / 3, 6);
    // النِّسَب لا تتأثّر بالتجزئة — وهذه نقطة يجب أن يفهمها المستثمر.
    expect(r.syndication.shareAnnualReturn).toBeCloseTo(analyze(referenceCase()).syndication.shareAnnualReturn, 9);
  });

  it('حصة المشغّل تُنقص عائد المستثمر فعلاً', () => {
    const solo = analyze(referenceCase());
    const o = referenceCase();
    o.syndication.operatorShare = 0.15;
    const managed = analyze(o);

    expect(managed.syndication.operatorTotalNet).toBeGreaterThan(0);
    expect(managed.syndication.investorsTotalNet).toBeLessThan(solo.metrics.totalNet);
    expect(managed.syndication.investorIrr!).toBeLessThan(solo.metrics.irr!);
    // عائد الفرصة يبقى كما هو — والفرق بينهما هو ما يجب ألا يُخلط.
    expect(managed.metrics.irr!).toBeCloseTo(solo.metrics.irr!, 9);
  });

  it('المشغّل لا يشارك في رأس المال ولا في الخسارة', () => {
    const o = referenceCase();
    o.syndication.operatorShare = 0.15;
    const r = analyze(o);
    const founding = r.periods[0]!;
    expect(founding.net).toBe(-140000); // لم تُقتطع منه حصة
    expect(r.syndication.operatorTotalNet).toBeGreaterThan(0);
  });
});

describe('مكرر الأرباح', () => {
  it('يساوي رأس المال ÷ متوسط التوزيع السنوي', () => {
    const r = analyze(referenceCase());
    expect(r.metrics.earningsMultiple!).toBeCloseTo(
      r.metrics.capitalInvested / r.metrics.avgAnnualDistribution, 6,
    );
  });

  it('ينخفض كلما رخصت الصفقة', () => {
    const cheap = referenceCase();
    cheap.deal.contractRentAnnual = 6000;
    expect(analyze(cheap).metrics.earningsMultiple!).toBeLessThan(
      analyze(referenceCase()).metrics.earningsMultiple!,
    );
  });
});

describe('العائد البسيط والتكلفة الشهرية', () => {
  it('التكلفة الشهرية = الإيجار التعاقدي ÷ ١٢', () => {
    expect(analyze(referenceCase()).metrics.monthlyContractCost).toBe(1000);
  });

  it('العائد السنوي البسيط = الإجمالي ÷ المدة', () => {
    const m = analyze(referenceCase()).metrics;
    expect(m.simpleAnnualReturn).toBeCloseTo(m.totalReturnRate / 10, 9);
  });
});

describe('إعادة الاستثمار المركّب', () => {
  it('يطابق الحل المغلق للتركيب', () => {
    const rows = projectReinvestment(100000, 0.2, 5);
    expect(rows).toHaveLength(5);
    expect(rows.at(-1)!.closing).toBeCloseTo(100000 * 1.2 ** 5, 6);
    expect(rows[0]!.gain).toBeCloseTo(20000, 6);
  });

  it('كل سنة تفتح بما أغلقت به سابقتها', () => {
    const rows = projectReinvestment(50000, 0.1, 4);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i]!.opening).toBeCloseTo(rows[i - 1]!.closing, 9);
    }
  });

  it('لا يُعرض جدول لفرصة خاسرة', () => {
    const o = referenceCase();
    o.deal.contractRentAnnual = 30000;
    expect(analyze(o).reinvestment).toHaveLength(0);
  });
});

describe('العائد النقدي السنوي', () => {
  it('يساوي التوزيع السنوي ÷ رأس المال، لا صافي الربح ÷ المدة', () => {
    const r = analyze(referenceCase());
    expect(r.metrics.cashOnCash).toBeCloseTo(
      r.metrics.avgAnnualDistribution / r.metrics.capitalInvested, 9,
    );
    // المقياسان مختلفان: النقدي يتجاهل استرداد رأس المال والعائد البسيط يخلطه.
    expect(r.metrics.cashOnCash).toBeGreaterThan(r.metrics.simpleAnnualReturn);
  });

  it('عائد السهم النقدي لا يتأثّر بعدد الأسهم', () => {
    const one = analyze(referenceCase()).syndication.shareCashYield;
    const o = referenceCase();
    o.syndication.shares = 7;
    expect(analyze(o).syndication.shareCashYield).toBeCloseTo(one, 9);
  });
});
