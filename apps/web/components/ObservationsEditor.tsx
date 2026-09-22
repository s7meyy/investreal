'use client';
import { KIND_LABEL, TRACK_LABEL, type ObservationKind, type PriceObservation, type PriceTrack } from '@investreal/engine';
import { newObservation } from '@/lib/land';

/**
 * إدخال الملاحظات السعرية — قلب الأداة.
 *
 * كل سطر يُلزم بثلاثة حقول: المصدر، والتاريخ، ونوع الملاحظة. بدونها
 * لا يكون ما بين يديك تقريراً بل جدول أرقام. ولهذا لا يوجد «إدخال سريع»
 * يتجاوزها: الحقل الذي يبدو عبئاً هنا هو ما يجعل الرقم قابلاً للدفاع عنه.
 */

const KIND_BY_TRACK: Record<PriceTrack, ObservationKind[]> = {
  field: ['deal_registered', 'deal_reported', 'opinion'],
  app: ['listing', 'deal_reported'],
  official: ['official_tariff', 'deal_registered'],
};

const TRACK_HINT: Record<PriceTrack, string> = {
  field: 'ما رأيته وسمعته في المكاتب والزيارة الميدانية — سعر التفاوض الحيّ.',
  app: 'ما هو معروض في التطبيقات. سعر طلب لا سعر بيع، ويُخصم منه تلقائياً بحسب عمر الإعلان.',
  official: 'التقدير الرسمي أو التنفيذي. يُعرض للمقارنة ولا يدخل في القيمة السوقية.',
};

const PROXIMITY_OPTIONS = [
  { value: 'same_block', label: 'المخطط نفسه' },
  { value: 'same_district', label: 'الحي نفسه' },
  { value: 'adjacent_district', label: 'حي مجاور' },
  { value: 'same_city', label: 'المدينة نفسها' },
] as const;

const RELIABILITY_OPTIONS = [
  { value: 'high', label: 'موثوق' },
  { value: 'medium', label: 'متوسط' },
  { value: 'low', label: 'ضعيف' },
] as const;

function Row({ o, onChange, onRemove }: {
  o: PriceObservation; onChange: (o: PriceObservation) => void; onRemove: () => void;
}) {
  const set = <K extends keyof PriceObservation>(k: K, v: PriceObservation[K]) => onChange({ ...o, [k]: v });
  const cell = 'rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[13px] outline-none focus:border-brand';
  const missing = !o.source.trim() || o.pricePerSqm <= 0;

  return (
    <div className={`rounded-xl border p-3 ${missing ? 'border-amber-300 bg-amber-50/40' : 'border-black/[0.07] bg-paper'}`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="col-span-2 block">
          <span className="mb-1 block text-[11px] text-ink/55">المصدر</span>
          <input className={`w-full ${cell}`} value={o.source} placeholder="اسم المكتب أو التطبيق أو النشرة"
            onChange={(e) => set('source', e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-ink/55">نوع الملاحظة</span>
          <select className={`w-full ${cell}`} value={o.kind} onChange={(e) => set('kind', e.target.value as ObservationKind)}>
            {KIND_BY_TRACK[o.track].map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-ink/55">تاريخ الملاحظة</span>
          <input type="date" className={`w-full ${cell} num`} value={o.observedAt}
            onChange={(e) => set('observedAt', e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-ink/55">سعر المتر</span>
          <input type="number" className={`w-full ${cell} num`} value={o.pricePerSqm || ''}
            onChange={(e) => set('pricePerSqm', Number(e.target.value) || 0)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-ink/55">المساحة م²</span>
          <input type="number" className={`w-full ${cell} num`} value={o.areaSqm || ''}
            onChange={(e) => set('areaSqm', Number(e.target.value) || 0)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-ink/55">القرب</span>
          <select className={`w-full ${cell}`} value={o.proximity}
            onChange={(e) => set('proximity', e.target.value as PriceObservation['proximity'])}>
            {PROXIMITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] text-ink/55">ثقتك بالمصدر</span>
          <select className={`w-full ${cell}`} value={o.reliability}
            onChange={(e) => set('reliability', e.target.value as PriceObservation['reliability'])}>
            {RELIABILITY_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
      </div>

      <details className="mt-2">
        <summary className="cursor-pointer text-[12px] text-ink/50">صفات القطعة (تُحسّن التطبيع)</summary>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-[11px] text-ink/55">عرض الشارع</span>
            <input type="number" className={`w-full ${cell} num`} value={o.streetWidthM ?? ''}
              onChange={(e) => set('streetWidthM', e.target.value === '' ? undefined : Number(e.target.value))} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-ink/55">الواجهات</span>
            <input type="number" className={`w-full ${cell} num`} value={o.frontages ?? ''}
              onChange={(e) => set('frontages', e.target.value === '' ? undefined : Number(e.target.value))} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-ink/55">معامل البناء</span>
            <input type="number" step="0.1" className={`w-full ${cell} num`} value={o.far ?? ''}
              onChange={(e) => set('far', e.target.value === '' ? undefined : Number(e.target.value))} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-ink/55">الانحدار ٪</span>
            <input type="number" className={`w-full ${cell} num`} value={o.slopePct ?? ''}
              onChange={(e) => set('slopePct', e.target.value === '' ? undefined : Number(e.target.value))} />
          </label>
          {o.kind === 'listing' && (
            <label className="block">
              <span className="mb-1 block text-[11px] text-ink/55">عمر الإعلان (يوم)</span>
              <input type="number" className={`w-full ${cell} num`} value={o.listingAgeDays ?? ''}
                onChange={(e) => set('listingAgeDays', e.target.value === '' ? undefined : Number(e.target.value))} />
            </label>
          )}
          <label className="col-span-2 block sm:col-span-3">
            <span className="mb-1 block text-[11px] text-ink/55">ملاحظة</span>
            <input className={`w-full ${cell}`} value={o.note ?? ''} placeholder="ما يستحق أن يُذكر في التقرير"
              onChange={(e) => set('note', e.target.value)} />
          </label>
        </div>
      </details>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-ink/45">
          {missing ? 'ينقص هذا السطر مصدر أو سعر — لن يدخل الحساب' : `${KIND_LABEL[o.kind]} · ${o.source}`}
        </span>
        <button onClick={onRemove} className="text-[12px] text-danger/80 hover:underline">حذف</button>
      </div>
    </div>
  );
}

export function ObservationsEditor({ observations, onChange }: {
  observations: PriceObservation[];
  onChange: (rows: PriceObservation[]) => void;
}) {
  const add = (track: PriceTrack) => onChange([...observations, newObservation(track)]);
  const update = (o: PriceObservation) => onChange(observations.map((r) => (r.id === o.id ? o : r)));
  const remove = (id: string) => onChange(observations.filter((r) => r.id !== id));

  return (
    <div className="space-y-5">
      {(['field', 'app', 'official'] as PriceTrack[]).map((track) => {
        const rows = observations.filter((o) => o.track === track);
        return (
          <div key={track}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[14px] font-semibold">{TRACK_LABEL[track]}</h3>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink/50">{TRACK_HINT[track]}</p>
              </div>
              <button onClick={() => add(track)}
                className="shrink-0 rounded-lg border border-brand/30 px-3 py-1.5 text-[12px] font-medium text-brand hover:bg-brand/5">
                إضافة
              </button>
            </div>
            {rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-black/10 px-3 py-4 text-center text-[12px] text-ink/40">
                لا توجد ملاحظات في هذا المسار
              </p>
            ) : (
              <div className="space-y-2">
                {rows.map((o) => (
                  <Row key={o.id} o={o} onChange={update} onRemove={() => remove(o.id)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
