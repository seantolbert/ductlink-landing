import type { OwnerShop } from './auth';
import { LIVE_STATUSES } from './shop';

export const STEPS = [
  { id: 'shop', label: 'Your shop' },
  { id: 'trial', label: 'Start trial' },
  { id: 'branding', label: 'Branding' },
  { id: 'contact', label: 'Contact' },
  { id: 'products', label: 'What you make' },
  { id: 'team', label: 'Team' },
  { id: 'live', label: 'Go live' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];

export function isStep(id: string): id is StepId {
  return STEPS.some((s) => s.id === id);
}

export function stepIndex(id: StepId): number {
  return STEPS.findIndex((s) => s.id === id);
}

export function nextStep(id: StepId): StepId | null {
  return STEPS[stepIndex(id) + 1]?.id ?? null;
}

export function prevStep(id: StepId): StepId | null {
  return STEPS[stepIndex(id) - 1]?.id ?? null;
}

/**
 * The step a shop must be on, if it can't be on the one it asked for:
 * no shop yet -> shop; no subscription yet -> trial. Later steps are free to
 * visit in any order once those two are done.
 */
export function requiredStep(shop: OwnerShop | null, asked: StepId): StepId | null {
  if (!shop) return asked === 'shop' ? null : 'shop';
  if (asked === 'shop') return 'trial';
  if (!LIVE_STATUSES.has(shop.billing.status)) return asked === 'trial' ? null : 'trial';
  if (asked === 'trial') return 'branding';
  return null;
}

/** Where /onboarding resumes: the first thing still missing. */
export function resumeStep(shop: OwnerShop | null): StepId {
  if (!shop) return 'shop';
  if (!LIVE_STATUSES.has(shop.billing.status)) return 'trial';
  if (!shop.logoUrl && !shop.brandColor) return 'branding';
  if (shop.contact.length === 0) return 'contact';
  return 'live';
}
