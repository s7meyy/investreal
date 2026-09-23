'use client';
import { compareOpportunities, type ComparisonEntry } from '@investreal/engine';
import { Card } from '@/components/ui';

/**
 * مقارنة الفرص جنباً إلى جنب.
 *
 * المفاضلة بين أرضين لا تُحسم بسعر المتر: قطعة أغلى بمعامل بناء أعلى قد
 * تكون أرخص فعلياً. العمود الحاسم هنا «سعر الأرض لكل متر مبيع».
 */
export function CaseCompare({ entries, onRemove, onSave, canSave }: {
  entries: ComparisonEntry[];
  onRemove: (id: string) => void;
  onSave: () => void;
  canSave: boolean;
}) {
  const rows = compareOpportunities(entries);
  const sar = (v: number) => Math.round(v).toLocaleString('en-US');

  return (
    <Card title="مقارنة الفرص" hint="احفظ الأرض الحالية ثم انتقل إلى أرض أخرى — تُقارَنان هنا بالأرقام لا بالانطباع.">
      <button onClick={onSave} disabled={!canSave}
        className="rounded-lg border border-brand/30 px-3 py-1.5 text-[12px] font-medium text-brand hover:bg-brand/5 disabled:opacity-40">
        حفظ الأرض الحالية في المقارنة
      </button>

      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink/50">لم تُحفظ فرص بعد.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-ink/55">
              <tr className="border-b border-black/[0.07]">
                <th className="py-2 text-right font-medium">الفرصة</th>
                <th className="py-2 text-left font-medium">سعر السوق</th>
                <th className="py-2 text-left font-medium">ما يحتمله المشروع</th>
                <th className="py-2 text-left font-medium">الفائض</th>
                <th className="py-2 text-left font-medium">لكل متر مبيع</th>
                <th className="py-2 text-left font-medium">الحكم</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-b border-black/[0.04] last:border-0 ${r.hasBlocker ? 'opacity-70' : ''}`}>
                  <td className="py-2">
                    {r.rank === 1 && !r.hasBlocker && (
                      <span className="ml-2 rounded bg-ok/10 px-1.5 py-0.5 text-[11px] text-ok">الأفضل</span>
                    )}
                    <span className="font-medium">{r.label}</span>
                    <span className="block text-[11px] text-ink/45">
                      {r.subject.district || r.subject.city} · <span className="num">{sar(r.subject.areaSqm)}</span> م²
                      {' '}· معامل <span className="num">{r.subject.far}</span>
                    </span>
                  </td>
                  <td className="num py-2 text-left">{sar(r.marketPerSqm)}</td>
                  <td className="num py-2 text-left">{r.residualPerSqm > 0 ? sar(r.residualPerSqm) : 'غير مجدٍ'}</td>
                  <td className={`num py-2 text-left font-semibold ${r.headroom >= 0 ? 'text-ok' : 'text-danger'}`}>
                    {r.headroom >= 0 ? '+' : '−'}{Math.abs(Math.round(r.headroom * 100))}٪
                  </td>
                  <td className="num py-2 text-left">{sar(r.landCostPerSaleableSqm)}</td>
                  <td className="py-2 text-[12px] text-ink/65">{r.verdict}</td>
                  <td className="py-2 text-left">
                    <button onClick={() => onRemove(r.id)} className="text-[12px] text-danger/80 hover:underline">حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
