import type { Opportunity, TermPoint } from './types.js';
import { computeMetrics } from './metrics.js';

/**
 * أثر طول المدة على العائد.
 *
 * حدس المستثمر يقول «مدة أطول = ربح أكثر»، وهو صحيح بالمبلغ المطلق وخاطئ
 * بالعائد: كل سنة إضافية في عقد مدفوع مقدّماً تعني مالاً أكبر يُجمّد اليوم
 * مقابل دخل يصل بعد سنوات، فيهبط العائد الداخلي. بغير هذا الجدول سيظنّ
 * المستخدم أن المحرّك أخطأ حين يرى ثلاثين سنة تعطي أقل من عشر.
 */
export function termSensitivity(o: Opportunity, spans = [5, 10, 15, 20, 25, 30]): TermPoint[] {
  const years = [...new Set([...spans, o.deal.termYears])].sort((a, b) => a - b);
  return years
    .filter((y) => y >= 1 && y <= 30)
    .map((y) => {
      const clone = structuredClone(o);
      clone.deal.termYears = y;
      const m = computeMetrics(clone);
      return {
        years: y,
        irr: m.irr,
        capitalInvested: m.capitalInvested,
        totalNet: m.totalNet,
        isCurrent: y === o.deal.termYears,
      };
    });
}

/** هل يهبط العائد كلما طالت المدة؟ (الحالة الغالبة في الدفع المقدّم) */
export function termHurtsReturn(points: TermPoint[]): boolean {
  const valid = points.filter((p) => p.irr !== null);
  if (valid.length < 2) return false;
  return valid[valid.length - 1]!.irr! < valid[0]!.irr!;
}
