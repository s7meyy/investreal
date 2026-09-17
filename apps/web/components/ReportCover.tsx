'use client';
import type { AnalysisResult, Opportunity } from '@investreal/engine';
import { pct, riyal } from '@/lib/format';

import type { Grade } from '@investreal/engine';

const GRADE_LABEL: Record<Grade, string> = {
  excellent: 'ممتازة', very_good: 'جيدة جداً', good: 'جيدة',
  marginal: 'حدّية', weak: 'ضعيفة', rejected: 'مرفوضة',
};

/** لون الحكم يتبع الحكم: «مرفوضة» بالأخضر تُناقض نفسها. */
const GRADE_COLOR: Record<Grade, string> = {
  excellent: 'text-brand-dark', very_good: 'text-brand-dark', good: 'text-emerald-800',
  marginal: 'text-amber-800', weak: 'text-orange-800', rejected: 'text-red-800',
};

/**
 * غلاف التقرير — يظهر فقط عند الطباعة/التصدير.
 *
 * صفحة واحدة تحمل: العنوان، مُعدّ التقرير، تاريخه، وخلاصة القرار.
 * من يستلم التقرير يجب أن يعرف من أعدّه ومتى وما خلاصته قبل أن يقلب صفحة.
 */
export function ReportCover({ opportunity, result }: {
  opportunity: Opportunity; result: AnalysisResult;
}) {
  const meta = opportunity.report;
  const today = new Date();
  const gregorian = today.toLocaleDateString('ar-SA-u-ca-gregory', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const hijri = today.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <section className="report-cover hidden px-2">
      <div className="flex h-full flex-col justify-between">
        <div>
          <div className="mb-10 h-1.5 w-24 rounded-full bg-brand" />
          <h1 className="text-4xl font-bold leading-snug break-words">{meta?.title}</h1>
          <p className="mt-4 text-lg text-ink/60">
            {opportunity.property.city}
            {opportunity.property.district ? ` — ${opportunity.property.district}` : ''}
            {' · '}
            مدة {opportunity.deal.termYears} سنة
            {opportunity.deal.calendar === 'hijri' ? ' هجرية' : ' ميلادية'}
          </p>
        </div>

        <div className="rounded-2xl bg-paper p-7">
          <span className="text-sm text-ink/55">خلاصة القرار</span>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <span className={`text-4xl font-bold ${GRADE_COLOR[result.verdict.grade]}`}>
              {GRADE_LABEL[result.verdict.grade]}
            </span>
            <div className="text-left">
              <span className="block text-sm text-ink/55">العائد الداخلي</span>
              <span className="num text-3xl font-bold">{pct(result.metrics.irr)}</span>
            </div>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-ink/75">{result.verdict.reason}</p>
          <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-black/10 pt-4 text-sm">
            <div>
              <dt className="text-ink/55">رأس المال</dt>
              <dd className="num mt-0.5 font-semibold">{riyal(result.metrics.capitalInvested)}</dd>
            </div>
            <div>
              <dt className="text-ink/55">صافي الربح</dt>
              <dd className="num mt-0.5 font-semibold">{riyal(result.metrics.totalNet)}</dd>
            </div>
            <div>
              <dt className="text-ink/55">درجة المخاطرة</dt>
              <dd className="num mt-0.5 font-semibold">{result.risk.score}/100</dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-black/10 pt-6 text-sm">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <span className="block text-ink/55">التقرير من إعداد</span>
              <span className="mt-0.5 block text-lg font-semibold">
                {meta?.preparedBy || '—'}
              </span>
            </div>
            <div className="text-left">
              <span className="block text-ink/55">تاريخ الإعداد</span>
              <span className="mt-0.5 block">{gregorian}</span>
              <span className="block text-ink/55">{hijri}</span>
            </div>
          </div>
          <p className="mt-6 text-[11px] leading-relaxed text-ink/45">
            هذا التقرير أداة تحليل كمّي مبنية على افتراضات أُدخلت يدوياً، وليس استشارة
            مالية أو قانونية أو شرعية، ولا يُغني عن الفحص الميداني والمراجعة القانونية
            للعقد والتحقق من الأنظمة السارية عند تاريخ التعاقد.
          </p>
        </div>
      </div>
    </section>
  );
}
