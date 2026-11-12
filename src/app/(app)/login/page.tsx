import type { Metadata } from 'next';
import { SignInForm } from './SignInForm';
import styles from '../app.module.css';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className={styles.narrow}>
      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.lead}>Manage your shop’s setup, team, and billing.</p>
      <SignInForm />
    </main>
  );
}
