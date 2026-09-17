import type { Opportunity } from '../src/types.js';
import { defaultCosts, defaultFinance, defaultRevenue } from '../src/defaults.js';

/**
 * الحالة المرجعية: مثال «٣٠ ألف سوقي مقابل ١٢ ألف تعاقدي لعشر سنوات».
 * هذه هي الحالة التي وُلدت المنصّة لتفكيكها، فهي أول ما يجب أن يبقى صحيحاً.
 */
export function referenceCase(overrides: Partial<Opportunity> = {}): Opportunity {
  const marketRent = 30000;
  const costs = defaultCosts('apartment', marketRent);
  return {
    id: 'ref',
    name: 'شقة — ٣٠ مقابل ١٢',
    property: { type: 'apartment', city: 'الرياض', district: '—' },
    deal: {
      termYears: 10,
      contractRentAnnual: 12000,
      payment: { kind: 'upfront_full' },
      contractEscalation: 0,
      graceMonths: 0,
      calendar: 'gregorian',
    },
    revenue: { ...defaultRevenue('apartment', marketRent), badDebt: 0 },
    costs: { ...costs, fitout: 20000, restoration: 8000, feesAnnual: 1500, capexReserve: 0, marketing: 0, insuranceAnnual: 0 },
    finance: { ...defaultFinance('apartment'), discountRate: 0.12 },
    legal: {
      subleaseExplicit: 'yes', assignable: 'yes', registered: 'yes', survivesSale: 'yes',
      earlyTerminationCompensation: 'no', titleUnencumbered: 'yes', ownershipClear: 'yes',
      notWaqf: 'yes', signerVerified: 'yes', compliant: 'yes', structuralOnOwner: 'yes',
      renewalOption: 'no', purchaseOption: 'no', insured: 'yes', inspected: 'yes',
      marketRentVerified: 'yes',
    },
    ...overrides,
  };
}
