import type { LandSubject } from './types.js';

/**
 * مقارنة فرصتين أو أكثر.
 *
 * المفاضلة بين أرضين لا تُحسم بسعر المتر: قطعة أغلى بمعامل بناء أعلى قد
 * تكون أرخص فعلياً. المؤشّر الحاسم هو **سعر الأرض لكل متر قابل للبيع**،
 * وهو ما يُقارَن هنا جنباً إلى جنب مع الفائض عن السوق ودرجة الثقة.
 */

export interface ComparisonEntry {
  id: string;
  label: string;
  subject: Pick<LandSubject, 'city' | 'district' | 'areaSqm' | 'far'>;
  marketPerSqm: number;
  residualPerSqm: number;
  landCostPerSaleableSqm: number;
  confidenceScore: number;
  /** درجة الخطر النظامي ٠–١٠٠، وكلما زادت ساءت */
  legalScore: number;
  hasBlocker: boolean;
}

export interface ComparisonRow extends ComparisonEntry {
  /** فائض ما يحتمله المشروع عن سعر السوق، نسبةً */
  headroom: number;
  rank: number;
  verdict: string;
}

/**
 * الترتيب: المانع النظامي يُنزل الفرصة إلى آخر القائمة مهما كان فائضها،
 * لأن أرضاً لا يمكن إفراغها ليست فرصة بسعر أفضل، بل ليست فرصة.
 */
export function compareOpportunities(entries: ComparisonEntry[]): ComparisonRow[] {
  const rows = entries.map((e) => ({
    ...e,
    headroom: e.marketPerSqm > 0 ? (e.residualPerSqm - e.marketPerSqm) / e.marketPerSqm : 0,
    rank: 0,
    verdict: '',
  }));

  rows.sort((a, b) => {
    if (a.hasBlocker !== b.hasBlocker) return a.hasBlocker ? 1 : -1;
    return b.headroom - a.headroom;
  });

  rows.forEach((r, i) => {
    r.rank = i + 1;
    if (r.hasBlocker) {
      r.verdict = 'مانع نظامي — خارج المقارنة حتى يُحَل';
    } else if (r.headroom > 0.1) {
      r.verdict = 'فائض مريح فوق سعر السوق';
    } else if (r.headroom > 0) {
      r.verdict = 'فائض ضيّق — يحتمل خطأ تقدير واحد فقط';
    } else {
      r.verdict = 'السوق يطلب أكثر مما يحتمله المشروع';
    }
    if (!r.hasBlocker && r.confidenceScore < 45) {
      r.verdict += ' · ثقة التقييم منخفضة';
    }
  });

  return rows;
}
