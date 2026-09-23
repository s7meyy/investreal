'use client';
import { scoreLandLegal, type Answer, type LandLegalAnswers } from '@investreal/engine';
import { Card } from '@/components/ui';

/**
 * السجلّ النظامي.
 *
 * ثلاثة أزرار لا اثنان: «نعم» و«لا» و«لم أتحقّق». والفرق بين الأخيرين
 * هو كل شيء — «لا» في بند قاتل تُسقط الصفقة، و«لم أتحقّق» تُبقيها قائمة
 * وتمنع التقرير من ادّعاء ما لم يُتحقَّق منه.
 */

const ANSWERS: { value: Answer; label: string; tone: string }[] = [
  { value: 'yes', label: 'نعم', tone: 'border-ok bg-ok/10 text-ok' },
  { value: 'no', label: 'لا', tone: 'border-danger bg-danger/10 text-danger' },
  { value: 'unknown', label: 'لم أتحقّق', tone: 'border-amber-400 bg-amber-50 text-amber-700' },
];

const BAND_TONE = {
  clear: 'bg-ok/10 text-ok',
  caution: 'bg-amber-100 text-amber-800',
  serious: 'bg-amber-100 text-amber-900',
  blocking: 'bg-danger/10 text-danger',
} as const;

export function LandLegalForm({ answers, onChange }: {
  answers: LandLegalAnswers; onChange: (a: LandLegalAnswers) => void;
}) {
  const r = scoreLandLegal(answers);

  return (
    <Card title="الوضع النظامي" hint="بند واحد هنا يُلغي كل الأرقام — ولذلك يسبق السعر في التقرير.">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-lg px-2.5 py-1 text-[12px] font-medium ${BAND_TONE[r.band]}`}>{r.bandLabel}</span>
        <span className="rounded-lg bg-paper px-2.5 py-1 text-[12px] text-ink/60">
          خطر نظامي <span className="num">{r.score}</span>/100
        </span>
        {r.unverified.length > 0 && (
          <span className="rounded-lg bg-paper px-2.5 py-1 text-[12px] text-ink/60">
            بلا تحقّق: <span className="num">{r.unverified.length}</span> من <span className="num">{r.items.length}</span>
          </span>
        )}
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-ink/70">{r.headline}</p>

      <div className="space-y-2">
        {r.items.map((item) => (
          <div key={item.id}
            className={`rounded-xl border p-3 ${
              item.blocker && item.answer === 'no' ? 'border-danger/40 bg-danger/[0.04]' : 'border-black/[0.07]'
            }`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="text-[13px] font-semibold">
                  {item.title}
                  {item.blocker && <span className="mr-2 rounded bg-danger/10 px-1.5 py-0.5 text-[11px] text-danger">بند مانع</span>}
                </h4>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink/60">{item.question}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {ANSWERS.map((a) => (
                  <button key={a.value}
                    onClick={() => onChange({ ...answers, [item.id]: a.value })}
                    className={`rounded-lg border px-2.5 py-1 text-[12px] font-medium ${
                      item.answer === a.value ? a.tone : 'border-black/10 text-ink/50 hover:bg-paper'
                    }`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            {item.answer !== 'yes' && (
              <div className="mt-2 border-t border-black/[0.06] pt-2 text-[12px] leading-relaxed text-ink/60">
                <p>{item.why}</p>
                <p className="mt-1 text-ink/70"><strong className="font-semibold">كيف تتحقّق:</strong> {item.howToVerify}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
