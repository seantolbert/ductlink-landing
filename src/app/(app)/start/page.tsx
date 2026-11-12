import type { Metadata } from 'next';
import { SignUpForm } from './SignUpForm';
import styles from '../app.module.css';

export const metadata: Metadata = { title: 'Start your free trial' };

export default function StartPage() {
  return (
    <main className={styles.narrow}>
      <h1 className={styles.title}>Start your 14-day trial</h1>
      <p className={styles.lead}>Create your login, set up your shop, and send your order link to your first customer today.</p>
      <SignUpForm />
    </main>
  );
}
