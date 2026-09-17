/**
 * التقويم المزدوج.
 *
 * عقود الإيجار في السعودية تُحرَّر هجرية أو ميلادية، والفرق ليس تجميلياً:
 * السنة الهجرية ٣٥٤٫٣٦٧ يوماً والميلادية ٣٦٥٫٢٤٢٥ — أي أن «عشر سنوات هجرية»
 * أقصر من الميلادية بنحو ١٠٩ أيام (ثلث سنة). على مدى ٣٠ سنة يبلغ الفرق نحو سنة كاملة.
 *
 * المحرّك يحسب الإيرادات بالزمن الحقيقي (فالمستأجر يدفع مقابل أيام فعلية)
 * بينما الالتزام التعاقدي يُحسب بسنوات تقويم العقد. لذلك عقد هجري بنفس
 * عدد «السنوات» يعطي المستثمر إيراداً أقل — وهذا ما يجب أن يظهر في العائد.
 */

export const SOLAR_YEAR_DAYS = 365.2425;
export const HIJRI_YEAR_DAYS = 354.36707;

export const SOLAR_MONTH_DAYS = SOLAR_YEAR_DAYS / 12;
export const HIJRI_MONTH_DAYS = HIJRI_YEAR_DAYS / 12;

import type { Calendar } from './types.js';

/** طول الشهر بالأيام في التقويم المختار. */
export function monthDays(calendar: Calendar): number {
  return calendar === 'hijri' ? HIJRI_MONTH_DAYS : SOLAR_MONTH_DAYS;
}

/** طول السنة بالأيام في التقويم المختار. */
export function yearDays(calendar: Calendar): number {
  return calendar === 'hijri' ? HIJRI_YEAR_DAYS : SOLAR_YEAR_DAYS;
}

/** السنوات الشمسية المنقضية عند بداية الشهر رقم `month` من تقويم العقد. */
export function elapsedSolarYears(month: number, calendar: Calendar): number {
  return (month * monthDays(calendar)) / SOLAR_YEAR_DAYS;
}

/** حصة الشهر من السنة الشمسية — بها نحوّل إيجاراً سنوياً إلى إيراد الشهر الفعلي. */
export function monthSolarFraction(calendar: Calendar): number {
  return monthDays(calendar) / SOLAR_YEAR_DAYS;
}

/** عدد أشهر العقد. */
export function termMonths(termYears: number): number {
  return Math.round(termYears * 12);
}
