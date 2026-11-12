// Shop rules shared by the onboarding forms and the API routes. The regexes
// mirror the check constraints on public.shops (v1/supabase/migrations/
// 20261109175021_orders_core.sql); the types mirror v1/src/shop/shop.ts.

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
export const PREFIX_RE = /^[A-Z0-9]{2,8}$/;
export const HEX_RE = /^#[0-9a-fA-F]{6}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Slugs a shop can't take: they'd read as DuctLink's own pages. */
const RESERVED = new Set(['demo', 'shop', 'admin', 'api', 'app', 'www', 'ductlink', 'help', 'support', 'login', 'signup', 'start', 'account', 'billing', 'learn', 'pricing', 'order', 'orders', 'test']);

/** Gauges the ordering app can build (v1/src/order/gauge.ts). */
export const GAUGES = [24, 26] as const;
export type Gauge = (typeof GAUGES)[number];

export type ContactMethod =
  | { kind: 'phone'; display: string; dial: string }
  | { kind: 'email'; address: string };

/** `Acme Sheet Metal & Supply` -> `acme-sheet-metal-supply`. */
export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

/** `Acme Sheet Metal` -> `ACME`; `A1 Duct` -> `A1D`. 2–8 characters. */
export function suggestPrefix(name: string): string {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0];
  let prefix = first.length >= 3 ? first.slice(0, 6) : words.map((w) => w[0]).join('').slice(0, 4);
  if (prefix.length < 2) prefix = (prefix + 'SHOP').slice(0, 4);
  return prefix.slice(0, 8);
}

export type SlugProblem = 'format' | 'reserved';

export function slugProblem(slug: string): SlugProblem | null {
  if (!SLUG_RE.test(slug)) return 'format';
  if (RESERVED.has(slug)) return 'reserved';
  return null;
}

/** `(555) 010-0100` -> `+15550100100`. US/Canada numbers only; null if it isn't one. */
export function dialFromDisplay(display: string): string | null {
  const digits = display.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/** `5550100100` -> `(555) 010-0100`. Leaves anything else as typed. */
export function formatPhone(input: string): string {
  const d = input.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (d.length !== 10) return input.trim();
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function parseGauges(settings: unknown): Gauge[] {
  const raw = (settings as { gauges?: unknown } | null)?.gauges;
  const list = Array.isArray(raw) ? GAUGES.filter((g) => raw.includes(g)) : [];
  return list.length > 0 ? list : [...GAUGES];
}

export function parseContact(raw: unknown): ContactMethod[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((m): ContactMethod[] => {
    if (m?.kind === 'phone' && typeof m.display === 'string' && typeof m.dial === 'string') return [{ kind: 'phone', display: m.display, dial: m.dial }];
    if (m?.kind === 'email' && typeof m.address === 'string') return [{ kind: 'email', address: m.address }];
    return [];
  });
}

/** Billing statuses that keep a shop's link and inbox working. */
export const LIVE_STATUSES = new Set(['comped', 'trialing', 'active', 'past_due']);

export type BillingStatus =
  | 'none' | 'comped' | 'incomplete' | 'incomplete_expired' | 'trialing'
  | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
