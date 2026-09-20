'use client';
import { Card } from './ui';

/**
 * حالة فارغة بدل لوحة كاملة من «خسارة» و«مرفوضة».
 * عرض نتائج على مدخلات ناقصة ليس صدقاً، بل ضجيج يُفقد الثقة.
 */
export function EmptyState() {
  return (
    <Card className="border-dashed">
      <div className="py-10 text-center">
        <h2 className="text-lg font-semibold">أدخل رقمين لتبدأ</h2>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-ink/55">
          <strong className="font-semibold text-ink/75">إيجار السوق السنوي</strong> —
          ما تتوقّع تحصيله فعلاً، و
          <strong className="font-semibold text-ink/75">الإيجار التعاقدي</strong> —
          ما ستدفعه للمالك. الباقي له افتراضات جاهزة تُعدّلها متى شئت.
        </p>
      </div>
    </Card>
  );
}
