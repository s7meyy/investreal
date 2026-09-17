'use client';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnnualRow } from '@investreal/engine';
import { riyal, riyalShort } from '@/lib/format';

/**
 * التدفق النقدي التراكمي — أهم رسم في التقرير، لأنه يُظهر بصرياً
 * متى يعود رأس المال، وكم يبقى المستثمر في المنطقة السالبة.
 */
export function CashflowChart({ annual, paybackYears }: { annual: AnnualRow[]; paybackYears: number | null }) {
  const data = annual.map((r) => ({ year: r.year, cumulative: Math.round(r.cumulative) }));

  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <defs>
            <linearGradient id="cum" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d7d6b" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0d7d6b" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000010" vertical={false} />
          {/* محور معكوس ليقرأ من اليمين لليسار مع اتجاه الصفحة */}
          <XAxis dataKey="year" reversed tick={{ fontSize: 12, fill: '#0f172099' }} tickLine={false} axisLine={false} />
          <YAxis
            orientation="right"
            tickFormatter={(v: number) => riyalShort(v).replace(' ريال', '')}
            tick={{ fontSize: 11, fill: '#0f172099' }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <ReferenceLine y={0} stroke="#0f172040" />
          {paybackYears !== null && (
            <ReferenceLine
              x={Math.ceil(paybackYears)}
              stroke="#b45309"
              strokeDasharray="4 4"
              label={{ value: 'استرداد رأس المال', position: 'insideTopLeft', fontSize: 11, fill: '#b45309' }}
            />
          )}
          <Tooltip
            formatter={(v) => [riyal(Number(v)), 'التدفق التراكمي']}
            labelFormatter={(y) => (y === 0 ? 'التأسيس' : `السنة ${y}`)}
            contentStyle={{ direction: 'rtl', fontSize: 13, borderRadius: 12, border: '1px solid #0000001a' }}
          />
          <Area type="monotone" dataKey="cumulative" stroke="#0d7d6b" strokeWidth={2} fill="url(#cum)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
