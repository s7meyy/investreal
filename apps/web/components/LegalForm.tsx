'use client';
import type { Answer, LegalAnswers } from '@investreal/engine';

const QUESTIONS: { key: keyof LegalAnswers; label: string }[] = [
  { key: 'subleaseExplicit', label: 'هل ينصّ العقد صراحةً على حقك في التأجير من الباطن؟' },
  { key: 'ownershipClear', label: 'هل الملكية مفرزة وغير متنازع عليها؟' },
  { key: 'notWaqf', label: 'هل تأكّدت أن العقار ليس وقفاً؟' },
  { key: 'titleUnencumbered', label: 'هل الصك خالٍ من الرهن؟' },
  { key: 'registered', label: 'هل سيُسجَّل العقد رسمياً قبل تسليم أي مبلغ؟' },
  { key: 'survivesSale', label: 'هل ينصّ العقد على استمراره إذا باع المالك العقار؟' },
  { key: 'earlyTerminationCompensation', label: 'هل هناك تعويض عادل إن أنهى المالك العقد مبكراً؟' },
  { key: 'assignable', label: 'هل يحق لك التنازل عن العقد لطرف آخر؟' },
  { key: 'signerVerified', label: 'هل تحقّقت من أن الموقّع هو المالك أو وكيل بوكالة سارية؟' },
  { key: 'marketRentVerified', label: 'هل تحقّقت من إيجار السوق بعقود موثّقة (لا إعلانات)؟' },
  { key: 'compliant', label: 'هل العقار خالٍ من المخالفات البلدية وله شهادة إشغال؟' },
  { key: 'structuralOnOwner', label: 'هل الصيانة الإنشائية على المالك؟' },
  { key: 'inspected', label: 'هل أجريتَ فحصاً هندسياً؟' },
  { key: 'insured', label: 'هل هناك تأمين ساري على المنشأة؟' },
  { key: 'renewalOption', label: 'هل لديك خيار تمديد بسعر محدّد مسبقاً؟' },
  { key: 'purchaseOption', label: 'هل لديك حق شفعة أو خيار شراء؟' },
];

const CHOICES: { value: Answer; label: string }[] = [
  { value: 'yes', label: 'نعم' },
  { value: 'no', label: 'لا' },
  { value: 'unknown', label: 'لا أعرف' },
];

export function LegalForm({ value, onChange }: {
  value: LegalAnswers; onChange: (v: LegalAnswers) => void;
}) {
  const answered = QUESTIONS.filter((q) => value[q.key] !== 'unknown').length;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(answered / QUESTIONS.length) * 100}%` }} />
        </div>
        <span className="num shrink-0 text-[12px] text-ink/55">{answered}/{QUESTIONS.length}</span>
      </div>

      <ul className="space-y-3">
        {QUESTIONS.map((q) => (
          <li key={q.key} className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-3 last:border-0">
            <span className="flex-1 text-[13px] leading-relaxed text-ink/80">{q.label}</span>
            <div className="flex shrink-0 gap-1 rounded-lg bg-paper p-0.5">
              {CHOICES.map((c) => {
                const active = value[q.key] === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => onChange({ ...value, [q.key]: c.value })}
                    className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition ${
                      active ? 'bg-white text-brand-dark shadow-sm' : 'text-ink/50 hover:text-ink/80'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
