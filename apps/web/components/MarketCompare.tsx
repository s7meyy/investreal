'use client';
import { useState } from 'react';
import { summarize, type MarketComparable, type MarketEstimate, type PropertyType } from '@investreal/engine';
import { riyal } from '@/lib/format';

const CONFIDENCE_LABEL = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' } as const;

/**
 * مُدخِل مقارنات السوق.
 *
 * تحليل الحساسية يقول إن إيجار السوق أقوى عامل في العائد، وهو في الوقت نفسه
 * المُدخَل الذي يقدّره المستخدم بأضعف أساس: كلام المالك أو إعلان متفائل.
 * إلى أن تُوصَل مصادر البيانات، هذا المُدخِل يجعله يبني الرقم من مشاهدات
 * فعلية ويرى وسيطها ونطاقها — ويميّز العقد الموثّق عن سعر الإعلان.
 */
export function MarketCompare({ propertyType, city, district, onApply }: {
  propertyType: PropertyType; city: string; district: string;
  onApply: (rentAnnual: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MarketComparable[]>([]);

  const estimate: MarketEstimate | null =
    rows.length > 0
      ? summarize({ city, district, propertyType }, rows, ['إدخالك المباشر'])
      : null;

  const add = () =>
    setRows([...rows, { rentAnnual: 30000, source: 'معاينة', kind: 'contract' }]);

  const update = (i: number, patch: Partial<MarketComparable>) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); if (rows.length === 0) add(); }}
        className="mt-1 w-full rounded-xl border border-black/10 py-2 text-[13px] font-medium text-ink/65 transition hover:bg-paper"
      >
        قارن بعقود السوق التي رأيتها
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl bg-paper p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-[13px] font-semibold">عقود مماثلة رأيتها</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-[12px] text-ink/50">
          إغلاق
        </button>
      </div>

      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              type="number"
              className="num w-full min-w-0 rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[14px] outline-none focus:border-brand"
              value={r.rentAnnual}
              step={1000}
              onChange={(e) => update(i, { rentAnnual: Number(e.target.value) })}
            />
            <select
              className="shrink-0 rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[12px] outline-none focus:border-brand"
              value={r.kind}
              onChange={(e) => update(i, { kind: e.target.value as MarketComparable['kind'] })}
            >
              <option value="contract">عقد موثّق</option>
              <option value="listing">سعر إعلان</option>
            </select>
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              className="shrink-0 px-1 text-[16px] leading-none text-ink/35 hover:text-danger"
              aria-label="حذف"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={add}
        className="mt-2 w-full rounded-lg border border-dashed border-black/15 py-1.5 text-[12px] text-ink/60"
      >
        + إضافة مشاهدة
      </button>

      {estimate && (
        <div className="mt-3 rounded-xl bg-white p-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-ink/55">الوسيط</span>
            <span className="num text-[17px] font-bold">{riyal(estimate.medianRentAnnual)}</span>
          </div>
          <div className="num mt-1 text-[12px] text-ink/50">
            النطاق {Math.round(estimate.p25RentAnnual).toLocaleString('en-US')}–
            {Math.round(estimate.p75RentAnnual).toLocaleString('en-US')}
          </div>
          <div className="mt-1 text-[12px] text-ink/50">
            {estimate.sampleSize} مشاهدة · {Math.round(estimate.contractShare * 100)}٪ عقود موثّقة ·
            ثقة {CONFIDENCE_LABEL[estimate.confidence]}
          </div>
          {estimate.confidence === 'low' && (
            <p className="mt-2 text-[11px] leading-relaxed text-amber-800">
              عيّنة صغيرة أو غالبها إعلانات — الإعلان سعر مطلوب لا سعر مُبرم،
              وغالباً أعلى من الواقع.
            </p>
          )}
          <button
            type="button"
            onClick={() => onApply(Math.round(estimate.medianRentAnnual))}
            className="mt-3 w-full rounded-lg bg-brand py-2 text-[13px] font-semibold text-white"
          >
            اعتمد الوسيط في الحساب
          </button>
        </div>
      )}
    </div>
  );
}
