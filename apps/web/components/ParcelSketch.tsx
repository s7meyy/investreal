'use client';

/**
 * كروكي الأرض: رسم بمقياس من الأبعاد الأربعة.
 *
 * ليس زخرفاً. قارئ التقرير لا يتصوّر «٧٥٠م² بواجهة ٢٥م» حتى يراها،
 * والرسم يكشف ما يخفيه الرقم: قطعة طويلة ضيّقة ليست كقطعة مربّعة بنفس
 * المساحة، وفرق المساحة بين الصك والأبعاد يظهر هنا قبل أن يظهر في الحقل.
 *
 * SVG لا صورة: يُطبع حادّاً في PDF مهما كبر، بلا أي ملف خارجي.
 */

export interface ParcelDims {
  north: number;
  south: number;
  east: number;
  west: number;
  /** الضلع (أو الأضلاع) المطلّة على شارع */
  streetSides: ('north' | 'south' | 'east' | 'west')[];
}

export const SIDE_LABEL = { north: 'شمال', south: 'جنوب', east: 'شرق', west: 'غرب' } as const;

/** مساحة شبه المنحرف: متوسط العرضين × متوسط العمقين. تقريب يكفي للكروكي. */
export function sketchArea(d: ParcelDims): number {
  const width = (d.north + d.south) / 2;
  const depth = (d.east + d.west) / 2;
  return width * depth;
}

export function ParcelSketch({ dims, areaSqm, label }: {
  dims: ParcelDims; areaSqm: number; label?: string;
}) {
  const { north, south, east, west } = dims;
  if ([north, south, east, west].some((v) => !(v > 0))) {
    return (
      <p className="rounded-xl border border-dashed border-black/10 px-3 py-6 text-center text-[13px] text-ink/45">
        أدخل الأبعاد الأربعة ليُرسم الكروكي بمقياسه
      </p>
    );
  }

  // المقياس: أطول ضلع يملأ الرسم، فتبقى النسب صادقة بين القطع المختلفة.
  const pad = 58;
  const box = 360;
  const maxDim = Math.max(north, south, east, west);
  const unit = (box - pad * 2) / maxDim;

  const topW = north * unit;
  const botW = south * unit;
  const leftH = west * unit;
  const rightH = east * unit;

  const cx = box / 2;
  // الضلعان الرأسيان قد يختلفان طولاً، فتنزل كل زاوية سفلية بعمقها هي
  const xTopL = cx - topW / 2, xTopR = cx + topW / 2;
  const xBotL = cx - botW / 2, xBotR = cx + botW / 2;
  const yTop = pad;
  const yBotL = yTop + leftH;
  const yBotR = yTop + rightH;

  const points = `${xTopL},${yTop} ${xTopR},${yTop} ${xBotR},${yBotR} ${xBotL},${yBotL}`;
  const height = Math.max(yBotL, yBotR) + pad;

  const computed = sketchArea(dims);
  const drift = areaSqm > 0 ? (computed - areaSqm) / areaSqm : 0;
  const onStreet = (side: keyof typeof SIDE_LABEL) => dims.streetSides.includes(side);
  const sideStroke = (side: keyof typeof SIDE_LABEL) => (onStreet(side) ? '#0f766e' : '#94a3b8');
  const sideWidth = (side: keyof typeof SIDE_LABEL) => (onStreet(side) ? 4 : 1.5);
  const num = (v: number) => `${v.toLocaleString('en-US')} م`;

  return (
    <div>
      <svg viewBox={`0 0 ${box} ${height}`} className="w-full" role="img"
        aria-label={`كروكي الأرض: شمال ${north} متر، جنوب ${south} متر، شرق ${east} متر، غرب ${west} متر`}>
        <polygon points={points} fill="#0f766e0d" stroke="#0f766e" strokeWidth={1.5} />

        {/* الأضلاع: المطلّ على شارع يُغلَّظ ويُلوَّن */}
        <line x1={xTopL} y1={yTop} x2={xTopR} y2={yTop} stroke={sideStroke('north')} strokeWidth={sideWidth('north')} />
        <line x1={xBotL} y1={yBotL} x2={xBotR} y2={yBotR} stroke={sideStroke('south')} strokeWidth={sideWidth('south')} />
        <line x1={xTopR} y1={yTop} x2={xBotR} y2={yBotR} stroke={sideStroke('east')} strokeWidth={sideWidth('east')} />
        <line x1={xTopL} y1={yTop} x2={xBotL} y2={yBotL} stroke={sideStroke('west')} strokeWidth={sideWidth('west')} />

        {/* الأبعاد */}
        <text x={cx} y={yTop - 14} textAnchor="middle" fontSize="13" fill="#334155">
          {SIDE_LABEL.north} · {num(north)}{onStreet('north') && ' · شارع'}
        </text>
        <text x={cx} y={Math.max(yBotL, yBotR) + 26} textAnchor="middle" fontSize="13" fill="#334155">
          {SIDE_LABEL.south} · {num(south)}{onStreet('south') && ' · شارع'}
        </text>
        {/* الضلعان الرأسيان: النص يدور مع الضلع بدل أن يزاحم الرسم */}
        <text x={xTopR + 16} y={(yTop + yBotR) / 2} textAnchor="middle" fontSize="13" fill="#334155"
          transform={`rotate(-90 ${xTopR + 16} ${(yTop + yBotR) / 2})`}>
          {SIDE_LABEL.east} · {num(east)}{onStreet('east') && ' · شارع'}
        </text>
        <text x={xTopL - 16} y={(yTop + yBotL) / 2} textAnchor="middle" fontSize="13" fill="#334155"
          transform={`rotate(-90 ${xTopL - 16} ${(yTop + yBotL) / 2})`}>
          {SIDE_LABEL.west} · {num(west)}{onStreet('west') && ' · شارع'}
        </text>

        {/* المساحة في القلب */}
        <text x={cx} y={(yTop + Math.max(yBotL, yBotR)) / 2 - 4} textAnchor="middle" fontSize="16" fontWeight="700" fill="#0f172a">
          {Math.round(areaSqm).toLocaleString('en-US')} م²
        </text>
        {label && (
          <text x={cx} y={(yTop + Math.max(yBotL, yBotR)) / 2 + 16} textAnchor="middle" fontSize="12" fill="#64748b">
            {label}
          </text>
        )}

        {/* سهم الشمال */}
        <g transform={`translate(${box - 26}, 26)`}>
          <line x1="0" y1="14" x2="0" y2="-10" stroke="#64748b" strokeWidth="1.5" />
          <polygon points="0,-16 -4.5,-7 4.5,-7" fill="#64748b" />
          <text x="0" y="26" textAnchor="middle" fontSize="11" fill="#64748b">ش</text>
        </g>
      </svg>

      <p className="mt-1 text-[12px] leading-relaxed text-ink/55">
        مساحة الأبعاد ≈ <span className="num">{Math.round(computed).toLocaleString('en-US')}</span> م²
        {Math.abs(drift) > 0.05 && areaSqm > 0 && (
          <span className="text-danger">
            {' '}— تختلف عن المساحة المُدخلة بـ<span className="num">{Math.abs(Math.round(drift * 100))}٪</span>.
            فرق الصك عن الواقع بند تفاوضي، فتحقّق منه قبل إصدار التقرير.
          </span>
        )}
      </p>
    </div>
  );
}
