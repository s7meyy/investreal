'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LENS_LABEL, analyzeLand, type LandSubject, type ReaderLens } from '@investreal/engine';
import { Card, NumberField, PercentField, SelectField, TextField } from '@/components/ui';
import { ObservationsEditor } from '@/components/ObservationsEditor';
import { LandResults } from '@/components/LandResults';
import { defaultLandForm, loadLand, saveLand, usableCount, type LandForm } from '@/lib/land';

const LENSES: ReaderLens[] = ['developer', 'investor', 'buyer'];

const LENS_HINT: Record<ReaderLens, string> = {
  developer: 'يُبرَز: الطاقة الاستيعابية والقيمة المتبقّية وهامش المشروع.',
  investor: 'يُبرَز: العائد بعد الرسوم، وتكلفة الانتظار، ونمو التعادل.',
  buyer: 'يُبرَز: عدالة السعر مقابل المقارنات، وما يُدفع فوق الثمن.',
};

export default function LandPage() {
  const [form, setForm] = useState<LandForm>(defaultLandForm);
  const [restored, setRestored] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    const saved = loadLand();
    if (saved) setForm(saved);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) saveLand(form);
  }, [form, restored]);

  const setSubject = <K extends keyof LandSubject>(k: K, v: LandSubject[K]) =>
    setForm((f) => ({ ...f, subject: { ...f.subject, [k]: v } }));

  const analysis = useMemo(
    () => analyzeLand({
      subject: form.subject,
      observations: form.observations,
      lens: form.lens,
      adjustments: form.adjustments,
      residual: form.residual,
      holding: form.holding,
      costs: form.costs,
    }),
    [form],
  );

  const ready = usableCount(form) > 0 && form.subject.areaSqm > 0;
  const today = new Date().toLocaleDateString('ar-SA-u-ca-gregory');

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold">تقييم أرض — تقرير سعر بثلاثة مسارات</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-ink/60">
            ما يُقال في المكاتب، وما هو معروض في التطبيقات، وما هو مُقدَّر رسمياً — مُطبَّعاً على أرضك ومُصالَحاً في نطاق واحد.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="rounded-xl border border-black/10 px-3 py-2 text-[13px] hover:bg-paper">
            دراسة جدوى إيجار
          </Link>
          <button onClick={() => window.print()} disabled={!ready}
            className="rounded-xl bg-brand px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40">
            طباعة التقرير
          </button>
        </div>
      </header>

      {/* غلاف التقرير — لا يظهر إلا عند الطباعة */}
      <section className="report-cover hidden print:block"><div>
        <h1 className="text-2xl font-bold">{form.title || 'تقرير تقييم أرض'}</h1>
        <p className="mt-2 text-[14px]">
          {form.subject.city}{form.subject.district ? ` · ${form.subject.district}` : ''} ·{' '}
          {Math.round(form.subject.areaSqm).toLocaleString('en-US')} م²
          {form.subject.planNo ? ` · مخطط ${form.subject.planNo}` : ''}
          {form.subject.parcelNo ? ` · قطعة ${form.subject.parcelNo}` : ''}
        </p>
        <p className="mt-1 text-[14px] font-medium">{analysis.recommendation.headline}</p>
        <p className="mt-4 text-[13px] text-ink/70">
          أعدّه: {form.preparedBy.name || '—'}{form.preparedBy.title ? ` · ${form.preparedBy.title}` : ''}
          {form.preparedBy.phone ? ` · ${form.preparedBy.phone}` : ''}
          {form.preparedBy.reportNo ? ` · رقم التقرير ${form.preparedBy.reportNo}` : ''}
        </p>
        <p className="text-[13px] text-ink/70">تاريخ الإصدار: {today} · صالح ٦٠ يوماً من تاريخه</p>
        <p className="mt-3 text-[12px] leading-relaxed text-ink/60">
          هذا تحليل سوقي استرشادي مبني على ملاحظات أدخلها مُعِدّه وافتراضات مذكورة داخله،
          وليس تقييماً معتمداً صادراً عن مُقيّم مرخّص، ولا يصلح وحده أساساً لتمويل أو نزاع.
        </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="space-y-4 print:hidden">
          <Card title="أرضك" hint="الصفات التي تُقاس عليها كل مقارنة.">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="المدينة" value={form.subject.city} onChange={(v) => setSubject('city', v)} />
              <TextField label="الحي" value={form.subject.district} onChange={(v) => setSubject('district', v)} placeholder="النرجس" />
              <NumberField label="المساحة" value={form.subject.areaSqm} onChange={(v) => setSubject('areaSqm', v)} suffix="م²" />
              <NumberField label="عرض أوسع شارع" value={form.subject.streetWidthM} onChange={(v) => setSubject('streetWidthM', v)} suffix="م" />
              <NumberField label="عدد الواجهات" value={form.subject.frontages} onChange={(v) => setSubject('frontages', v)} />
              <NumberField label="معامل البناء" value={form.subject.far} onChange={(v) => setSubject('far', v)} step={0.1}
                hint="إجمالي المسطحات المسموحة ÷ المساحة" />
              <SelectField label="انتظام الشكل" value={form.subject.shape}
                onChange={(v) => setSubject('shape', v)}
                options={[{ value: 'regular', label: 'منتظم' }, { value: 'irregular', label: 'غير منتظم' }]} />
              <NumberField label="الانحدار" value={form.subject.slopePct} onChange={(v) => setSubject('slopePct', v)} suffix="٪" />
              <SelectField label="الخدمات على الأرض" value={form.subject.servicesReady ? 'yes' : 'no'}
                onChange={(v) => setSubject('servicesReady', v === 'yes')}
                options={[{ value: 'yes', label: 'موصولة' }, { value: 'no', label: 'غير موصولة' }]} />
              <TextField label="التصنيف" value={form.subject.zoningLabel ?? ''} onChange={(v) => setSubject('zoningLabel', v)} placeholder="سكني" />
              <TextField label="رقم المخطط" value={form.subject.planNo ?? ''} onChange={(v) => setSubject('planNo', v)} />
              <TextField label="رقم القطعة" value={form.subject.parcelNo ?? ''} onChange={(v) => setSubject('parcelNo', v)} />
            </div>
          </Card>

          <Card title="لمن هذا التقرير؟" hint={LENS_HINT[form.lens]}>
            <div className="flex gap-2">
              {LENSES.map((l) => (
                <button key={l} onClick={() => setForm((f) => ({ ...f, lens: l }))}
                  className={`flex-1 rounded-xl border px-3 py-2 text-[13px] font-medium ${
                    form.lens === l ? 'border-brand bg-brand/5 text-brand' : 'border-black/10 text-ink/60 hover:bg-paper'
                  }`}>
                  {LENS_LABEL[l]}
                </button>
              ))}
            </div>
          </Card>

          {form.lens === 'developer' && (
            <Card title="افتراضات المشروع" hint="تكلفة البناء وسعر البيع يختلفان بالحي والتشطيب — أدخل واقع مشروعك.">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="تكلفة بناء المتر" value={form.residual.constructionCostPerSqm}
                  onChange={(v) => setForm((f) => ({ ...f, residual: { ...f.residual, constructionCostPerSqm: v } }))} suffix="ريال" step={50} />
                <NumberField label="سعر بيع المتر" value={form.residual.sellPricePerSqm}
                  onChange={(v) => setForm((f) => ({ ...f, residual: { ...f.residual, sellPricePerSqm: v } }))} suffix="ريال" step={50} />
                <PercentField label="كفاءة المسطحات" value={form.residual.efficiency}
                  onChange={(v) => setForm((f) => ({ ...f, residual: { ...f.residual, efficiency: v } }))} />
                <PercentField label="هامش المطوّر المستهدف" value={form.residual.developerProfitPct}
                  onChange={(v) => setForm((f) => ({ ...f, residual: { ...f.residual, developerProfitPct: v } }))} />
                <PercentField label="التكاليف غير المباشرة" value={form.residual.softCostsPct}
                  onChange={(v) => setForm((f) => ({ ...f, residual: { ...f.residual, softCostsPct: v } }))} />
                <NumberField label="مدّة المشروع" value={form.residual.durationMonths}
                  onChange={(v) => setForm((f) => ({ ...f, residual: { ...f.residual, durationMonths: v } }))} suffix="شهر" />
              </div>
            </Card>
          )}

          {form.lens === 'investor' && (
            <Card title="افتراضات الاحتفاظ">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="سنوات الاحتفاظ" value={form.holding.years}
                  onChange={(v) => setForm((f) => ({ ...f, holding: { ...f.holding, years: v } }))} suffix="سنة" />
                <PercentField label="النمو السنوي المتوقّع" value={form.holding.appreciation}
                  onChange={(v) => setForm((f) => ({ ...f, holding: { ...f.holding, appreciation: v } }))} />
                <PercentField label="رسوم سنوية على القيمة" value={form.holding.annualLevyPct}
                  onChange={(v) => setForm((f) => ({ ...f, holding: { ...f.holding, annualLevyPct: v } }))}
                  hint="راجع انطباق رسوم الأراضي البيضاء على نطاق أرضك" />
                <PercentField label="تكلفة الفرصة البديلة" value={form.holding.opportunityRate}
                  onChange={(v) => setForm((f) => ({ ...f, holding: { ...f.holding, opportunityRate: v } }))} />
              </div>
            </Card>
          )}

          <Card title="هويتك على التقرير" hint="التقرير يُعرض على غيرك — فليحمل اسمك ورقمه وتاريخه.">
            <div className="grid grid-cols-2 gap-3">
              <TextField label="عنوان التقرير" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))}
                placeholder="تقييم أرض النرجس" />
              <TextField label="اسمك" value={form.preparedBy.name}
                onChange={(v) => setForm((f) => ({ ...f, preparedBy: { ...f.preparedBy, name: v } }))} />
              <TextField label="الصفة" value={form.preparedBy.title}
                onChange={(v) => setForm((f) => ({ ...f, preparedBy: { ...f.preparedBy, title: v } }))} placeholder="مستشار عقاري" />
              <TextField label="رقم التواصل" value={form.preparedBy.phone}
                onChange={(v) => setForm((f) => ({ ...f, preparedBy: { ...f.preparedBy, phone: v } }))} />
              <TextField label="رقم التقرير" value={form.preparedBy.reportNo}
                onChange={(v) => setForm((f) => ({ ...f, preparedBy: { ...f.preparedBy, reportNo: v } }))} />
            </div>
          </Card>

          <button onClick={() => setAdvanced((a) => !a)} className="text-[13px] text-brand hover:underline">
            {advanced ? 'إخفاء معاملات التطبيع' : 'تعديل معاملات التطبيع'}
          </button>

          {advanced && (
            <Card title="معاملات التطبيع" hint="قيم بدء لسوق الرياض السكني — من يعرف حيّه أدرى بمعاملاته. المستعمَل منها يُطبع في التقرير.">
              <div className="grid grid-cols-2 gap-3">
                <PercentField label="نمو السوق السنوي" value={form.adjustments.annualGrowth}
                  onChange={(v) => setForm((f) => ({ ...f, adjustments: { ...f.adjustments, annualGrowth: v } }))} />
                <PercentField label="فجوة السعر المعروض" value={form.adjustments.listingAskingGap}
                  onChange={(v) => setForm((f) => ({ ...f, adjustments: { ...f.adjustments, listingAskingGap: v } }))} />
                <PercentField label="علاوة الزاوية" value={form.adjustments.cornerPremium}
                  onChange={(v) => setForm((f) => ({ ...f, adjustments: { ...f.adjustments, cornerPremium: v } }))} />
                <PercentField label="خصم الشكل غير المنتظم" value={form.adjustments.irregularShapeDiscount}
                  onChange={(v) => setForm((f) => ({ ...f, adjustments: { ...f.adjustments, irregularShapeDiscount: v } }))} />
                <PercentField label="حد استبعاد المقارنة" value={form.adjustments.exclusionThreshold}
                  onChange={(v) => setForm((f) => ({ ...f, adjustments: { ...f.adjustments, exclusionThreshold: v } }))}
                  hint="مقارنة تحتاج تعديلاً أكبر من هذا ليست مقارنة" />
                <PercentField label="مرونة معامل البناء" value={form.adjustments.farElasticity}
                  onChange={(v) => setForm((f) => ({ ...f, adjustments: { ...f.adjustments, farElasticity: v } }))} />
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <div className="print:hidden">
            <Card title="الملاحظات السعرية" hint="لا سطر بلا مصدر وتاريخ ونوع — هذا ما يفصل التقرير عن جدول الأرقام.">
              <ObservationsEditor
                observations={form.observations}
                onChange={(rows) => setForm((f) => ({ ...f, observations: rows }))}
              />
            </Card>
          </div>

          {ready ? (
            <LandResults a={analysis} lens={form.lens} />
          ) : (
            <div className="rounded-2xl border border-dashed border-black/10 px-6 py-12 text-center print:hidden">
              <p className="text-[15px] font-medium">أضف أول ملاحظة سعرية</p>
              <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-ink/55">
                سعر واحد سمعتَه في مكتب، أو إعلان رأيته في تطبيق. لا رقم قبل ذلك —
                الأداة لا تخترع قيمة من صفات الأرض وحدها.
              </p>
            </div>
          )}

          <p className="rounded-2xl bg-paper px-4 py-3 text-[12px] leading-relaxed text-ink/55">
            <strong className="font-semibold text-ink/70">حدود هذا التقرير:</strong> تحليل سوقي استرشادي،
            لا تقييم معتمد. لا يغني عن فحص الصك والقيود والرهون والارتفاقات، ولا عن التحقّق من ضوابط
            البناء السارية للمخطط، ولا عن مراجعة الرسوم والضرائب من مصادرها الرسمية عند التعاقد.
          </p>
        </div>
      </div>
    </main>
  );
}
