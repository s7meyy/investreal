'use client';
import {
  bestUse, equivalentOffers, walkAwayPrice,
  type LandSubject, type ResidualInputs, type UseScenario,
} from '@investreal/engine';
import { Card, NumberField, PercentField } from '@/components/ui';
import { printableClass } from '@/components/ReportSections';
import { riyal } from '@/lib/format';

/**
 * ورقة التفاوض وسيناريوهات الاستخدام.
 *
 * ما يُنهي المفاوضة ليس رقماً أدنى، بل ثلاثة بدائل متكافئة عندك ومختلفة
 * عند البائع، وحدّ انسحاب محسوب لا مُتشدَّد به.
 */

const sar = (v: number) => `${Math.round(v).toLocaleString('en-US')} ريال`;

export interface OfferSettings {
  discountRate: number;
  deferMonths: number;
  downPaymentPct: number;
  cashDiscountPct: number;
}

export function NegotiationSheet({
  subject, ceilingPerSqm, targetPerSqm, settings, onSettings, residual, scenarios, onScenarios,
  marketPerSqm, showNegotiation = true, showScenarios = true,
}: {
  subject: LandSubject;
  ceilingPerSqm: number;
  targetPerSqm: number;
  settings: OfferSettings;
  onSettings: (s: OfferSettings) => void;
  residual: ResidualInputs;
  scenarios: UseScenario[];
  onScenarios: (s: UseScenario[]) => void;
  marketPerSqm: number;
  /** كل بطاقة تُطفأ عن الورق وحدها: ورقة التفاوض قد لا تُرسَل مع التقرير */
  showNegotiation?: boolean;
  showScenarios?: boolean;
}) {
  const base = targetPerSqm > 0 ? targetPerSqm : ceilingPerSqm;
  const { offers } = equivalentOffers(
    { basePricePerSqm: base, areaSqm: subject.areaSqm, ...settings },
    subject, residual,
  );
  const walkAway = walkAwayPrice(ceilingPerSqm, subject.areaSqm);
  const ranked = bestUse(subject, scenarios.filter((s) => s.far > 0 && s.sellPricePerSqm > 0), residual);

  const setScenario = (i: number, patch: Partial<UseScenario>) =>
    onScenarios(scenarios.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <>
      <div className={printableClass(showNegotiation)}>
      <Card title="ورقة التفاوض" hint="ثلاثة عروض قيمتها الحالية عندك واحدة — ودع البائع يختار ما يناسب حاجته.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PercentField label="ثمن المال عندك" value={settings.discountRate}
            onChange={(v) => onSettings({ ...settings, discountRate: v })} />
          <NumberField label="مدّة التأجيل" value={settings.deferMonths}
            onChange={(v) => onSettings({ ...settings, deferMonths: v })} suffix="شهر" />
          <PercentField label="الدفعة المقدّمة" value={settings.downPaymentPct}
            onChange={(v) => onSettings({ ...settings, downPaymentPct: v })} />
          <PercentField label="خصم النقد" value={settings.cashDiscountPct}
            onChange={(v) => onSettings({ ...settings, cashDiscountPct: v })} />
        </div>

        {offers.length === 0 ? (
          <p className="mt-4 text-[13px] text-ink/50">أضف مقارنات أولاً ليُحسب سعر الأساس.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {offers.map((o) => (
              <div key={o.key} className="rounded-xl border border-black/[0.07] p-3">
                <h4 className="text-[14px] font-semibold">{o.title}</h4>
                <p className="num mt-1 text-[18px] font-bold">{riyal(o.headlinePrice)}</p>
                <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-ink/65">
                  {o.terms.map((t, i) => <li key={i}>• {t}</li>)}
                </ul>
                <p className="mt-2 border-t border-black/[0.06] pt-2 text-[12px] text-ink/50">{o.bestFor}</p>
              </div>
            ))}
          </div>
        )}

        {offers.length > 0 && (
          <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-[12px] leading-relaxed text-ink/60">
            الثلاثة تساوي عندك <span className="num font-semibold">{riyal(offers[0]!.presentValue)}</span> قيمةً حالية.
            الفرق في الأرقام المعلنة ثمن المال عبر الزمن، لا تنازلاً.
          </p>
        )}

        <p className="mt-3 rounded-xl bg-danger/5 px-3 py-2 text-[13px] leading-relaxed text-danger/90">
          <strong className="font-semibold">حدّ الانسحاب:</strong> {walkAway.line}
          {' '}(إجمالاً {riyal(walkAway.total)}).
        </p>
      </Card>
      </div>

      <div className={printableClass(showScenarios)}>
      <Card title="الاستخدام الأمثل" hint="الأرض تساوي بقدر أفضل ما يُبنى عليها نظاماً، لا بقدر ما يُبنى عليها عادةً.">
        <div className="space-y-2">
          {scenarios.map((s, i) => (
            <div key={i} className="grid min-w-0 grid-cols-2 items-end gap-2 rounded-xl border border-black/[0.07] p-2 sm:grid-cols-5">
              <label className="block">
                <span className="mb-1 block text-[11px] text-ink/55">السيناريو</span>
                <input className="w-full rounded-lg border border-black/10 px-2 py-1.5 text-[13px] outline-none focus:border-brand"
                  value={s.label} onChange={(e) => setScenario(i, { label: e.target.value })} />
              </label>
              <NumberField label="معامل البناء" value={s.far} onChange={(v) => setScenario(i, { far: v })} step={0.1} />
              <NumberField label="سعر البيع" value={s.sellPricePerSqm}
                onChange={(v) => setScenario(i, { sellPricePerSqm: v })} suffix="ريال" step={50} />
              <NumberField label="تكلفة البناء" value={s.constructionCostPerSqm}
                onChange={(v) => setScenario(i, { constructionCostPerSqm: v })} suffix="ريال" step={50} />
              <button onClick={() => onScenarios(scenarios.filter((_, idx) => idx !== i))}
                className="shrink-0 pb-2.5 text-[12px] text-danger/80 hover:underline">حذف</button>
            </div>
          ))}
          <button
            onClick={() => onScenarios([...scenarios, { label: 'سيناريو جديد', far: 1.5, sellPricePerSqm: 6500, constructionCostPerSqm: 2200 }])}
            className="rounded-lg border border-brand/30 px-3 py-1.5 text-[12px] font-medium text-brand hover:bg-brand/5">
            إضافة سيناريو
          </button>
        </div>

        {ranked.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-ink/55">
                <tr className="border-b border-black/[0.07]">
                  <th className="py-2 text-right font-medium">السيناريو</th>
                  <th className="py-2 text-left font-medium">معامل البناء</th>
                  <th className="py-2 text-left font-medium">قيمة الأرض للمتر</th>
                  <th className="py-2 text-left font-medium">مقابل السوق</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.label + i} className="border-b border-black/[0.04] last:border-0">
                    <td className="py-2">
                      {r.label}
                      {i === 0 && <span className="mr-2 rounded bg-ok/10 px-1.5 py-0.5 text-[11px] text-ok">الأعلى قيمة</span>}
                    </td>
                    <td className="num py-2 text-left">{r.far}</td>
                    <td className="num py-2 text-left font-semibold">{r.feasible ? sar(r.landValuePerSqm) : 'غير مجدٍ'}</td>
                    <td className={`num py-2 text-left ${r.landValuePerSqm >= marketPerSqm ? 'text-ok' : 'text-danger'}`}>
                      {marketPerSqm > 0 && r.feasible
                        ? `${r.landValuePerSqm >= marketPerSqm ? '+' : '−'}${Math.abs(Math.round(((r.landValuePerSqm - marketPerSqm) / marketPerSqm) * 100))}٪`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[12px] leading-relaxed text-ink/55">
              السيناريو الأعلى قيمةً هو ما يحدّد ما تستحقه الأرض فعلاً — بشرط أن يسمح به نظام البناء للمخطط.
              تحقّق من الضوابط السارية قبل بناء قرارك عليه.
            </p>
          </div>
        )}
      </Card>
      </div>
    </>
  );
}
