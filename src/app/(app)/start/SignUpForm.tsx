'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { browserClient } from '@/lib/supabase/browser';
import styles from '../app.module.css';

const MIN_PASSWORD = 8;

export function SignUpForm() {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    setBusy(true);
    setError(null);
    const { data, error: err } = await browserClient().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/accept?next=/onboarding` },
    });
    setBusy(false);
    if (err) {
      setError(
        err.message.toLowerCase().includes('password')
          ? err.message
          : 'Couldn’t create your login right now. Check your connection and try again.',
      );
      return;
    }
    // Email confirmation off: signed in already.
    if (data.session) {
      window.location.assign('/onboarding');
      return;
    }
    setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <div className={styles.form} role="status">
        <p className="notice notice--ok">
          We sent a link to <strong>{sentTo}</strong>. Open it on this device to confirm your email and set up your shop.
        </p>
        <p className={styles.after}>
          Already have a login? <Link href="/login?next=/onboarding">Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
      <div className="field">
        <label className="field__label" htmlFor={emailId}>
          Work email
        </label>
        <input id={emailId} className="input" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor={passwordId}>
          Password
        </label>
        <input
          id={passwordId}
          className="input"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={`${passwordId}-hint`}
        />
        <span id={`${passwordId}-hint`} className="field__hint">
          At least {MIN_PASSWORD} characters. You’ll use this to sign in to your shop inbox too.
        </span>
      </div>
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
        {busy ? 'Creating your login…' : 'Create login'}
      </button>
      <p className={styles.after}>
        Already have a login? <Link href="/login?next=/onboarding">Sign in</Link>
        <br />
        By continuing you agree to the <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.
      </p>
    </form>
  );
}
