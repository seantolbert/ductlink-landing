import Link from 'next/link';
import { Logo } from '@/components/Logo';
import styles from './app.module.css';

/** Sign-up, sign-in, onboarding, and account: a plain bar, no marketing chrome. */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className={styles.shell}>
      <header className={styles.bar}>
        <Link href="/" aria-label="DuctLink home">
          <Logo tone="dark" />
        </Link>
        <Link href="/learn" className={styles.barLink}>
          Help videos
        </Link>
      </header>
      {children}
    </div>
  );
}
