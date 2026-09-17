'use client';
import { useMemo, useState } from 'react';
import { analyze, PROPERTY_PROFILES, UNKNOWN_LEGAL, type LegalAnswers, type PropertyType } from '@investreal/engine';
import { Card, NumberField, PercentField, SelectField, TextField } from '@/components/ui';
import { LegalForm } from '@/components/LegalForm';
import { Results } from '@/components/Results';
import { applyProfile, defaultForm, toOpportunity, type QuickForm } from '@/lib/opportunity';

const TYPE_OPTIONS = (Object.keys(PROPERTY_PROFILES) as PropertyType[]).map((t) => ({
  value: t,
  label: PROPERTY_PROFILES[t].label,
}));

export default function Page() {
  const [form, setForm] = useState<QuickForm>(defaultForm);
  const [legal, setLegal] = useState<LegalAnswers>(UNKNOWN_LEGAL);
  const [advanced, setAdvanced] = useState(false);

  const set = <K extends keyof QuickForm>(key: K, v: QuickForm[K]) =>
    setForm((f) => ({ ...f, [key]: v }));

  // التحليل يُعاد حسابه مع كل تغيير — النتيجة تتحدّث أثناء الكتابة.
  const opportunity = useMemo(() => toOpportunity(form, legal), [form, legal]);
  const result = useMemo(() => analyze(opportunity), [opportunity]);
  const profile = PROPERTY_PROFILES[form.propertyType];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 no-print">
        <h1 className="text-2xl font-bold sm:text-3xl">دراسة جدوى الفرص الإيجارية طويلة المدى</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink/65">
          تستأجر عقاراً لسنوات بدفعة مقدّمة وسعر أقل من السوق، ثم تُعيد تأجيره وتربح الفرق.
          تحسب لك هذه الأداة العائد الحقيقي بعد كل التكاليف، وتُخرج لك{' '}
          <strong className="font-semibold text-ink">السقف الذي لا تدفع فوقه</strong> قبل أن تفاوض.
        </p>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
        {/* عمود الإدخال */}
        <div className="no-print min-w-0 space-y-4 lg:sticky lg:top-6">
          <Card title="الفرصة" hint={profile.note}>
            <div className="grid gap-3">
              <SelectField
                label="نوع العقار"
                value={form.propertyType}
                options={TYPE_OPTIONS}
                onChange={(t) => setForm((f) => applyProfile(f, t, f.marketRentAnnual))}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="المدينة" value={form.city} onChange={(v) => set('city', v)} />
                <TextField label="الحي" value={form.district} onChange={(v) => set('district', v)} placeholder="اختياري" />
              </div>
              <NumberField
                label="إيجار السوق السنوي"
                value={form.marketRentAnnual}
                onChange={(v) => setForm((f) => applyProfile(f, f.propertyType, v))}
                suffix="ريال"
                step={1000}
                hint="ما تتوقّع تحصيله فعلاً — لا ما يقوله المالك. هذا أخطر رقم في الحساب كله."
              />
              <NumberField
                label="الإيجار التعاقدي السنوي"
                value={form.contractRentAnnual}
                onChange={(v) => set('contractRentAnnual', v)}
                suffix="ريال"
                step={500}
                hint="ما ستدفعه للمالك عن كل سنة."
              />
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="مدة العقد" value={form.termYears} onChange={(v) => set('termYears', Math.max(1, Math.min(30, v)))} suffix="سنة" />
                <SelectField
                  label="التقويم"
                  value={form.calendar}
                  options={[{ value: 'gregorian', label: 'ميلادي' }, { value: 'hijri', label: 'هجري' }]}
                  onChange={(v) => set('calendar', v)}
                />
              </div>
              <SelectField
                label="هيكل الدفع"
                value={form.paymentKind}
                options={[
                  { value: 'upfront_full', label: 'كامل المبلغ مقدّماً' },
                  { value: 'split', label: '٦٠٪ الآن و٤٠٪ بعد سنتين' },
                  { value: 'annual', label: 'سنوياً' },
                ]}
                onChange={(v) => set('paymentKind', v)}
              />
              <NumberField
                label="تكلفة التجهيز والتأثيث"
                value={form.fitout}
                onChange={(v) => set('fitout', v)}
                suffix="ريال"
                step={1000}
              />
              <PercentField
                label="تكلفة الفرصة البديلة"
                value={form.discountRate}
                onChange={(v) => set('discountRate', v)}
                hint="لو وضعتَ هذا المال في بديل آمن، كم يعطيك سنوياً؟"
              />
            </div>

            <button
              type="button"
              onClick={() => setAdvanced((a) => !a)}
              className="mt-4 w-full rounded-xl border border-black/10 py-2 text-[13px] font-medium text-ink/65 transition hover:bg-paper"
            >
              {advanced ? 'إخفاء الافتراضات التفصيلية' : 'تعديل الافتراضات التفصيلية'}
            </button>

            {advanced && (
              <div className="mt-4 grid gap-3 border-t border-black/5 pt-4">
                <PercentField label="نسبة الإشغال" value={form.occupancy} onChange={(v) => set('occupancy', v)} />
                <PercentField label="إشغال السنة الأولى" value={form.firstYearOccupancy} onChange={(v) => set('firstYearOccupancy', v)} />
                <PercentField label="نمو إيجارات السوق سنوياً" value={form.growthRate} onChange={(v) => set('growthRate', v)} />
                <NumberField
                  label="فترة السماح"
                  value={form.graceMonths}
                  onChange={(v) => set('graceMonths', Math.max(0, v))}
                  suffix="شهر"
                  hint="أشهر حيازة إضافية بنفس المبلغ — من أسهل ما يُقبل في التفاوض."
                />
                <PercentField label="الصيانة" value={form.maintenance} onChange={(v) => set('maintenance', v)} />
                <PercentField label="الإدارة والعمولات" value={form.management} onChange={(v) => set('management', v)} />
                <NumberField label="إعادة الحال آخر المدة" value={form.restoration} onChange={(v) => set('restoration', v)} suffix="ريال" step={1000} />
              </div>
            )}
          </Card>

          <Card
            title="تجزئة الفرصة"
            hint="لو دخلتَ الفرصة مع شركاء، أو أدارها مشغّل مقابل حصة."
          >
            <div className="grid gap-3">
              <NumberField
                label="عدد الأسهم"
                value={form.shares}
                onChange={(v) => set('shares', Math.max(1, Math.round(v)))}
                suffix="سهم"
                hint="١ يعني مستثمراً واحداً. التجزئة لا تغيّر العائد، بل حجم التذكرة."
              />
              <PercentField
                label="حصة المشغّل من صافي الدخل"
                value={form.operatorShare}
                onChange={(v) => set('operatorShare', Math.min(0.9, Math.max(0, v)))}
                hint="ما يأخذه من يُدير التشغيل. صفر إن كنتَ تُدير بنفسك."
              />
            </div>
          </Card>

          <Card
            title="بيانات التقرير"
            hint="تظهر على غلاف الملف المُصدَّر، ولا تدخل في أي حساب."
          >
            <div className="grid gap-3">
              <TextField
                label="عنوان الصفحة الأولى"
                value={form.reportTitle}
                onChange={(v) => set('reportTitle', v)}
                placeholder="دراسة جدوى فرصة استثمارية عقارية"
              />
              <TextField
                label="التقرير من إعداد"
                value={form.preparedBy}
                onChange={(v) => set('preparedBy', v)}
                placeholder="اكتب اسمك أو اسم جهتك"
              />
              <button
                type="button"
                onClick={() => window.print()}
                className="mt-1 w-full rounded-xl bg-brand py-3 text-[15px] font-semibold text-white transition hover:bg-brand-dark"
              >
                تحميل التقرير PDF
              </button>
              <p className="text-[12px] leading-relaxed text-ink/45">
                يفتح نافذة الطباعة — اختر «حفظ بصيغة PDF» وجهةً للحفظ.
              </p>
            </div>
          </Card>

          <Card
            title="فحص المخاطر"
            hint="كل سؤال تتركه «لا أعرف» يُحسب كخطر مرتفع — الجهل ليس أماناً."
          >
            <LegalForm value={legal} onChange={setLegal} />
          </Card>
        </div>

        {/* عمود النتائج */}
        <Results result={result} hurdle={form.discountRate} opportunity={opportunity} />
      </div>
    </main>
  );
}
