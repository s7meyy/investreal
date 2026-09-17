import type { Opportunity } from './types.js';
import { totalMarketRentAnnual } from './cashflow.js';

/**
 * قواعد صحّة تمنع التقارير المضلّلة.
 * تقرير جميل مبني على مُدخَل خاطئ أخطر من عدم وجود تقرير أصلاً.
 */
export function validate(o: Opportunity): string[] {
  const w: string[] = [];
  const market = totalMarketRentAnnual(o);

  if (market <= 0) w.push('لم تُدخل إيجار سوق — كل النتائج ستكون بلا معنى.');

  if (o.deal.contractRentAnnual > 0 && market / o.deal.contractRentAnnual > 3) {
    w.push('الفرق بين إيجار السوق والإيجار التعاقدي يتجاوز ثلاثة أضعاف — تأكّد أنك تقارن نفس الوحدة والحالة والخدمات، واسأل عن سبب تنازل المالك عن هذا المبلغ.');
  }
  if (o.costs.fitout === 0 && ['apartment', 'floor', 'villa', 'rest_house'].includes(o.property.type)) {
    w.push('تكلفة التجهيز صفر لعقار سكني — أكّد أن الوحدة جاهزة للتأجير فعلاً بلا أي إنفاق.');
  }
  if (o.revenue.occupancy > 0.97 && o.deal.termYears > 5) {
    w.push(`إشغال ${Math.round(o.revenue.occupancy * 100)}٪ على مدى ${o.deal.termYears} سنوات افتراض متفائل جداً — جرّب ٩٠٪ وانظر الفرق.`);
  }
  if (o.revenue.growthRate > 0.06) {
    w.push('نمو إيجارات يتجاوز ٦٪ سنوياً لعقد طويل افتراض جريء؛ راجع سقوف النمو التنظيمية إن وُجدت في مدينتك.');
  }
  if (o.finance.discountRate < 0.04) {
    w.push('تكلفة الفرصة البديلة منخفضة جداً — إن كانت أقل من عائد بديل آمن متاح لك، فالنتيجة ستبدو أفضل مما هي.');
  }
  if (o.deal.calendar === 'hijri') {
    w.push(`العقد بالتقويم الهجري: «${o.deal.termYears} سنوات» هنا أقصر من الميلادية بنحو ${Math.round(o.deal.termYears * 10.88)} يوماً، والحساب يأخذ ذلك في الاعتبار.`);
  }
  if (o.legal.marketRentVerified !== 'yes') {
    w.push('لم تُثبت التحقق من إيجار السوق بعقود موثّقة — وهو أخطر مُدخَل في التحليل كله.');
  }
  return w;
}
