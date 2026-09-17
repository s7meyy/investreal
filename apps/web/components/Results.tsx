'use client';
import type { AnalysisResult, Grade, Opportunity } from '@investreal/engine';
import { ReportCover } from './ReportCover';
import { Card, Metric } from './ui';
import { CashflowChart } from './CashflowChart';
import { pct, riyal, years } from '@/lib/format';

const GRADE_STYLE: Record<Grade, { bg: string; text: string; ring: string }> = {
  excellent: { bg: 'bg-brand-light', text: 'text-brand-dark', ring: 'ring-brand/25' },
  very_good: { bg: 'bg-brand-light', text: 'text-brand-dark', ring: 'ring-brand/25' },
  good: { bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-500/20' },
  marginal: { bg: 'bg-amber-50', text: 'text-amber-900', ring: 'ring-amber-500/25' },
  weak: { bg: 'bg-orange-50', text: 'text-orange-900', ring: 'ring-orange-500/25' },
  rejected: { bg: 'bg-red-50', text: 'text-red-900', ring: 'ring-red-500/25' },
};

const RISK_LABEL = { low: 'منخفضة', medium: 'متوسطة', high: 'مرتفعة', critical: 'حرجة' } as const;

export function Results({ result, hurdle, opportunity }: {
  result: AnalysisResult; hurdle: number; opportunity: Opportunity;
}) {
  const { metrics: m, verdict, risk, syndication: syn } = result;
  const hasOperator = opportunity.syndication.operatorShare > 0;
  const isSplit = syn.shares > 1;
  const style = GRADE_STYLE[verdict.grade];
  const excess = m.irr === null ? null : m.irr - hurdle;

  return (
    <div className="space-y-4">
      <ReportCover opportunity={opportunity} result={result} />

      {/* البطاقة التنفيذية: الحكم وسببه قبل أي تفصيل */}
      <div className={`rounded-2xl ${style.bg} p-5 ring-1 ${style.ring}`}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <span className="block text-[13px] text-ink/55">الحكم على هذه الفرصة</span>
            <h2 className={`mt-0.5 text-3xl font-bold leading-tight ${style.text}`}>{verdict.label}</h2>
          </div>
          <div className="min-w-0 text-left">
            <span className="block text-[13px] text-ink/55">العائد الداخلي</span>
            <div className={`num mt-0.5 text-3xl font-bold leading-tight ${style.text}`}>{pct(m.irr)}</div>
          </div>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-ink/80">{verdict.reason}</p>
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50/70 p-4">
          <h3 className="mb-2 text-[13px] font-semibold text-amber-900">قبل أن تثق بالنتيجة</h3>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-amber-900/85">
            {result.warnings.map((w, i) => <li key={i}>• {w}</li>)}
          </ul>
        </div>
      )}

      <Card title="النتيجة بالأرقام">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="صافي الربح الكلي" value={riyal(m.totalNet)} tone={m.totalNet > 0 ? 'good' : 'bad'} />
          <Metric label="رأس المال المستثمر" value={riyal(m.capitalInvested)} />
          <Metric
            label={`صافي القيمة الحالية @${pct(hurdle, 0)}`}
            value={riyal(m.npv)}
            tone={m.npv > 0 ? 'good' : 'bad'}
            note={m.npv > 0 ? 'تتفوّق على البديل الآمن' : 'البديل الآمن أفضل'}
          />
          <Metric
            label="فائض العائد عن البديل"
            value={excess === null ? '—' : `${excess >= 0 ? '+' : ''}${(excess * 100).toFixed(1)} نقطة`}
            tone={excess !== null && excess > 0.05 ? 'good' : excess !== null && excess < 0 ? 'bad' : 'neutral'}
          />
          <Metric label="استرداد رأس المال" value={years(m.paybackYears)} />
          <Metric label="الاسترداد المخصوم" value={years(m.discountedPaybackYears)} />
          <Metric
            label="إشغال التعادل"
            value={pct(m.breakevenOccupancy, 0)}
            note="أقل إشغال تبقى معه غير خاسر"
            tone={m.breakevenOccupancy !== null && m.breakevenOccupancy > 0.75 ? 'bad' : 'neutral'}
          />
          <Metric label="خصم الصفقة عن السوق" value={pct(m.discountToMarket, 0)} />
          <Metric
            label="مكرر الأرباح"
            value={m.earningsMultiple === null ? '—' : `${m.earningsMultiple.toFixed(1)}×`}
            note="كم سنة من التوزيعات تساوي ما دفعته"
          />
          <Metric label="التكلفة الشهرية" value={riyal(m.monthlyContractCost)} note="ما تدفعه للمالك شهرياً" />
          <Metric label="التوزيع السنوي المتوقع" value={riyal(m.avgAnnualDistribution)} />
          <Metric
            label="العائد النقدي السنوي"
            value={pct(m.cashOnCash)}
            note="التوزيع السنوي ÷ رأس المال"
          />
        </div>
        {!m.irrReliable && m.mirr !== null && (
          <p className="mt-3 rounded-xl bg-paper p-3 text-[12px] leading-relaxed text-ink/60">
            تتعدّد إشارات التدفق في هذه الفرصة، فالعائد الداخلي وحده قد يُضلّل.
            المعدل المعدّل (MIRR) — الذي يفترض إعادة استثمار واقعية — هو{' '}
            <span className="num font-semibold">{pct(m.mirr)}</span>.
          </p>
        )}
      </Card>

      <Card title="التدفق النقدي التراكمي" hint="الخط يعبر الصفر عند استرداد رأس المال؛ كل ما تحته منطقة انكشاف.">
        <CashflowChart annual={result.annual} paybackYears={m.paybackYears} />
      </Card>

      <Card
        title="السيناريوهات الثلاثة"
        hint="السيناريو المتشائم ليس تشاؤماً، بل الاحتمال الذي لا يحسبه أحد."
      >
        <div className="grid grid-cols-3 gap-3">
          {([
            ['متشائم', result.scenarios.pessimistic, 'bad'],
            ['أساسي', result.scenarios.base, 'neutral'],
            ['متفائل', result.scenarios.optimistic, 'good'],
          ] as const).map(([label, s, tone]) => (
            <Metric key={label} label={label} value={pct(s.irr)} tone={tone} note={riyal(s.totalNet)} />
          ))}
        </div>
      </Card>

      {(isSplit || hasOperator) && (
        <Card
          title="تجزئة الفرصة وحصة المشغّل"
          hint="عائد الفرصة ليس عائد المستثمر: ما يأخذه المشغّل يخرج من جيبك أنت."
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="عدد الأسهم" value={`${syn.shares}`} />
            <Metric label="قيمة السهم الواحد" value={riyal(syn.capitalPerShare)} />
            <Metric label="التوزيع السنوي للسهم" value={riyal(syn.annualPerShare)} />
            <Metric label="إجمالي عائد السهم" value={riyal(syn.totalPerShare)} tone={syn.totalPerShare > 0 ? 'good' : 'bad'} />
            <Metric
              label="العائد النقدي السنوي للسهم"
              value={pct(syn.shareCashYield)}
              note="ما يدخل جيب صاحب السهم كل سنة"
            />
            <Metric label="صافي عائد السهم للفترة" value={pct(syn.shareTotalReturn, 0)} />
            <Metric
              label="العائد الداخلي للمستثمر"
              value={pct(syn.investorIrr)}
              tone={hasOperator ? 'bad' : 'neutral'}
              note={hasOperator ? `عائد الفرصة ${pct(m.irr)} قبل حصة المشغّل` : undefined}
            />
            <Metric
              label="ما يأخذه المشغّل"
              value={riyal(syn.operatorTotalNet)}
              note={hasOperator ? `${pct(opportunity.syndication.operatorShare, 0)} من صافي الدخل` : 'لا يوجد مشغّل'}
            />
          </div>
          {hasOperator && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-900/85">
              المشغّل يأخذ حصته من الفائض التشغيلي الموجب فقط — لا يشارك في رأس المال
              ولا في الخسارة. هذا هو العُرف، وهو في غير صالحك: أنت تتحمّل كل المخاطرة
              ويشاركك في الربح وحده. فاوض على ربط حصته بتجاوز عائد أدنى مضمون لك أولاً.
            </p>
          )}
        </Card>
      )}

      <Card
        title="السقف التفاوضي"
        hint="أقصى ما تدفعه لتحقّق كل عائد مستهدف. هذا الجدول هو ذخيرتك في التفاوض — لا تدخل بدونه."
      >
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-black/10 text-right text-[12px] text-ink/55">
                <th className="py-2 font-medium">العائد المستهدف</th>
                <th className="py-2 font-medium">أقصى إيجار سنوي</th>
                <th className="py-2 font-medium">إجمالي ما تدفعه</th>
              </tr>
            </thead>
            <tbody>
              {result.ceilings.map((c) => {
                const affordable = c.maxContractRentAnnual >= 0;
                return (
                  <tr key={c.targetIrr} className="border-b border-black/5 last:border-0">
                    <td className="py-2.5 num">{pct(c.targetIrr, 0)}</td>
                    <td className={`py-2.5 num font-semibold ${affordable ? '' : 'text-danger'}`}>
                      {riyal(c.maxContractRentAnnual)}
                    </td>
                    <td className="py-2.5 num text-ink/65">{riyal(c.maxUpfrontTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="خطة التفاوض" hint="مرتّبة بالأثر ÷ الجهد، وكل توصية مُسعَّرة بأثرها الفعلي على عائدك.">
        <ol className="space-y-3">
          {result.recommendations.map((r) => (
            <li key={r.id} className="rounded-xl bg-paper p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[14px] font-semibold">{r.title}</h3>
                {r.irrDelta !== null && (
                  <span className={`num rounded-lg px-2 py-0.5 text-[12px] font-semibold ${r.irrDelta >= 0 ? 'bg-brand-light text-brand-dark' : 'bg-red-50 text-danger'}`}>
                    {r.irrDelta >= 0 ? '+' : ''}{(r.irrDelta * 100).toFixed(1)} نقطة
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink/70">{r.detail}</p>
            </li>
          ))}
        </ol>
      </Card>

      <Card
        title={`المخاطر — الدرجة ${risk.score}/100 (${RISK_LABEL[risk.band]})`}
        hint="كل «غير معروف» محسوب كخطر، لأن الجهل ليس أماناً."
      >
        {risk.blockers.length > 0 && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 ring-1 ring-red-500/20">
            <h3 className="text-[13px] font-semibold text-red-900">بنود قاتلة لا يُعوّضها أي عائد</h3>
            <ul className="mt-1.5 space-y-1 text-[13px] text-red-900/85">
              {risk.blockers.map((b) => <li key={b}>• {b}</li>)}
            </ul>
          </div>
        )}
        {risk.unverifiedBlockers.length > 0 && (
          <div className="mb-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-500/25">
            <h3 className="text-[13px] font-semibold text-amber-900">بنود لا يرتفع الحكم قبل حسمها</h3>
            <ul className="mt-1.5 space-y-1 text-[13px] text-amber-900/85">
              {risk.unverifiedBlockers.map((b) => <li key={b}>• {b}</li>)}
            </ul>
          </div>
        )}
        <ul className="space-y-2.5">
          {risk.items.slice(0, 10).map((r) => (
            <li key={r.id} className="border-r-2 border-black/10 pr-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-medium">{r.title}</span>
                <span className="num text-[11px] text-ink/45">شدّة {r.severity}</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink/65">{r.note}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-brand-dark">← {r.mitigation}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="أين تركّز تحقّقك؟" hint="أثر تحريك كل عامل ±٢٠٪ على عائدك الداخلي.">
        <ul className="space-y-2">
          {result.sensitivity.map((t) => {
            const max = result.sensitivity[0]?.swing || 1;
            return (
              <li key={t.variable} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-[13px] text-ink/70">{t.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper">
                  <div className="h-full rounded-full bg-brand/70" style={{ width: `${(t.swing / max) * 100}%` }} />
                </div>
                <span className="num w-16 shrink-0 text-left text-[12px] text-ink/55">
                  {(t.swing * 100).toFixed(1)} نقطة
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {result.reinvestment.length > 0 && (
        <Card
          title="ماذا لو أعدتَ استثمار الأرباح؟"
          hint={`لو كرّرتَ فرصة بعائد ${pct(m.irr)} وأعدتَ استثمار كل ريال بدل استهلاكه.`}
        >
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-black/10 text-right text-[12px] text-ink/55">
                  <th className="py-2 font-medium">السنة</th>
                  <th className="py-2 font-medium">رأس المال</th>
                  <th className="py-2 font-medium">العائد</th>
                  <th className="py-2 font-medium">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {result.reinvestment.map((r) => (
                  <tr key={r.year} className="border-b border-black/5 last:border-0">
                    <td className="py-2 num">{r.year}</td>
                    <td className="py-2 num text-ink/70">{Math.round(r.opening).toLocaleString('en-US')}</td>
                    <td className="py-2 num text-ok">{Math.round(r.gain).toLocaleString('en-US')}</td>
                    <td className="py-2 num font-semibold">{Math.round(r.closing).toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-xl bg-paper p-3 text-[12px] leading-relaxed text-ink/60">
            هذا الجدول ليس وعداً: هو يفترض أنك تجد فرصة بنفس العائد كل مرة، وأن لا شيء
            يتعثّر. قيمته أنه يُظهر لماذا فارق نقطتين في العائد يصنع فرقاً هائلاً بعد
            عشر سنوات — وهذا وحده يُبرّر التفاوض على السعر.
          </p>
        </Card>
      )}

      <Card title="جدول التدفقات النقدية">
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-black/10 text-right text-[12px] text-ink/55">
                <th className="py-2 font-medium">السنة</th>
                <th className="py-2 font-medium">الإيراد</th>
                <th className="py-2 font-medium">التشغيل</th>
                <th className="py-2 font-medium">الإيجار المدفوع</th>
                <th className="py-2 font-medium">الصافي</th>
                <th className="py-2 font-medium">التراكمي</th>
              </tr>
            </thead>
            <tbody>
              {result.annual.map((r) => (
                <tr key={r.year} className="border-b border-black/5 last:border-0">
                  <td className="py-2 num">{r.year === 0 ? 'التأسيس' : r.year}</td>
                  <td className="py-2 num text-ink/70">{Math.round(r.income).toLocaleString('en-US')}</td>
                  <td className="py-2 num text-ink/70">{Math.round(r.operatingCosts + r.capitalCosts).toLocaleString('en-US')}</td>
                  <td className="py-2 num text-ink/70">{Math.round(r.contractRentPaid).toLocaleString('en-US')}</td>
                  <td className={`py-2 num font-semibold ${r.net < 0 ? 'text-danger' : ''}`}>
                    {Math.round(r.net).toLocaleString('en-US')}
                  </td>
                  <td className={`py-2 num ${r.cumulative < 0 ? 'text-danger/70' : 'text-ok'}`}>
                    {Math.round(r.cumulative).toLocaleString('en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="rounded-2xl bg-white/60 p-4 text-[12px] leading-relaxed text-ink/50">
        هذا التقرير أداة تحليل كمّي مبنية على افتراضات أدخلتَها أنت، وليس استشارة
        مالية أو قانونية أو شرعية، ولا يُغني عن الفحص الميداني والمراجعة القانونية
        للعقد والتحقق من الأنظمة السارية عند تاريخ التعاقد.
      </p>
    </div>
  );
}
