import type { Answer } from '../types.js';

/**
 * السجلّ النظامي للأرض.
 *
 * بند واحد هنا يُلغي كل الأرقام. صكّ مرهون أو مساحة تخالف الواقع أو طريق
 * غير نافذ يجعل «سعر المتر العادل» بحثاً في الهواء. ولذلك يعمل هذا السجلّ
 * بمنطق المحرّك الأول نفسه (وثيقة ٦):
 *
 * **«لا» ليست «لا أعرف».** بند قاتل أُجيب عنه بـ«لا» يُسقط الصفقة.
 * أما بند لم يُتحقَّق منه بعد فلا يُسقطها — قد يكون سليماً — لكنه يمنع
 * التقرير من أن يُقرأ كأنه مُتحقَّق منه، ويُحسب ٦٠٪ من الخطر لا ١٠٠٪،
 * حتى لا يرى من لم يبدأ التحقّق بعدُ أرضَه «مرفوضة» قبل أن يسأل سؤالاً.
 */

export type LandLegalKey =
  | 'titleClear' | 'notMortgaged' | 'noDispute' | 'notWaqf' | 'sharesResolved'
  | 'areaMatches' | 'accessRoad' | 'zoningConfirmed' | 'noEasements'
  | 'sellerVerified' | 'noUnpaidDues' | 'planApproved';

export interface LandLegalAnswers extends Record<LandLegalKey, Answer> {}

export const UNKNOWN_LAND_LEGAL: LandLegalAnswers = {
  titleClear: 'unknown', notMortgaged: 'unknown', noDispute: 'unknown', notWaqf: 'unknown',
  sharesResolved: 'unknown', areaMatches: 'unknown', accessRoad: 'unknown', zoningConfirmed: 'unknown',
  noEasements: 'unknown', sellerVerified: 'unknown', noUnpaidDues: 'unknown', planApproved: 'unknown',
};

interface LandLegalDef {
  id: LandLegalKey;
  title: string;
  question: string;
  weight: number;
  /** بند قاتل: «لا» تُسقط الصفقة مهما كان السعر */
  blocker?: boolean;
  why: string;
  howToVerify: string;
}

const ITEMS: LandLegalDef[] = [
  { id: 'titleClear', title: 'سلامة الصك', question: 'الصك إلكتروني سارٍ وبيانات المالك مطابقة؟', weight: 12, blocker: true,
    why: 'صك غير محدّث أو ببيانات غير مطابقة يوقف الإفراغ مهما اتُّفق على السعر.',
    howToVerify: 'التحقّق من الصك ومالكه عبر القنوات الرسمية قبل أي دفعة، لا بصورة من البائع.' },
  { id: 'notMortgaged', title: 'خلوّ من الرهن', question: 'الأرض خالية من الرهون والحجوزات؟', weight: 11, blocker: true,
    why: 'الرهن يعني أن البيع يحتاج فكّه أولاً، وقد يطول أو يفشل بعد أن تكون دفعت.',
    howToVerify: 'طلب بيان القيود على الصك، وربط أي دفعة بفكّ الرهن لا بالوعد به.' },
  { id: 'noDispute', title: 'لا نزاع قائم', question: 'الأرض خارج أي نزاع أو دعوى؟', weight: 10, blocker: true,
    why: 'أرض متنازع عليها قد تُجمَّد سنوات، وقيمتها الحقيقية حينها ليست قيمتها السوقية.',
    howToVerify: 'إقرار بائع موثّق + سؤال الجيران والمكاتب عن تاريخ القطعة.' },
  { id: 'notWaqf', title: 'ليست وقفاً', question: 'الأرض ليست وقفاً ولا مخصّصة لجهة؟', weight: 9, blocker: true,
    why: 'التصرّف بالوقف له أحكام خاصة قد تُبطل البيع من أساسه.',
    howToVerify: 'مراجعة صفة الصك ونوع الملكية، وموافقة الجهة المختصة إن كان كذلك.' },
  { id: 'sharesResolved', title: 'الشيوع والورثة', question: 'إن كانت مشاعة أو إرثاً: كل الملّاك موافقون وموثّقون؟', weight: 9, blocker: true,
    why: 'وريث واحد غائب أو معترض يكفي لتعطيل الصفقة كلها.',
    howToVerify: 'صك حصر ورثة، وتوقيع كل الملّاك أو وكالة شاملة سارية لكل منهم.' },
  { id: 'areaMatches', title: 'مطابقة المساحة', question: 'مساحة الصك تطابق الواقع والرفع المساحي؟', weight: 8,
    why: 'فرق ٥٪ في مساحة أرض بمليون ريال هو خمسون ألفاً تدفعها في تراب غير موجود.',
    howToVerify: 'رفع مساحي معتمد ومطابقته بالصك والمخطط قبل التوقيع.' },
  { id: 'accessRoad', title: 'الطريق النافذ', question: 'للأرض مدخل على طريق نافذ فعلاً لا على المخطط فقط؟', weight: 9, blocker: true,
    why: 'أرض بلا منفذ فعلي لا تُبنى ولا تُباع بسعرها، والمخطط وحده لا يفتح طريقاً.',
    howToVerify: 'الزيارة الميدانية أولاً، ثم مطابقة المخطط المعتمد بالواقع.' },
  { id: 'zoningConfirmed', title: 'تأكيد الاستعمال والضوابط', question: 'التصنيف ونسبة البناء وعدد الأدوار مؤكّدة من الجهة المختصة؟', weight: 8,
    why: 'كل حساب المطوّر مبني على معامل البناء — ورقم مأخوذ من كلام المكتب ليس ضابطاً.',
    howToVerify: 'الحصول على ضوابط البناء السارية للمخطط من الجهة المختصة مكتوبةً.' },
  { id: 'noEasements', title: 'الارتفاقات والخدمات المارّة', question: 'خالية من ارتفاق أو خطوط خدمات مارّة تحدّ البناء؟', weight: 6,
    why: 'خط ضغط أو ارتداد إضافي قد يقطع من المساحة القابلة للبناء دون أن يظهر في الصك.',
    howToVerify: 'مراجعة المخطط والكروكي والمعاينة، والسؤال عن أي خطوط مارّة.' },
  { id: 'sellerVerified', title: 'صفة البائع', question: 'البائع هو المالك أو وكيل بوكالة سارية تشمل البيع؟', weight: 8, blocker: true,
    why: 'وكالة منتهية أو لا تشمل البيع تُبطل التصرّف بعد دفع العربون غالباً.',
    howToVerify: 'التحقّق من الوكالة ونطاقها وسريانها من مصدرها الرسمي.' },
  { id: 'noUnpaidDues', title: 'لا مستحقات متراكمة', question: 'لا رسوم ولا مستحقات متأخّرة على الأرض؟', weight: 5,
    why: 'المستحقات تنتقل مع الأصل عملياً، فتدفع ما لم تستهلكه.',
    howToVerify: 'إبراء من الجهات ذات العلاقة، وربط الإفراغ به.' },
  { id: 'planApproved', title: 'المخطط معتمد', question: 'المخطط الذي تقع فيه الأرض معتمد ومفروز؟', weight: 7, blocker: true,
    why: 'أرض في مخطط غير معتمد لا تُبنى ولا تُموَّل، وسعرها ليس سعر الأرض المفرزة.',
    howToVerify: 'رقم المخطط واعتماده لدى الجهة المختصة، لا لوحة الدعاية.' },
];

export interface ScoredLandItem {
  id: LandLegalKey;
  title: string;
  question: string;
  answer: Answer;
  weight: number;
  blocker: boolean;
  /** الخطر المُحتسَب من هذا البند */
  scored: number;
  why: string;
  howToVerify: string;
}

export interface LandLegalResult {
  items: ScoredLandItem[];
  /** ٠–١٠٠، كلّما زاد زاد الخطر */
  score: number;
  band: 'clear' | 'caution' | 'serious' | 'blocking';
  bandLabel: string;
  /** بنود قاتلة أُجيب عنها بـ«لا» — كل واحد يُسقط الصفقة */
  blockers: ScoredLandItem[];
  /** بنود لم يُتحقَّق منها بعدُ وتمنع اعتماد التقرير */
  unverified: ScoredLandItem[];
  headline: string;
}

export function scoreLandLegal(answers: LandLegalAnswers): LandLegalResult {
  const items: ScoredLandItem[] = ITEMS.map((def) => {
    const answer = answers[def.id] ?? 'unknown';
    // «لا أعرف» ٦٠٪ من الخطر: جهل لا براءة، ولكنه ليس إدانة
    const factor = answer === 'yes' ? 0 : answer === 'no' ? 1 : 0.6;
    return {
      id: def.id, title: def.title, question: def.question, answer,
      weight: def.weight, blocker: def.blocker ?? false,
      scored: def.weight * factor,
      why: def.why, howToVerify: def.howToVerify,
    };
  });

  const totalWeight = items.reduce((s, i) => s + i.weight, 0);
  const score = Math.round((items.reduce((s, i) => s + i.scored, 0) / totalWeight) * 100);
  const blockers = items.filter((i) => i.blocker && i.answer === 'no');
  const unverified = items.filter((i) => i.answer === 'unknown');

  const band: LandLegalResult['band'] =
    blockers.length > 0 ? 'blocking' : score >= 45 ? 'serious' : score >= 20 ? 'caution' : 'clear';

  const bandLabel = {
    clear: 'الوضع النظامي سليم بحسب ما تحقّقتَ منه',
    caution: 'ملاحظات نظامية تستحق المتابعة',
    serious: 'مخاطر نظامية جوهرية',
    blocking: 'مانع نظامي — الصفقة ساقطة حتى يُحَل',
  }[band];

  let headline: string;
  if (blockers.length > 0) {
    headline = `${blockers.length} بند مانع: ${blockers.map((b) => b.title).join('، ')}. لا معنى للتفاوض على السعر قبل حلّها.`;
  } else if (unverified.length >= ITEMS.length / 2) {
    headline = `لم يُتحقَّق من ${unverified.length} بنداً من ${ITEMS.length}. الأرقام في هذا التقرير سوقية، والوضع النظامي ما يزال مفتوحاً.`;
  } else if (unverified.length > 0) {
    headline = `بقي ${unverified.length} بنداً بلا تحقّق: ${unverified.slice(0, 3).map((u) => u.title).join('، ')}${unverified.length > 3 ? '…' : ''}.`;
  } else {
    headline = 'كل البنود مُتحقَّق منها ولا مانع نظامي ظاهر.';
  }

  return { items, score, band, bandLabel, blockers, unverified, headline };
}
