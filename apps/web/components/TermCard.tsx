'use client';
import type { TermPoint } from '@investreal/engine';
import { Card } from './ui';
import { pct, riyal } from '@/lib/format';

/**
 * أثر المدة — يمنع المستثمر من ظنّ الخطأ بالمحرّك.
 * حدسه يقول «أطول = أربح»، والأرقام تقول «أطول = مال أكثر وعائد أقل».
 */
export function TermCard({ points, hurts }: { points: TermPoint[]; hurts: boolean }) {
  const best = points.reduce((a, b) => ((b.irr ?? -9) > (a.irr ?? -9) ? b : a), points[0]!);
  const max = Math.max(...points.map((p) => p.irr ?? 0), 0.0001);

  return (
    <Card
      title="أثر طول المدة على عائدك"
      hint={
        hurts
          ? 'كل سنة إضافية مال أكبر تُجمّده اليوم مقابل دخل يصل بعد سنوات — فالربح المطلق يزيد والعائد ينقص.'
          : 'المدة الأطول تُوزّع تكلفة التجهيز على سنوات أكثر، فترفع عائدك هنا.'
      }
    >
      <ul className="space-y-2">
        {points.map((p) => (
          <li key={p.years} className="flex items-center gap-3">
            <span className={`w-16 shrink-0 text-[13px] ${p.isCurrent ? 'font-bold' : 'text-ink/70'}`}>
              <span className="num">{p.years}</span> سنة
            </span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper">
              <div
                className={`h-full rounded-full ${p.isCurrent ? 'bg-brand' : 'bg-brand/40'}`}
                style={{ width: `${Math.max(0, ((p.irr ?? 0) / max) * 100)}%` }}
              />
            </div>
            <span className={`num w-14 shrink-0 text-left text-[13px] ${p.isCurrent ? 'font-bold' : 'text-ink/60'}`}>
              {pct(p.irr)}
            </span>
            <span className="num hidden w-24 shrink-0 text-left text-[12px] text-ink/45 sm:block">
              {riyal(p.totalNet)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-xl bg-paper p-3 text-[12px] leading-relaxed text-ink/60">
        أعلى عائد عند <span className="num font-semibold">{best.years}</span> سنوات
        (<span className="num font-semibold">{pct(best.irr)}</span>). والصيغة المثلى غالباً:
        مدة أقصر بسعر متفق + خيار تمديد بسعر محدّد اليوم — تأخذ الميزة بلا الالتزام.
      </p>
    </Card>
  );
}
