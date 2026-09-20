import { describe, expect, it } from 'vitest';
import { referenceCase } from './fixtures.js';
import { analyze } from '../src/analyze.js';
import { termHurtsReturn, termSensitivity } from '../src/term.js';

describe('أثر المدة على العائد', () => {
  it('المدة الأطول بدفعة مقدّمة تُنقص العائد وتزيد الربح المطلق', () => {
    // ‏هذا ما يناقض حدس المستثمر، ووجوده في الواجهة يمنع ظنّ الخطأ بالمحرّك.
    const points = termSensitivity(referenceCase());
    const five = points.find((p) => p.years === 5)!;
    const thirty = points.find((p) => p.years === 30)!;

    expect(thirty.irr!).toBeLessThan(five.irr!);
    expect(thirty.totalNet).toBeGreaterThan(five.totalNet);
    expect(thirty.capitalInvested).toBeGreaterThan(five.capitalInvested);
    expect(termHurtsReturn(points)).toBe(true);
  });

  it('يتضمّن مدة الفرصة الحالية ويُعلّمها', () => {
    const o = referenceCase();
    o.deal.termYears = 7;
    const points = termSensitivity(o);
    const current = points.filter((p) => p.isCurrent);
    expect(current).toHaveLength(1);
    expect(current[0]!.years).toBe(7);
  });

  it('لا يتجاوز حدود المدد المسموحة', () => {
    const points = termSensitivity(referenceCase());
    expect(points.every((p) => p.years >= 1 && p.years <= 30)).toBe(true);
    expect(points.map((p) => p.years)).toEqual([...points.map((p) => p.years)].sort((a, b) => a - b));
  });

  it('يظهر في نتيجة التحليل الكامل', () => {
    expect(analyze(referenceCase()).termSensitivity.length).toBeGreaterThan(3);
  });
});
