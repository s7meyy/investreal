'use client';
import { Card } from '@/components/ui';

/**
 * ماذا يظهر في التقرير المطبوع؟
 *
 * التقرير الذي يُعرض على مطوّر غير الذي يُعرض على مشترٍ، وما تحتاجه في
 * ورقة تفاوض ليس ما ترسله في عرض أوّلي. الأقسام تُطفأ من هنا: تبقى على
 * الشاشة لك، وتغيب عن الورق.
 */

export const SECTION_KEYS = [
  'legal', 'visuals', 'tracks', 'comparables', 'lens', 'costs',
  'trend', 'negotiation', 'scenarios', 'sensitivity', 'confidence', 'compare',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABEL: Record<SectionKey, string> = {
  legal: 'الوضع النظامي',
  visuals: 'الصور والكروكي',
  tracks: 'المسارات الثلاثة',
  comparables: 'جدول المقارنات',
  lens: 'القيمة المتبقّية / عائد الحيازة',
  costs: 'ما يُدفع فوق الثمن',
  trend: 'الاتجاه والسيولة',
  negotiation: 'ورقة التفاوض',
  scenarios: 'الاستخدام الأمثل',
  sensitivity: 'ما الذي يغيّر القيمة',
  confidence: 'الثقة والتحفّظات',
  compare: 'مقارنة الفرص',
};

const SECTION_NOTE: Partial<Record<SectionKey, string>> = {
  negotiation: 'أرقامك التفاوضية — يُنصح بإخفائها في نسخة تُرسَل للطرف الآخر',
  confidence: 'إخفاؤها يجعل التقرير يبدو أوثق مما هو',
  legal: 'الأثقل أثراً على قرار القارئ',
};

export type ReportSections = Record<SectionKey, boolean>;

export const defaultSections = (): ReportSections =>
  Object.fromEntries(SECTION_KEYS.map((k) => [k, k !== 'compare'])) as ReportSections;

/** الصنف الذي يُخفي القسم عند الطباعة دون أن يُخفيه عنك على الشاشة. */
export const printableClass = (on: boolean) => (on ? '' : 'print:hidden');

export function ReportSectionsPanel({ value, onChange }: {
  value: ReportSections; onChange: (v: ReportSections) => void;
}) {
  const on = SECTION_KEYS.filter((k) => value[k]).length;

  return (
    <Card title="أقسام التقرير" hint={`ما يظهر عند الطباعة — ${on} من ${SECTION_KEYS.length} مُفعّل. ما تُطفئه يبقى أمامك على الشاشة.`}>
      <div className="grid gap-1.5">
        {SECTION_KEYS.map((k) => (
          <label key={k} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-paper">
            <input type="checkbox" className="mt-0.5" checked={value[k]}
              onChange={(e) => onChange({ ...value, [k]: e.target.checked })} />
            <span className="min-w-0">
              <span className="block text-[13px]">{SECTION_LABEL[k]}</span>
              {SECTION_NOTE[k] && <span className="block text-[11px] leading-relaxed text-ink/45">{SECTION_NOTE[k]}</span>}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onChange(Object.fromEntries(SECTION_KEYS.map((k) => [k, true])) as ReportSections)}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-[12px] hover:bg-paper">تفعيل الكل</button>
        <button
          onClick={() => onChange(defaultSections())}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-[12px] hover:bg-paper">العودة للافتراضي</button>
      </div>
    </Card>
  );
}
