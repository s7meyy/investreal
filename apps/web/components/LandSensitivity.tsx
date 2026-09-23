'use client';
import type { LandAnalysis } from '@investreal/engine';
import { Card } from '@/components/ui';

/**
 * حساسية قيمة الأرض — مخطط Tornado.
 *
 * الشريط يقول ما لا يقوله الرقم: أين تتركّز خطورة تقديرك. والعامل الأعلى
 * هو ما يستحق مكالمة أو زيارة قبل التوقيع، لا ما يستحق تحفّظاً في النفس.
 */
export function LandSensitivity({ a, swingPct = 10 }: { a: LandAnalysis; swingPct?: number }) {
  const { base, items, headline } = a.sensitivity;
  const max = Math.max(...items.map((i) => i.swing), 1);

  return (
    <Card title="ما الذي يغيّر القيمة؟" hint={`أثر تحرّك كل عامل ±${swingPct}٪ على سعر الأرض المحتمل.`}>
      <p className="mb-4 rounded-xl bg-paper px-3 py-2 text-[13px] leading-relaxed">{headline}</p>

      <div className="space-y-2.5">
        {items.map((item) => {
          const width = (item.swing / max) * 100;
          return (
            <div key={item.key}>
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="font-medium">{item.label}</span>
                <span className="num shrink-0 text-ink/60">
                  ±{Math.round(item.swingPct * 100)}٪ · {Math.round(item.swing).toLocaleString('en-US')} ريال/م²
                </span>
              </div>
              <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-paper">
                <div className="h-full rounded-full bg-brand/70" style={{ width: `${width}%` }} />
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink/45">{item.note}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-ink/55">
        الحالة الأساس: <span className="num font-semibold">{Math.round(base).toLocaleString('en-US')}</span> ريال
        للمتر قيمةً متبقّية. العوامل أعلاه مرتّبة بأثرها لا بأهميتها في ذهنك.
      </p>
    </Card>
  );
}
