'use client';
import { KIND_LABEL, TRACK_LABEL, type LandAnalysis, type PriceTrack, type ReaderLens } from '@investreal/engine';
import { Card, Metric } from '@/components/ui';
import { printableClass, type ReportSections } from '@/components/ReportSections';
import { pct, riyal } from '@/lib/format';

const sar = (v: number) => `${Math.round(v).toLocaleString('en-US')} ريال`;

const CONFIDENCE_LABEL = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' } as const;
const CONFIDENCE_TONE = { high: 'bg-ok/10 text-ok', medium: 'bg-amber-100 text-amber-700', low: 'bg-danger/10 text-danger' } as const;

export function LandResults({ a, lens, sections }: {
  a: LandAnalysis; lens: ReaderLens; sections: ReportSections;
}) {
  const v = a.valuation;
  // القسم المُطفأ يبقى على الشاشة ويغيب عن الورق
  const p = printableClass;

  return (
    <div className="space-y-4">
      <Card title="الخلاصة" hint={a.recommendation.headline}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="سعر المتر المرجّح" value={sar(v.perSqm.likely)} />
          <Metric label="النطاق العادل" value={`${Math.round(v.perSqm.low).toLocaleString('en-US')}–${Math.round(v.perSqm.high).toLocaleString('en-US')}`} note="ريال للمتر" />
          <Metric label="القيمة الإجمالية" value={sar(v.totalValue.likely)} note={`${Math.round(v.subject.areaSqm).toLocaleString('en-US')} م²`} />
          <Metric label="السقف الموصى به" value={sar(a.recommendation.ceilingPerSqm)} note="للمتر، لا يُتجاوز" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-lg px-2.5 py-1 text-[12px] font-medium ${CONFIDENCE_TONE[v.confidence.grade]}`}>
            ثقة {CONFIDENCE_LABEL[v.confidence.grade]} · {v.confidence.score}/100
          </span>
          <span className="rounded-lg bg-paper px-2.5 py-1 text-[12px] text-ink/60">
            بيع سريع {sar(v.quickSalePerSqm)} · سعر الصبر {sar(v.patientPerSqm)}
          </span>
        </div>

        <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-ink/70">
          {a.recommendation.reasons.map((r, i) => <li key={i}>• {r}</li>)}
        </ul>
      </Card>

      <div className={p(sections.tracks)}>
      <Card title="المسارات الثلاثة" hint="المسار الرسمي يُعرض للمقارنة ولا يدخل في القيمة السوقية — هو أساس الرسوم لا سعر البيع.">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-ink/55">
              <tr className="border-b border-black/[0.07]">
                <th className="py-2 text-right font-medium">المسار</th>
                <th className="py-2 text-left font-medium">المئين ٢٥</th>
                <th className="py-2 text-left font-medium">الوسيط</th>
                <th className="py-2 text-left font-medium">المئين ٧٥</th>
                <th className="py-2 text-left font-medium">العدد</th>
              </tr>
            </thead>
            <tbody>
              {(['field', 'app', 'official'] as PriceTrack[]).map((t) => {
                const s = v.tracks[t];
                return (
                  <tr key={t} className="border-b border-black/[0.04] last:border-0">
                    <td className="py-2">{TRACK_LABEL[t]}</td>
                    <td className="num py-2 text-left">{s ? Math.round(s.p25).toLocaleString('en-US') : '—'}</td>
                    <td className="num py-2 text-left font-semibold">{s ? Math.round(s.median).toLocaleString('en-US') : '—'}</td>
                    <td className="num py-2 text-left">{s ? Math.round(s.p75).toLocaleString('en-US') : '—'}</td>
                    <td className="num py-2 text-left">{s ? s.n : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {v.gaps.appVsField !== null && (
            <div className="rounded-xl bg-paper px-3 py-2 text-[13px] leading-relaxed">
              المعروض في التطبيقات {v.gaps.appVsField >= 0 ? 'أعلى' : 'أدنى'} من الميداني بـ
              <span className="num font-semibold"> {Math.abs(Math.round(v.gaps.appVsField * 100))}٪</span>
              <span className="block text-[12px] text-ink/50">
                {v.gaps.appVsField > 0.15 ? 'معروض متضخّم — مساحة تفاوض واسعة للمشتري' : 'الفجوة ضمن المعتاد'}
              </span>
            </div>
          )}
          {v.gaps.fieldVsOfficial !== null && (
            <div className="rounded-xl bg-paper px-3 py-2 text-[13px] leading-relaxed">
              السعر الميداني {v.gaps.fieldVsOfficial >= 0 ? 'أعلى' : 'أدنى'} من التقدير الرسمي بـ
              <span className="num font-semibold"> {Math.abs(Math.round(v.gaps.fieldVsOfficial * 100))}٪</span>
              <span className="block text-[12px] text-ink/50">الفرق يُسعَّر في الرسوم ومخاطر التنفيذ</span>
            </div>
          )}
        </div>
      </Card>

      </div>

      <div className={p(sections.comparables)}>
      <Card title="جدول المقارنات" hint="كل مقارنة بتسوياتها ومصدرها وتاريخها — بما فيها المستبعدة وسبب استبعادها.">
        <div className="space-y-2">
          {v.normalized.map((n) => (
            <details key={n.observation.id} className={`rounded-xl border p-3 ${n.excluded ? 'border-black/[0.07] bg-paper/60 opacity-70' : 'border-black/[0.07]'}`}>
              <summary className="cursor-pointer text-[13px]">
                <span className="font-medium">{n.observation.source || 'بلا مصدر'}</span>
                <span className="text-ink/50"> · {KIND_LABEL[n.observation.kind]} · {n.observation.observedAt}</span>
                <span className="num mr-2 font-semibold">
                  {Math.round(n.observation.pricePerSqm).toLocaleString('en-US')} ←
                  {' '}{Math.round(n.adjustedPricePerSqm).toLocaleString('en-US')}
                </span>
                {n.excluded && <span className="mr-2 rounded bg-danger/10 px-1.5 py-0.5 text-[11px] text-danger">مستبعدة</span>}
              </summary>
              {n.excluded && <p className="mt-2 text-[12px] text-danger/80">{n.exclusionReason}</p>}
              <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-ink/65">
                {n.adjustments.length === 0 && <li>لا تسويات — المقارنة مطابقة لصفات أرضك.</li>}
                {n.adjustments.map((adj) => (
                  <li key={adj.key} className="flex justify-between gap-3">
                    <span>{adj.label} — {adj.reason}</span>
                    <span className={`num shrink-0 font-medium ${adj.pct >= 0 ? 'text-ok' : 'text-danger'}`}>
                      {adj.pct >= 0 ? '+' : '−'}{Math.abs(adj.pct * 100).toFixed(1)}٪
                    </span>
                  </li>
                ))}
              </ul>
              {!n.excluded && (
                <p className="mt-2 text-[11px] text-ink/45">
                  مجموع التسويات {(n.totalAbsAdjustment * 100).toFixed(0)}٪ · الوزن {n.weight.toFixed(2)}
                </p>
              )}
            </details>
          ))}
        </div>
      </Card>

      </div>

      {lens === 'developer' && (
        <div className={p(sections.lens)}>
        <Card title="القيمة المتبقّية — ما يحتمله المشروع" hint="المقارنات تقول بكم تُباع. هذه تقول بكم تستحق أن تُشترى.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="المسطحات المسموحة" value={`${Math.round(a.residual.grossFloorAreaSqm).toLocaleString('en-US')} م²`} />
            <Metric label="القابل للبيع" value={`${Math.round(a.residual.saleableAreaSqm).toLocaleString('en-US')} م²`} />
            <Metric label="إيراد المبيعات" value={riyal(a.residual.revenue)} />
            <Metric label="سعر الأرض المحتمل" value={sar(a.residual.landValuePerSqm)}
              tone={a.residual.landValuePerSqm >= v.perSqm.likely ? 'good' : 'bad'} note="للمتر" />
          </div>
          <table className="mt-3 w-full text-[13px]">
            <tbody>
              {[
                ['تكلفة البناء', a.residual.constructionCost],
                ['التكاليف غير المباشرة', a.residual.softCosts],
                ['التسويق والعمولة', a.residual.marketingCost],
                ['كلفة التمويل', a.residual.financeCost],
                ['ربح المطوّر المستهدف', a.residual.targetProfit],
                ['ميزانية الأرض شاملة الرسوم', a.residual.landBudget],
              ].map(([label, value]) => (
                <tr key={label as string} className="border-b border-black/[0.04] last:border-0">
                  <td className="py-1.5 text-ink/70">{label}</td>
                  <td className="num py-1.5 text-left font-medium">{riyal(value as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-[13px] leading-relaxed">
            لو اشتريت بسعر السوق المرجّح، هامشك{' '}
            <span className={`num font-semibold ${a.developerAtMarket.marginOnRevenue >= 0.15 ? 'text-ok' : 'text-danger'}`}>
              {pct(a.developerAtMarket.marginOnRevenue)}
            </span>{' '}
            من الإيراد ({riyal(a.developerAtMarket.profit)}) — مقابل هدف {pct(a.residual.revenue > 0 ? a.residual.targetProfit / a.residual.revenue : 0)}.
            <span className="mt-1 block text-[12px] text-ink/55">
              سعر متر الأرض لكل متر مبيع: <span className="num">{sar(a.residual.landCostPerSaleableSqm)}</span> — به تقارن أرضين مختلفتين.
            </span>
          </p>
        </Card>
        </div>
      )}

      {lens === 'investor' && (
        <div className={p(sections.lens)}>
        <Card title="كم يكلّفني الانتظار؟" hint="ارتفاع السعر وحده ليس ربحاً: الرسوم وتكلفة الفرصة تأكل الفرق.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="تكلفة الشراء شاملة" value={riyal(a.holding.buyAllIn)} />
            <Metric label="سعر البيع المتوقّع" value={riyal(a.holding.expectedSalePrice)} />
            <Metric label="صافي الربح" value={riyal(a.holding.netProfit)} tone={a.holding.netProfit >= 0 ? 'good' : 'bad'} />
            <Metric label="العائد السنوي" value={pct(a.holding.annualizedReturn)}
              tone={(a.holding.excessOverOpportunity ?? -1) >= 0 ? 'good' : 'bad'} />
          </div>
          <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-[13px] leading-relaxed">
            تحتاج نمواً سنوياً <span className="num font-semibold">{pct(a.holding.breakevenAppreciation)}</span> لمجرّد
            التعادل مع البديل الآمن. ما دون ذلك خسارة حقيقية وإن كان رقم البيع أعلى من رقم الشراء.
          </p>
        </Card>
        </div>
      )}

      <div className={p(sections.costs)}>
      <Card title="ما يُدفع فوق الثمن" hint="سعر المتر ليس التكلفة. النسب قابلة للتعديل وتُراجَع من مصادرها عند التعاقد.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h4 className="mb-1.5 text-[13px] font-semibold">على المشتري</h4>
            <ul className="space-y-1 text-[13px]">
              {a.costsAtMarket.buyerRows.map((r) => (
                <li key={r.label} className="flex justify-between gap-2 border-b border-black/[0.04] py-1">
                  <span className="text-ink/70">{r.label}<span className="block text-[11px] text-ink/45">{r.note}</span></span>
                  <span className="num shrink-0 font-medium">{riyal(r.amount)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-2 pt-1 font-semibold">
                <span>التكلفة الكلية للمشتري</span><span className="num">{riyal(a.costsAtMarket.buyerAllIn)}</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-1.5 text-[13px] font-semibold">على البائع</h4>
            <ul className="space-y-1 text-[13px]">
              {a.costsAtMarket.sellerRows.map((r) => (
                <li key={r.label} className="flex justify-between gap-2 border-b border-black/[0.04] py-1">
                  <span className="text-ink/70">{r.label}<span className="block text-[11px] text-ink/45">{r.note}</span></span>
                  <span className="num shrink-0 font-medium">{riyal(r.amount)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-2 pt-1 font-semibold">
                <span>صافي ما يصل البائع</span><span className="num">{riyal(a.costsAtMarket.sellerNet)}</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      </div>

      <div className={p(sections.confidence)}>
      <Card title="الثقة والتحفّظات" hint="التقرير منخفض الثقة يجب أن يبدو كذلك لا أن يتجمّل.">
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-ink/70">
          {v.confidence.reasons.map((r, i) => <li key={`c${i}`}>• {r}</li>)}
        </ul>
        {v.warnings.length > 0 && (
          <ul className="mt-3 space-y-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-900">
            {v.warnings.map((w, i) => <li key={`w${i}`}>⚠︎ {w}</li>)}
          </ul>
        )}
      </Card>
      </div>
    </div>
  );
}
