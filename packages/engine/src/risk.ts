import type { Answer, LegalAnswers, Metrics, Opportunity, RiskBand, RiskResult, ScoredRisk } from './types.js';

/**
 * درجة المخاطرة ٠–١٠٠.
 *
 * مبدآن يحكمان هذا الملف:
 * ١) «غير معروف» يُحسب كخطر مرتفع لا كحياد — الجهل ليس أماناً.
 * ٢) المخاطر القانونية أثقل وزناً من غيرها، لأن هذا النموذج قائم كله
 *    على عقد طويل الأمد يمكن أن يسقط ويأخذ رأس المال معه.
 */

type Key = keyof LegalAnswers;

interface RiskDef {
  id: Key;
  title: string;
  category: ScoredRisk['category'];
  weight: number;
  /** الإجابة التي تعني «الخطر مُخفَّف» */
  safe: Answer;
  /** خطر قاتل: إجابته غير الآمنة تُسقط الفرصة مهما كان العائد */
  blocker?: boolean;
  note: string;
  mitigation: string;
}

const RISKS: RiskDef[] = [
  { id: 'subleaseExplicit', title: 'حق التأجير من الباطن', category: 'legal', weight: 12, safe: 'yes', blocker: true,
    note: 'بدون نص صريح، نموذج الاستثمار كله قد يسقط — والصمت في العقد ليس إذناً.',
    mitigation: 'نصّ صريح: «يحق للمستأجر تأجير العين من الباطن كلياً أو جزئياً دون الرجوع للمؤجر».' },
  { id: 'ownershipClear', title: 'سلامة الملكية', category: 'legal', weight: 10, safe: 'yes', blocker: true,
    note: 'ملكية مشاعة أو متنازع عليها قد تُجمّد العقار سنوات.',
    mitigation: 'صك مفرز، وتوقيع كل الملّاك، ومطابقة الهويات.' },
  { id: 'notWaqf', title: 'العقار ليس وقفاً', category: 'legal', weight: 8, safe: 'yes', blocker: true,
    note: 'التصرّف بالوقف لمدد طويلة له أحكام خاصة قد تُبطل العقد.',
    mitigation: 'التحقق من صفة الصك، وموافقة الجهة المختصة إن كان وقفاً.' },
  { id: 'titleUnencumbered', title: 'خلوّ العقار من الرهن', category: 'legal', weight: 9, safe: 'yes',
    note: 'التنفيذ على عقار مرهون قد يُخرجك قبل نهاية المدة.',
    mitigation: 'استخراج بيانات الصك، وإقرار خلوّ من الرهن مع شرط جزائي.' },
  { id: 'registered', title: 'تسجيل العقد رسمياً', category: 'legal', weight: 8, safe: 'yes',
    note: 'العقد غير المسجَّل ضعيف الحجية عند النزاع.',
    mitigation: 'تسجيل إلزامي في المنصّة الرسمية (إيجار) قبل تسليم أي مبلغ.' },
  { id: 'survivesSale', title: 'استمرار العقد عند البيع', category: 'legal', weight: 8, safe: 'yes',
    note: 'بيع المالك للعقار هو أشيع سبب لانهيار هذه الصفقات.',
    mitigation: 'بند استمرار العقد + إلزام المالك بإشعار المشتري كتابياً وإدراج العقد في عقد البيع.' },
  { id: 'assignable', title: 'حق التنازل عن العقد', category: 'legal', weight: 6, safe: 'yes',
    note: 'بدونه لا مخرج لك قبل نهاية المدة مهما تغيّرت ظروفك.',
    mitigation: 'حق التنازل لطرف ثالث بموافقة لا تُمنع تعسفاً.' },
  { id: 'earlyTerminationCompensation', title: 'تعويض الإنهاء المبكر', category: 'legal', weight: 7, safe: 'yes',
    note: 'استرداد «ما تبقى» فقط يعني خسارة كل الربح المتوقع.',
    mitigation: 'التعويض = القيمة الحالية لبقية المنفعة بسعر السوق، لا المتبقي من المدفوع.' },
  { id: 'signerVerified', title: 'صفة الموقّع', category: 'legal', weight: 6, safe: 'yes',
    note: 'وكالة منتهية أو غير شاملة للتأجير تُبطل العقد.',
    mitigation: 'التحقق من الوكالة ونطاقها ومدّتها، ومطابقتها بالمصدر الرسمي.' },
  { id: 'compliant', title: 'السلامة النظامية والبلدية', category: 'property', weight: 5, safe: 'yes',
    note: 'المخالفات قد تعني غرامات أو إغلاقاً بعد أن تكون دفعت.',
    mitigation: 'شهادة إشغال سارية + إقرار المالك بتحمّل المخالفات السابقة.' },
  { id: 'structuralOnOwner', title: 'الصيانة الإنشائية على المالك', category: 'property', weight: 5, safe: 'yes',
    note: 'عطل جوهري في مبنى قديم قد يمحو ربح سنوات.',
    mitigation: 'نصّ يُلزم المالك بالإنشائي والمصعد والتكييف المركزي.' },
  { id: 'inspected', title: 'الفحص الهندسي', category: 'property', weight: 4, safe: 'yes',
    note: 'العيوب الخفيّة تظهر بعد التوقيع لا قبله.',
    mitigation: 'فحص هندسي معتمد قبل التوقيع، وتقريره مرفق بالعقد.' },
  { id: 'insured', title: 'التأمين', category: 'property', weight: 3, safe: 'yes',
    note: 'حريق أو تسرّب كبير بلا تأمين يعني خسارة مباشرة.',
    mitigation: 'تأمين على المنشأة (المالك) وعلى المحتويات والمسؤولية (المستثمر).' },
  { id: 'marketRentVerified', title: 'التحقق من إيجار السوق', category: 'market', weight: 10, safe: 'yes',
    note: 'إيجار السوق هو أخطر مُدخَل في الحساب كله — وخطؤه يقلب النتيجة.',
    mitigation: 'عقود موثّقة فعلية لوحدات مماثلة، لا أسعار إعلانات ولا كلام المالك.' },
  { id: 'renewalOption', title: 'خيار التمديد', category: 'financial', weight: 3, safe: 'yes',
    note: 'بدونه تُسلّم العقار في ذروة نضجه التشغيلي.',
    mitigation: 'خيار تمديد بسعر محدّد مسبقاً يُمارَس بإرادتك المنفردة.' },
  { id: 'purchaseOption', title: 'خيار الشراء أو الشفعة', category: 'financial', weight: 2, safe: 'yes',
    note: 'فرصة ضائعة أكثر من كونها خطراً — لكنها تحمي من البيع المفاجئ.',
    mitigation: 'حق شفعة أو خيار شراء بسعر متفق عليه اليوم.' },
];

const TOTAL_WEIGHT = RISKS.reduce((s, r) => s + r.weight, 0);

/** «غير معروف» = ٨٥٪ من الخطر الكامل: أقل قليلاً من المؤكّد سوءاً، وأبعد كثيراً عن الأمان. */
function exposure(answer: Answer, safe: Answer): number {
  if (answer === safe) return 0;
  if (answer === 'unknown') return 0.85;
  return 1;
}

export function bandOf(score: number): RiskBand {
  if (score <= 25) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 75) return 'high';
  return 'critical';
}

export function computeRisk(o: Opportunity, metrics: Metrics): RiskResult {
  const items: ScoredRisk[] = [];
  const blockers: string[] = [];
  const unverifiedBlockers: string[] = [];
  let weighted = 0;

  for (const def of RISKS) {
    const answer = o.legal[def.id];
    const exp = exposure(answer, def.safe);
    weighted += def.weight * exp;
    if (exp > 0) {
      items.push({
        id: def.id,
        title: def.title,
        category: def.category,
        severity: Math.round(def.weight * exp * 10) / 10,
        note: answer === 'unknown' ? `${def.note} (غير معروف — يُحسب كخطر حتى تتحقّق)` : def.note,
        mitigation: def.mitigation,
      });
    }
    // «لا» بند قاتل مؤكّد يُسقط الفرصة؛ «لا أعرف» واجبُ تحقّق يمنع الترقية.
    if (def.blocker && answer === 'no') blockers.push(def.title);
    else if (def.blocker && answer === 'unknown') unverifiedBlockers.push(def.title);
  }

  // مخاطر محسوبة من الأرقام لا من الاستبيان.
  let numeric = 0;
  if (metrics.liquidityLockRatio !== null && metrics.liquidityLockRatio > 0.4) {
    numeric += 6;
    items.push({
      id: 'liquidity', title: 'تركّز السيولة', category: 'financial', severity: 6,
      note: `هذه الصفقة تجمّد ${Math.round(metrics.liquidityLockRatio * 100)}٪ من سيولتك في أصل واحد.`,
      mitigation: 'شارك مستثمراً، أو جزّئ الدفعة، أو اختر مدة أقصر.',
    });
  }
  if (o.deal.termYears >= 15) {
    numeric += 5;
    items.push({
      id: 'longTerm', title: 'طول المدة', category: 'financial', severity: 5,
      note: `مدة ${o.deal.termYears} سنة تعني تعرّضاً طويلاً لتغيّر الأنظمة والسوق والحي.`,
      mitigation: 'بند مراجعة كل ٥ سنوات + حق خروج مقابل تعويض محدّد.',
    });
  }
  if (metrics.breakevenOccupancy !== null && metrics.breakevenOccupancy > 0.75) {
    numeric += 6;
    items.push({
      id: 'thinMargin', title: 'هامش تشغيلي ضيّق', category: 'operational', severity: 6,
      note: `تحتاج إشغالاً ${Math.round(metrics.breakevenOccupancy * 100)}٪ لمجرّد التعادل — لا مساحة للخطأ.`,
      mitigation: 'خفّض الإيجار التعاقدي أو اطلب فترة سماح أطول قبل الدخول.',
    });
  }

  const score = Math.min(100, Math.round((weighted / TOTAL_WEIGHT) * 100 + numeric));
  items.sort((a, b) => b.severity - a.severity);
  return { score, band: bandOf(score), items, blockers, unverifiedBlockers };
}
