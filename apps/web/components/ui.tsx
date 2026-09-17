'use client';
import type { ReactNode } from 'react';

export function Card({ title, hint, children, className = '' }: {
  title?: string; hint?: string; children: ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm ${className}`}>
      {title && (
        <header className="mb-4">
          <h2 className="text-base font-semibold">{title}</h2>
          {hint && <p className="mt-1 text-[13px] leading-relaxed text-ink/55">{hint}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function NumberField({ label, value, onChange, suffix, step = 1, min = 0, hint }: {
  label: string; value: number; onChange: (v: number) => void;
  suffix?: string; step?: number; min?: number; hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink/75">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
        <input
          type="number"
          className="num min-w-0 flex-1 bg-transparent py-2.5 text-[15px] outline-none"
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={min}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        {suffix && <span className="shrink-0 text-[13px] text-ink/45">{suffix}</span>}
      </div>
      {hint && <span className="mt-1 block text-[12px] leading-relaxed text-ink/45">{hint}</span>}
    </label>
  );
}

export function PercentField({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <NumberField
      label={label}
      value={Math.round(value * 1000) / 10}
      onChange={(v) => onChange(v / 100)}
      suffix="٪"
      step={0.5}
      hint={hint}
    />
  );
}

export function SelectField<T extends string>({ label, value, onChange, options, hint }: {
  label: string; value: T; onChange: (v: T) => void;
  options: { value: T; label: string }[]; hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink/75">{label}</span>
      <select
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-[12px] leading-relaxed text-ink/45">{hint}</span>}
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink/75">{label}</span>
      <input
        className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function Metric({ label, value, tone = 'neutral', note }: {
  label: string; value: string; tone?: 'good' | 'bad' | 'neutral'; note?: string;
}) {
  const color = tone === 'good' ? 'text-ok' : tone === 'bad' ? 'text-danger' : 'text-ink';
  return (
    <div className="rounded-xl bg-paper px-4 py-3">
      <div className="text-[12px] text-ink/55">{label}</div>
      <div className={`num mt-1 text-[22px] font-bold leading-tight ${color}`}>{value}</div>
      {note && <div className="mt-1 text-[12px] leading-relaxed text-ink/50">{note}</div>}
    </div>
  );
}
