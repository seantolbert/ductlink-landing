import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getOwner, getOwnerShop } from '@/lib/auth';
import { resumeStep } from '@/lib/onboarding';
import styles from './onboarding.module.css';

export default function OnboardingIndex() {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p className={styles.loading} aria-busy="true">Loading your setup…</p>}>
        <Resume />
      </Suspense>
    </main>
  );
}

async function Resume(): Promise<never> {
  const owner = await getOwner();
  if (!owner) redirect('/login?next=/onboarding');
  const shop = await getOwnerShop(owner);
  redirect(`/onboarding/${resumeStep(shop)}`);
}
