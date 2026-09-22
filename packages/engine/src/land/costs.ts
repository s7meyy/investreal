/**
 * ما يُدفع فوق الثمن، وما يُدفع مقابل الانتظار.
 *
 * «سعر المتر» ليس التكلفة. تقرير يعرض السعر ويسكت عن الرسوم وتكاليف
 * الحيازة يُقدّم للقارئ نصف الحقيقة — وهو النصف المتفائل.
 *
 * ملاحظة نظامية مهمة: النسب أدناه **قيم بدء قابلة للتعديل** لا اقتباس
 * نظامي. ضريبة التصرفات العقارية ومَن يتحمّلها، وضريبة الأراضي البيضاء
 * ونطاق انطباقها، تتغيّر بالأنظمة واللوائح وبالاتفاق بين الطرفين،
 * فتُراجَع من مصادرها الرسمية عند كل صفقة. التقرير يطبع النسب المستعملة
 * صراحةً حتى يعرف القارئ على أي أساس حُسبت.
 */

export interface TransactionCostConfig {
  /** ضريبة التصرفات العقارية — نسبة من الثمن، ومَن يتحمّلها يُحدَّد أدناه */
  rettPct: number;
  rettPaidBy: 'buyer' | 'seller';
  /** سعي الوسيط */
  brokeragePct: number;
  brokeragePaidBy: 'buyer' | 'seller';
  /** توثيق وإفراغ ورسوم إدارية مقطوعة */
  fixedFees: number;
  /** تسوية وردم ورفع مساحي — تقدير مبلغ لا نسبة */
  sitePrepCost: number;
}

export const DEFAULT_TRANSACTION_COSTS: TransactionCostConfig = {
  rettPct: 0.05,
  rettPaidBy: 'seller',
  brokeragePct: 0.025,
  brokeragePaidBy: 'buyer',
  fixedFees: 5000,
  sitePrepCost: 0,
};

export interface CostBreakdownRow { label: string; amount: number; note: string }

export interface TransactionCosts {
  price: number;
  buyerRows: CostBreakdownRow[];
  sellerRows: CostBreakdownRow[];
  buyerTotal: number;
  sellerTotal: number;
  /** التكلفة الحقيقية للمشتري = الثمن + ما يتحمّله */
  buyerAllIn: number;
  /** صافي ما يصل البائع */
  sellerNet: number;
}

export function transactionCosts(
  price: number,
  cfg: TransactionCostConfig = DEFAULT_TRANSACTION_COSTS,
): TransactionCosts {
  const buyerRows: CostBreakdownRow[] = [];
  const sellerRows: CostBreakdownRow[] = [];

  const rett = price * cfg.rettPct;
  const rettRow: CostBreakdownRow = {
    label: 'ضريبة التصرفات العقارية',
    amount: rett,
    note: `${(cfg.rettPct * 100).toFixed(1)}٪ من الثمن — تُراجَع النسبة ومَن يتحمّلها عند التعاقد`,
  };
  (cfg.rettPaidBy === 'buyer' ? buyerRows : sellerRows).push(rettRow);

  const brokerage = price * cfg.brokeragePct;
  (cfg.brokeragePaidBy === 'buyer' ? buyerRows : sellerRows).push({
    label: 'سعي الوسيط',
    amount: brokerage,
    note: `${(cfg.brokeragePct * 100).toFixed(1)}٪ من الثمن`,
  });

  if (cfg.fixedFees > 0) {
    buyerRows.push({ label: 'توثيق وإفراغ ورسوم إدارية', amount: cfg.fixedFees, note: 'مبلغ مقطوع تقديري' });
  }
  if (cfg.sitePrepCost > 0) {
    buyerRows.push({ label: 'تسوية وردم ورفع مساحي', amount: cfg.sitePrepCost, note: 'تكلفة تهيئة الموقع قبل البناء' });
  }

  const buyerTotal = buyerRows.reduce((s, r) => s + r.amount, 0);
  const sellerTotal = sellerRows.reduce((s, r) => s + r.amount, 0);

  return {
    price,
    buyerRows,
    sellerRows,
    buyerTotal,
    sellerTotal,
    buyerAllIn: price + buyerTotal,
    sellerNet: price - sellerTotal,
  };
}

export interface HoldingInputs {
  /** سنوات الاحتفاظ المتوقّعة قبل البيع */
  years: number;
  /** نمو سعر الأرض السنوي المتوقّع */
  appreciation: number;
  /** ضريبة/رسوم سنوية على الأرض البيضاء — نسبة من القيمة، تُراجَع بحسب النطاق والأنظمة */
  annualLevyPct: number;
  /** سياج وحراسة وصيانة سنوية */
  annualUpkeep: number;
  /** تكلفة الفرصة البديلة — البديل الآمن لرأس المال */
  opportunityRate: number;
}

export const DEFAULT_HOLDING: HoldingInputs = {
  years: 3,
  appreciation: 0.05,
  annualLevyPct: 0,
  annualUpkeep: 0,
  opportunityRate: 0.05,
};

export interface HoldingResult {
  buyAllIn: number;
  expectedSalePrice: number;
  sellerCostsAtExit: number;
  holdingCosts: number;
  netProfit: number;
  /** العائد السنوي المركّب بعد كل التكاليف */
  annualizedReturn: number | null;
  /** الفرق عن البديل الآمن — بالنقاط المئوية */
  excessOverOpportunity: number | null;
  /** أقل نمو سنوي يجعل الصفقة تتعادل مع البديل الآمن */
  breakevenAppreciation: number;
}

/**
 * عائد الاحتفاظ: يجيب سؤال المستثمر «كم يكلّفني الانتظار؟».
 * الأرض التي ترتفع ٥٪ سنوياً وتكلّف رسومها وفرصتها البديلة ٧٪ خسارة
 * حقيقية وإن بدا رقم البيع أعلى من رقم الشراء.
 */
export function holdingReturn(
  purchasePricePerSqm: number,
  areaSqm: number,
  holding: HoldingInputs = DEFAULT_HOLDING,
  costs: TransactionCostConfig = DEFAULT_TRANSACTION_COSTS,
): HoldingResult {
  const price = purchasePricePerSqm * areaSqm;
  const entry = transactionCosts(price, costs);
  const buyAllIn = entry.buyerAllIn;

  const expectedSalePrice = price * Math.pow(1 + holding.appreciation, holding.years);
  const exit = transactionCosts(expectedSalePrice, costs);
  const sellerCostsAtExit = exit.sellerTotal;

  // الرسوم السنوية تُحتسب على القيمة المتنامية لا على سعر الشراء
  let levies = 0;
  for (let y = 0; y < holding.years; y++) {
    levies += price * Math.pow(1 + holding.appreciation, y) * holding.annualLevyPct;
  }
  const holdingCosts = levies + holding.annualUpkeep * holding.years;

  const netProceeds = expectedSalePrice - sellerCostsAtExit - holdingCosts;
  const netProfit = netProceeds - buyAllIn;
  const annualizedReturn =
    buyAllIn > 0 && netProceeds > 0 && holding.years > 0
      ? Math.pow(netProceeds / buyAllIn, 1 / holding.years) - 1
      : null;

  // أقل نمو يجعل العائد يساوي تكلفة الفرصة البديلة
  const target = buyAllIn * Math.pow(1 + holding.opportunityRate, holding.years);
  let lo = -0.5, hi = 1.0;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const sale = price * Math.pow(1 + mid, holding.years);
    let lv = 0;
    for (let y = 0; y < holding.years; y++) lv += price * Math.pow(1 + mid, y) * holding.annualLevyPct;
    const proceeds = sale - transactionCosts(sale, costs).sellerTotal - lv - holding.annualUpkeep * holding.years;
    if (proceeds < target) lo = mid; else hi = mid;
  }

  return {
    buyAllIn,
    expectedSalePrice,
    sellerCostsAtExit,
    holdingCosts,
    netProfit,
    annualizedReturn,
    excessOverOpportunity: annualizedReturn === null ? null : annualizedReturn - holding.opportunityRate,
    breakevenAppreciation: (lo + hi) / 2,
  };
}
