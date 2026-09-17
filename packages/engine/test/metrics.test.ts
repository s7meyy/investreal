import { describe, expect, it } from 'vitest';
import { irr, npv, payback, mirr, signChanges, type CashPoint } from '../src/metrics.js';

/** دفعة سنوية ثابتة — لها حل مغلق نقارن به. */
function annuity(amount: number, years: number, initial: number): CashPoint[] {
  const points: CashPoint[] = [{ years: 0, amount: -initial }];
  for (let y = 1; y <= years; y++) points.push({ years: y, amount });
  return points;
}

describe('npv', () => {
  it('يطابق الحل المغلق للدفعة السنوية', () => {
    const r = 0.1, n = 5, pmt = 1000;
    const closed = (pmt * (1 - (1 + r) ** -n)) / r - 3000;
    expect(npv(r, annuity(pmt, n, 3000))).toBeCloseTo(closed, 6);
  });

  it('يساوي مجموع التدفقات عند معدل صفر', () => {
    expect(npv(0, annuity(100, 4, 300))).toBeCloseTo(100, 9);
  });
});

describe('irr', () => {
  it('يجد الجذر الذي يُصفّر صافي القيمة الحالية', () => {
    const points = annuity(1000, 5, 3790.79);
    const r = irr(points)!;
    expect(r).toBeCloseTo(0.1, 4);
    expect(npv(r, points)).toBeCloseTo(0, 4);
  });

  it('يتعامل مع مضاعفة المال في سنة واحدة', () => {
    expect(irr([{ years: 0, amount: -100 }, { years: 1, amount: 200 }])!).toBeCloseTo(1, 6);
  });

  it('يعيد null إن لم يوجد جذر (كل التدفقات سالبة)', () => {
    expect(irr([{ years: 0, amount: -100 }, { years: 1, amount: -50 }])).toBeNull();
  });
});

describe('mirr', () => {
  it('يقلّ عن IRR حين يكون معدل إعادة الاستثمار أدنى', () => {
    const points = annuity(1000, 5, 3000);
    expect(mirr(points, 0.08, 0.04)!).toBeLessThan(irr(points)!);
  });
});

describe('payback', () => {
  it('يستوفي داخل الفترة لا يقفز إلى نهايتها', () => {
    // ‏٣٠٠ مستثمرة و‏٢٠٠ سنوياً ← الاسترداد عند منتصف السنة الثانية.
    expect(payback(annuity(200, 5, 300))!).toBeCloseTo(1.5, 6);
  });

  it('يعيد null إن لم يُسترد رأس المال', () => {
    expect(payback(annuity(10, 3, 1000))).toBeNull();
  });
});

describe('signChanges', () => {
  it('يرصد التدفقات متعددة الإشارات التي تُفسد IRR', () => {
    expect(signChanges(annuity(100, 3, 200))).toBe(1);
    expect(signChanges([
      { years: 0, amount: -100 }, { years: 1, amount: 300 }, { years: 2, amount: -250 },
    ])).toBe(2);
  });
});
