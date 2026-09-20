'use client';
import { NumberField, TextField } from './ui';
import { riyal } from '@/lib/format';

export interface UnitRow { label: string; count: number; marketRentAnnual: number }

/**
 * جدول وحدات العمارة.
 *
 * بدونه كانت العمارة تُعامَل كوحدة واحدة بإيجار واحد — نتيجة بلا معنى.
 * والتنويع الداخلي بين الوحدات هو أهم ما يميّز العمارة عن الشقة:
 * فراغ شقة من عشر لا يساوي فراغ الوحدة الوحيدة.
 */
export function UnitsEditor({ units, onChange }: {
  units: UnitRow[]; onChange: (u: UnitRow[]) => void;
}) {
  const total = units.reduce((s, u) => s + u.marketRentAnnual * u.count, 0);
  const totalCount = units.reduce((s, u) => s + u.count, 0);

  const update = (i: number, patch: Partial<UnitRow>) =>
    onChange(units.map((u, j) => (j === i ? { ...u, ...patch } : u)));

  return (
    <div className="space-y-3">
      {units.length === 0 && (
        <p className="rounded-xl bg-paper p-3 text-[12px] leading-relaxed text-ink/60">
          أضف أنواع الوحدات وإيجار كل نوع. بدونها تُحسب العمارة كوحدة واحدة،
          والنتيجة لن تعني شيئاً.
        </p>
      )}

      {units.map((u, i) => (
        <div key={i} className="min-w-0 rounded-xl bg-paper p-3">
          <div className="grid min-w-0 grid-cols-2 gap-2">
            <TextField label="نوع الوحدة" value={u.label} onChange={(v) => update(i, { label: v })} />
            <NumberField label="العدد" value={u.count} onChange={(v) => update(i, { count: Math.max(1, Math.round(v)) })} suffix="وحدة" />
          </div>
          <div className="mt-2">
            <NumberField
              label="إيجار الوحدة السنوي"
              value={u.marketRentAnnual}
              onChange={(v) => update(i, { marketRentAnnual: Math.max(0, v) })}
              suffix="ريال"
              step={1000}
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(units.filter((_, j) => j !== i))}
            className="mt-2 text-[12px] text-danger/80 hover:text-danger"
          >
            حذف هذا النوع
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...units, { label: `نوع ${units.length + 1}`, count: 1, marketRentAnnual: 30000 }])}
        className="w-full rounded-xl border border-dashed border-black/15 py-2.5 text-[13px] font-medium text-ink/65 transition hover:bg-paper"
      >
        + إضافة نوع وحدة
      </button>

      {units.length > 0 && (
        <div className="flex items-baseline justify-between rounded-xl bg-brand-light px-3 py-2.5 text-[13px]">
          <span className="text-brand-dark">
            الإجمالي: <span className="num font-semibold">{totalCount}</span> وحدة
          </span>
          <span className="num font-bold text-brand-dark">{riyal(total)}</span>
        </div>
      )}
    </div>
  );
}
