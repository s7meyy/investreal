import type { LegalAnswers } from '@investreal/engine';
import type { QuickForm } from './opportunity';

/**
 * الحفظ والمشاركة.
 *
 * تحديث الصفحة كان يمحو كل شيء — وهي أداة يُستعملها المستثمر أثناء المعاينة
 * على جواله، حيث تنقطع الجلسة لأتفه سبب. الحفظ في المتصفح يحمي عمله،
 * والرابط يجعله يناقش الفرصة مع شريكه دون إعادة إدخال شيء.
 */

const KEY = 'investreal:form:v1';

export interface SavedState { form: QuickForm; legal: LegalAnswers }

export function saveLocal(state: SavedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // وضع التصفّح الخاص أو تخزين ممتلئ — الأداة تعمل بلا حفظ.
  }
}

export function loadLocal(): SavedState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedState) : null;
  } catch {
    return null;
  }
}

/** ترميز آمن للعربية في الرابط (btoa وحده يختنق بغير اللاتينية). */
function encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(value: string): string {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function toShareUrl(state: SavedState, origin: string): string {
  return `${origin}/#f=${encode(JSON.stringify(state))}`;
}

export function fromHash(hash: string): SavedState | null {
  const match = hash.match(/[#&]f=([^&]+)/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(decode(match[1])) as SavedState;
  } catch {
    return null;
  }
}
