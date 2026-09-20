'use client';
import type { AnalysisResult, Grade } from '@investreal/engine';
import { pct, riyal } from '@/lib/format';

const LABEL: Record<Grade, string> = {
  excellent: 'ممتازة', very_good: 'جيدة جداً', good: 'جيدة',
  marginal: 'حدّية', weak: 'ضعيفة', rejected: 'مرفوضة',
};

const TONE: Record<Grade, string> = {
  excellent: 'bg-brand text-white', very_good: 'bg-brand text-white',
  good: 'bg-emerald-700 text-white', marginal: 'bg-amber-600 text-white',
  weak: 'bg-orange-700 text-white', rejected: 'bg-red-700 text-white',
};

/**
 * شريط النتيجة الملتصق — يظهر على الجوال فقط.
 *
 * وعد المنتج «نتيجة خلال دقيقة» كان مكسوراً على الجوال: الحكم يقع بعد
 * ثلاث شاشات ونصف من التمرير لأن عمود الإدخال كله يسبقه. هذا الشريط
 * يُبقي الحكم والعائد أمام العين أثناء تعديل أي حقل.
 */
export function StickyVerdict({ result, onOpen }: {
  result: AnalysisResult; onOpen: () => void;
}) {
  const { verdict, metrics } = result;
  const ready = metrics.irr !== null || metrics.totalNet !== 0;

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <span className={`shrink-0 rounded-lg px-3 py-1.5 text-[14px] font-bold ${TONE[verdict.grade]}`}>
          {ready ? LABEL[verdict.grade] : '—'}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-baseline gap-2">
            <span className="num text-[17px] font-bold">{pct(metrics.irr)}</span>
            <span className="text-[11px] text-ink/50">عائد داخلي</span>
          </div>
          <div className="truncate text-[11px] text-ink/50">
            ربح سنوي {riyal(metrics.avgAnnualProfit)}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-[13px] font-medium text-ink/70"
        >
          التفاصيل
        </button>
      </div>
    </div>
  );
}
