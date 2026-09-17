import type { Ceiling, Metrics, Opportunity, Recommendation, RiskResult, TornadoItem } from './types.js';
import { computeMetrics } from './metrics.js';
import { totalContractPayments } from './solver.js';

/** كم يتغيّر العائد الداخلي لو طبّقنا تعديلاً على الفرصة؟ */
function irrDelta(o: Opportunity, base: Metrics, mutate: (c: Opportunity) => void): number | null {
  if (base.irr === null) return null;
  const clone = structuredClone(o);
  mutate(clone);
  const after = computeMetrics(clone).irr;
  return after === null ? null : after - base.irr;
}

const fmt = (n: number) => Math.round(n).toLocaleString('ar-SA', { useGrouping: true });
const pts = (d: number | null) => (d === null ? '' : ` (أثرها ${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)} نقطة على عائدك)`);

/**
 * محرّك التوصيات: لا يكتفي بالحكم، بل يجيب «كيف أجعلها أجمل؟»
 * كل توصية مُسعَّرة بأثرها الفعلي على العائد، ومرتّبة بالأثر ÷ الجهد.
 */
export function buildRecommendations(
  o: Opportunity,
  metrics: Metrics,
  ceilings: Ceiling[],
  risk: RiskResult,
  sensitivity: TornadoItem[],
): Recommendation[] {
  const recs: Recommendation[] = [];
  const hurdle = o.finance.discountRate;

  // ١) السعر — الورقة الأقوى، وتُقدَّم برقم لا بمساومة.
  const target = ceilings.find((c) => c.targetIrr >= hurdle) ?? ceilings[ceilings.length - 1];
  if (target && target.maxContractRentAnnual < o.deal.contractRentAnnual) {
    recs.push({
      id: 'price',
      title: `اخفض الإيجار التعاقدي إلى ${fmt(target.maxContractRentAnnual)} ريال/سنة`,
      detail: `بالسعر الحالي (${fmt(o.deal.contractRentAnnual)}) عائدك دون هدفك. سقفك المحسوب عند عائد ${Math.round(target.targetIrr * 100)}٪ هو ${fmt(target.maxContractRentAnnual)} ريال سنوياً، أي إجمالي ${fmt(target.maxUpfrontTotal)} ريال. قل للمالك: «حسبتُها — بهذا السعر عائدي يساوي البديل الآمن بلا تجميد ولا مخاطرة».`,
      irrDelta: irrDelta(o, metrics, (c) => { c.deal.contractRentAnnual = target.maxContractRentAnnual; }),
      effort: 'medium',
      priority: 100,
    });
  }

  // ٢) فترة السماح — أرخص ورقة على المالك، وأثمنها لك.
  if (o.deal.graceMonths < 3) {
    const months = 4;
    recs.push({
      id: 'grace',
      title: `اطلب ${months} أشهر سماح مجانية في البداية`,
      detail: `أضعف نقطة في هذا النموذج هي السنة الأولى: تدفع كل شيء ولم يبدأ الدخل بعد. فترة السماح تُصلحها، وهي رخيصة على المالك لأنها لا تُنقص إجمالي ما يقبضه${pts(irrDelta(o, metrics, (c) => { c.deal.graceMonths = months; }))}. غالباً يقبلها أسرع من تخفيض السعر.`,
      irrDelta: irrDelta(o, metrics, (c) => { c.deal.graceMonths = months; }),
      effort: 'low',
      priority: 95,
    });
  }

  // ٣) هيكل الدفع — مقايضة زمنية غالباً تُربح رغم ارتفاع الإجمالي.
  if (o.deal.payment.kind === 'upfront_full' && o.deal.termYears >= 5) {
    const total = totalContractPayments(o);
    const split = (c: Opportunity) => {
      const grossUp = total * 1.05; // نقبل زيادة ٥٪ مقابل التجزئة
      c.deal.payment = { kind: 'custom', items: [
        { month: 0, amount: grossUp * 0.6 },
        { month: 24, amount: grossUp * 0.4 },
      ] };
    };
    const delta = irrDelta(o, metrics, split);
    if (delta !== null && delta > 0.005) {
      recs.push({
        id: 'payment_split',
        title: 'اعرض تجزئة الدفع: ٦٠٪ الآن و٤٠٪ بعد سنتين — ولو بزيادة ٥٪',
        detail: `الدفع الكامل مقدّماً هو أغلى ما تقدّمه للمالك. تجزئته ترفع عائدك${pts(delta)} رغم أن الإجمالي المدفوع يزيد، لأن قيمة النقود الزمنية في صفّك. وهذه ورقة تُرضي المالك الذي يهمّه الإجمالي أكثر من التوقيت.`,
        irrDelta: delta,
        effort: 'medium',
        priority: 90,
      });
    }
  }

  // ٤) التجهيز — تكلفة يدفعها المستثمر وتبقى للمالك.
  if (metrics.capitalInvested > 0 && o.costs.fitout / metrics.capitalInvested > 0.2) {
    recs.push({
      id: 'fitout_share',
      title: 'فاوض المالك على تحمّل نصف تكلفة التجهيز',
      detail: `التجهيز يمثّل ${Math.round((o.costs.fitout / metrics.capitalInvested) * 100)}٪ من رأس مالك، وهو تحسين يبقى للمالك بعد انتهاء العقد — وهذه حجّتك${pts(irrDelta(o, metrics, (c) => { c.costs.fitout = o.costs.fitout / 2; }))}.`,
      irrDelta: irrDelta(o, metrics, (c) => { c.costs.fitout = o.costs.fitout / 2; }),
      effort: 'medium',
      priority: 80,
    });
  }

  // ٥) خيار التمديد — تأخذ الميزة بلا الالتزام.
  if (o.legal.renewalOption !== 'yes') {
    recs.push({
      id: 'renewal',
      title: 'اطلب خيار تمديد بسعر محدّد مسبقاً',
      detail: 'المدة الأطول تُوزّع تكلفة التجهيز وتعطيك سنوات بإيجار سوق أعلى، لكنها تزيد التجميد والمخاطر. الصيغة المثلى: مدة أقصر + خيار تمديد بسعر يُحدَّد اليوم ويُمارَس بإرادتك المنفردة — تأخذ الميزة بلا الالتزام.',
      irrDelta: null,
      effort: 'low',
      priority: 75,
    });
  }

  // ٦) بنود الحماية القاتلة.
  for (const b of risk.blockers) {
    recs.push({
      id: `blocker_${b}`,
      title: `أوقف كل شيء حتى يُحسم: ${b}`,
      detail: 'هذا بند قاتل لا يُعوّضه أي عائد. لا تُسلّم ريالاً واحداً قبل معالجته كتابةً في العقد.',
      irrDelta: null,
      effort: 'high',
      priority: 120,
    });
  }

  // ٧) توجيه التحقق الميداني نحو المتغيّر الأخطر.
  const top = sensitivity[0];
  if (top && top.swing > 0) {
    recs.push({
      id: 'verify_top',
      title: `ركّز تحقّقك الميداني على: ${top.label}`,
      detail: `تحريك «${top.label}» بنسبة ±٢٠٪ يُغيّر عائدك بمقدار ${(top.swing * 100).toFixed(1)} نقطة — أكثر من أي عامل آخر في فرصتك. اطلب عقوداً موثّقة فعلية لا أسعار إعلانات.`,
      irrDelta: null,
      effort: 'low',
      priority: 85,
    });
  }

  // ٨) الفرق المريب عن السوق.
  if (metrics.discountToMarket > 0.5) {
    recs.push({
      id: 'suspicious_gap',
      title: 'تحقّق: الفرق عن السوق كبير لدرجة تستدعي السؤال',
      detail: `الإيجار التعاقدي أقل من السوق بنسبة ${Math.round(metrics.discountToMarket * 100)}٪. المالك لا يترك هذا المبلغ بلا سبب: استعجال سيولة، عيب في العقار، مشكلة نظامية، أو أن إيجار السوق الذي قدّرته متفائل. اعرف السبب قبل أن تفرح به.`,
      irrDelta: null,
      effort: 'low',
      priority: 88,
    });
  }

  return recs.sort((a, b) => b.priority - a.priority);
}
