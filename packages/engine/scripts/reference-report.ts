/**
 * يطبع تقرير الحالة المرجعية بالتقويمين — مصدر الأرقام المذكورة في `docs/`.
 * التشغيل: npx vite-node scripts/reference-report.ts
 */
import { referenceCase } from '../test/fixtures.js';
import { analyze } from '../src/index.js';

const pct = (v: number | null) => (v === null ? 'غير محسوب' : `${(v * 100).toFixed(1)}٪`);
const num = (v: number) => Math.round(v).toLocaleString('en-US');

for (const calendar of ['gregorian', 'hijri'] as const) {
  const o = referenceCase();
  o.deal.calendar = calendar;
  const r = analyze(o);
  const m = r.metrics;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`التقويم: ${calendar === 'hijri' ? 'هجري' : 'ميلادي'}`);
  console.log('='.repeat(60));
  console.log(`العائد الداخلي: ${pct(m.irr)}   صافي القيمة الحالية: ${num(m.npv)}`);
  console.log(`صافي الربح: ${num(m.totalNet)}   ROI: ${pct(m.roi)}   رأس المال: ${num(m.capitalInvested)}`);
  console.log(`الاسترداد: ${m.paybackYears?.toFixed(2)} سنة (مخصوم: ${m.discountedPaybackYears?.toFixed(2)})`);
  console.log(`إشغال التعادل: ${pct(m.breakevenOccupancy)}   إيجار سوق التعادل: ${num(m.breakevenMarketRent ?? 0)}`);
  console.log(`السيناريوهات (متشائم/أساسي/متفائل): ${pct(r.scenarios.pessimistic.irr)} / ${pct(r.scenarios.base.irr)} / ${pct(r.scenarios.optimistic.irr)}`);
  console.log('\nالسقف التفاوضي:');
  for (const c of r.ceilings) {
    console.log(`  هدف ${pct(c.targetIrr)} ← ${num(c.maxContractRentAnnual)} ريال/سنة (إجمالي ${num(c.maxUpfrontTotal)})`);
  }
  console.log(`\nالمخاطرة: ${r.risk.score}/100 (${r.risk.band})   الحكم: ${r.verdict.label}`);
  console.log(`السبب: ${r.verdict.reason}`);
  console.log('\nالحساسية (نقاط تغيّر العائد عند ±٢٠٪):');
  for (const t of r.sensitivity) console.log(`  ${t.label}: ${(t.swing * 100).toFixed(1)}`);
  console.log('\nالتوصيات:');
  for (const rec of r.recommendations) {
    console.log(`  • ${rec.title}${rec.irrDelta !== null ? ` [${rec.irrDelta >= 0 ? '+' : ''}${(rec.irrDelta * 100).toFixed(1)} نقطة]` : ''}`);
  }
}
