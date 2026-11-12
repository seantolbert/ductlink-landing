import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import QRCode from 'qrcode';
import { getOwner, getOwnerShop } from '@/lib/auth';
import { orderLink } from '@/lib/env';
import { isStep, requiredStep, STEPS, stepIndex, type StepId } from '@/lib/onboarding';
import { BrandingStep } from '../steps/BrandingStep';
import { ContactStep } from '../steps/ContactStep';
import { LiveStep } from '../steps/LiveStep';
import { ProductsStep } from '../steps/ProductsStep';
import { ShopStep } from '../steps/ShopStep';
import { TeamStep } from '../steps/TeamStep';
import { TrialStep } from '../steps/TrialStep';
import styles from '../onboarding.module.css';

export function generateStaticParams() {
  return STEPS.map((s) => ({ step: s.id }));
}

export default async function StepPage({ params }: PageProps<'/onboarding/[step]'>) {
  const { step } = await params;
  if (!isStep(step)) notFound();
  const index = stepIndex(step);
  return (
    <main className={styles.page}>
      <ol className={styles.rail} aria-label="Setup steps">
        {STEPS.map((s, i) => (
          <li key={s.id} className={styles.railItem} data-state={i < index ? 'done' : i === index ? 'current' : 'todo'} aria-current={i === index ? 'step' : undefined}>
            <span className={styles.railDot} aria-hidden="true">{i < index ? '✓' : i + 1}</span>
            <span className={styles.railLabel}>{s.label}</span>
          </li>
        ))}
      </ol>
      <p className={styles.counter}>
        Step {index + 1} of {STEPS.length}
      </p>
      <Suspense fallback={<p className={styles.loading} aria-busy="true">Loading…</p>}>
        <Step step={step} />
      </Suspense>
    </main>
  );
}

async function Step({ step }: { step: StepId }) {
  const owner = await getOwner();
  if (!owner) redirect(`/login?next=/onboarding/${step}`);
  const shop = await getOwnerShop(owner);
  const required = requiredStep(shop, step);
  // The trial step's ?session_id return lands on branding; let it through so
  // the page can confirm the checkout before the webhook has arrived.
  if (required && !(required === 'trial' && step === 'branding')) redirect(`/onboarding/${required}`);

  if (step === 'shop' || !shop) return <ShopStep ownerEmail={owner.email} />;
  switch (step) {
    case 'trial':
      return <TrialStep shopName={shop.name} />;
    case 'branding':
      return <BrandingStep shop={shop} billingLive={required === null} />;
    case 'contact':
      return <ContactStep shop={shop} />;
    case 'products':
      return <ProductsStep shop={shop} />;
    case 'team':
      return <TeamStep ownerEmail={owner.email} />;
    case 'live': {
      const link = orderLink(shop.slug);
      const qrSvg = await QRCode.toString(link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#17202b', light: '#ffffff' } });
      return <LiveStep shop={shop} link={link} qrSvg={qrSvg} />;
    }
  }
}
