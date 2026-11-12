import type { Metadata } from 'next';
import { AcceptLink } from './AcceptLink';
import styles from '../../app.module.css';

export const metadata: Metadata = { title: 'Signing you in', robots: { index: false } };

/** Where email links land: sign-up confirmation, staff invites, password resets. */
export default function AcceptPage() {
  return (
    <main className={styles.narrow}>
      <AcceptLink />
    </main>
  );
}
