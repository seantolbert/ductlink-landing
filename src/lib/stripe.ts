import 'server-only';
import Stripe from 'stripe';
import { serverEnv } from './server-env';

let client: Stripe | undefined;

export function stripe(): Stripe {
  client ??= new Stripe(serverEnv.stripeSecretKey());
  return client;
}

export type Interval = 'month' | 'year';

/** Price ids live on the server; the browser only ever names an interval. */
export function priceFor(interval: Interval): string {
  return interval === 'year' ? serverEnv.priceYearly() : serverEnv.priceMonthly();
}

export const TRIAL_DAYS = 14;
