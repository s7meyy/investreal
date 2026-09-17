/** تنسيق موحّد للأرقام — الوضوح أهم من الزخرفة في أداة قرار مالي. */

/**
 * المبلغ السالب لا يُكتب بإشارة داخل نص عربي: علامة الطرح تهاجر إلى آخر
 * السطر فتصير «9,833 ريال-». نكتب الخسارة كلمةً بدل الإشارة.
 */
export const riyal = (v: number): string => {
  const abs = Math.round(Math.abs(v)).toLocaleString('en-US');
  return v < 0 ? `خسارة ${abs} ريال` : `${abs} ريال`;
};

export const riyalShort = (v: number): string => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}م ريال`;
  if (a >= 10_000) return `${Math.round(v / 1000)}ألف ريال`;
  return riyal(v);
};

export const pct = (v: number | null, digits = 1): string =>
  v === null ? '—' : `${(v * 100).toFixed(digits)}٪`;

export const years = (v: number | null): string =>
  v === null ? 'لا يُسترد' : `${v.toFixed(1)} سنة`;
