'use client';
import { analyzeLiquidity, analyzeTrend, type LiquidityInputs, type PricePoint } from '@investreal/engine';
import { Card, NumberField } from '@/components/ui';
import { pct } from '@/lib/format';

/**
 * الاتجاه والسيولة.
 *
 * المستثمر يشتري المنحنى لا النقطة، ويبيع في سوق له سرعة. الرسم هنا
 * خطّي بسيط عمداً: أربع نقاط لا تحتاج مكتبة رسم، وSVG يُطبع حادّاً.
 */

function TrendChart({ points }: { points: PricePoint[] }) {
  const rows = [...points].filter((p) => p.pricePerSqm > 0).sort((a, b) => a.year - b.year);
  if (rows.length < 2) return null;

  const w = 420, h = 150, pad = 34;
  const prices = rows.map((r) => r.pricePerSqm);
  const min = Math.min(...prices) * 0.95;
  const max = Math.max(...prices) * 1.05;
  // المحور مقلوب أفقياً: السنة الأقدم يميناً، لأن القراءة عربية
  const x = (i: number) => w - pad - (i / (rows.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const path = rows.map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(r.pricePerSqm)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="منحنى سعر المتر عبر السنوات">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e2e8f0" strokeWidth="1" />
      <path d={path} fill="none" stroke="#0f766e" strokeWidth="2" />
      {rows.map((r, i) => (
        <g key={r.year}>
          <circle cx={x(i)} cy={y(r.pricePerSqm)} r="3.5" fill="#0f766e" />
          <text x={x(i)} y={h - pad + 16} textAnchor="middle" fontSize="11" fill="#64748b">{r.year}</text>
          <text x={x(i)} y={y(r.pricePerSqm) - 9} textAnchor="middle" fontSize="11" fill="#334155">
            {Math.round(r.pricePerSqm).toLocaleString('en-US')}
          </text>
        </g>
      ))}
    </svg>
  );
}

const DIRECTION_TONE = {
  rising: 'bg-ok/10 text-ok', flat: 'bg-paper text-ink/60',
  falling: 'bg-danger/10 text-danger', unknown: 'bg-paper text-ink/50',
} as const;

const DIRECTION_LABEL = {
  rising: 'اتجاه صاعد', flat: 'شبه ثابت', falling: 'اتجاه هابط', unknown: 'لا يكفي لرسم اتجاه',
} as const;

export function TrendAndLiquidity({ points, onPoints, liquidity, onLiquidity }: {
  points: PricePoint[];
  onPoints: (p: PricePoint[]) => void;
  liquidity: LiquidityInputs;
  onLiquidity: (l: LiquidityInputs) => void;
}) {
  const t = analyzeTrend(points);
  const l = analyzeLiquidity(liquidity);
  const thisYear = new Date().getFullYear();

  const setPoint = (i: number, patch: Partial<PricePoint>) =>
    onPoints(points.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <Card title="الاتجاه والسيولة" hint="المستثمر يشتري المنحنى لا النقطة — وسوق لا يُصرّف ليس بسعره النظري.">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-2 text-[14px] font-semibold">سعر المتر عبر السنوات</h3>
          <div className="space-y-2">
            {points.map((p, i) => (
              <div key={i} className="flex min-w-0 items-end gap-2">
                <div className="w-20 shrink-0">
                  <NumberField label="السنة" value={p.year} onChange={(v) => setPoint(i, { year: v })} />
                </div>
                <div className="min-w-0 flex-1">
                  <NumberField label="سعر المتر" value={p.pricePerSqm}
                    onChange={(v) => setPoint(i, { pricePerSqm: v })} suffix="ريال" step={50} />
                </div>
                <button onClick={() => onPoints(points.filter((_, idx) => idx !== i))}
                  className="shrink-0 pb-2.5 text-[12px] text-danger/80 hover:underline">حذف</button>
              </div>
            ))}
            <button
              onClick={() => onPoints([...points, { year: thisYear - points.length, pricePerSqm: 0 }])}
              className="rounded-lg border border-brand/30 px-3 py-1.5 text-[12px] font-medium text-brand hover:bg-brand/5">
              إضافة سنة
            </button>
          </div>
        </div>

        <div className="min-w-0">
          <TrendChart points={points} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-lg px-2.5 py-1 text-[12px] font-medium ${DIRECTION_TONE[t.direction]}`}>
              {DIRECTION_LABEL[t.direction]}
            </span>
            {t.cagr !== null && (
              <span className="rounded-lg bg-paper px-2.5 py-1 text-[12px] text-ink/60">
                نمو مركّب <span className="num">{pct(t.cagr)}</span> سنوياً
              </span>
            )}
            {t.lastYearChange !== null && (
              <span className="rounded-lg bg-paper px-2.5 py-1 text-[12px] text-ink/60">
                آخر سنة <span className="num">{pct(t.lastYearChange)}</span>
              </span>
            )}
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink/65">{t.note}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="grid min-w-0 grid-cols-3 gap-2">
          <NumberField label="صفقات ٦ أشهر" value={liquidity.dealsLastSixMonths}
            onChange={(v) => onLiquidity({ ...liquidity, dealsLastSixMonths: v })} />
          <NumberField label="متوسط مدّة البيع" value={liquidity.avgDaysOnMarket}
            onChange={(v) => onLiquidity({ ...liquidity, avgDaysOnMarket: v })} suffix="يوم" />
          <NumberField label="إعلانات قائمة" value={liquidity.activeListings}
            onChange={(v) => onLiquidity({ ...liquidity, activeListings: v })} />
        </div>
        <div className="rounded-xl bg-paper px-3 py-2">
          <div className="text-[13px] font-semibold">{l.label}</div>
          {l.monthsOfSupply !== null && (
            <div className="text-[12px] text-ink/60">
              شهور التصريف المقدّرة: <span className="num">{l.monthsOfSupply.toFixed(1)}</span>
            </div>
          )}
          <p className="mt-1 text-[12px] leading-relaxed text-ink/60">{l.note}</p>
        </div>
      </div>
    </Card>
  );
}
