'use client';

import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';
import { browserClient } from '@/lib/supabase/browser';
import styles from '../app.module.css';

/** Only same-site paths, so `?next=` can't send someone off-site. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get('next') ?? '';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/account';
}

export function SignInForm() {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'reset' | 'resetSent'>('password');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await browserClient().auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setBusy(false);
      setError(
        err.message.toLowerCase().includes('invalid')
          ? 'That email and password don’t match. Check them and try again.'
          : err.message.toLowerCase().includes('confirm')
            ? 'Confirm your email first: open the link we sent you.'
            : 'Couldn’t sign in right now. Check your connection and try again.',
      );
      return;
    }
    window.location.assign(nextPath());
  };

  const sendReset = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    await browserClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/accept?set=password&next=/account`,
    });
    setBusy(false);
    // Same message whether or not the email has a login.
    setMode('resetSent');
  };

  if (mode === 'resetSent') {
    return (
      <div className={styles.form} role="status">
        <p className="notice notice--ok">If {email.trim()} has a DuctLink login, a reset link is on its way. Open it on this device.</p>
        <button type="button" className={styles.linkButton} onClick={() => setMode('password')}>
          Back to sign in
        </button>
      </div>
    );
  }

  const isReset = mode === 'reset';
  return (
    <form className={styles.form} onSubmit={(e) => void (isReset ? sendReset(e) : signIn(e))} noValidate>
      <div className="field">
        <label className="field__label" htmlFor={emailId}>
          Email
        </label>
        <input id={emailId} className="input" type="email" inputMode="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {!isReset && (
        <div className="field">
          <label className="field__label" htmlFor={passwordId}>
            Password
          </label>
          <input id={passwordId} className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      )}
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy || !email.trim()}>
        {isReset ? (busy ? 'Sending…' : 'Email me a reset link') : busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className={styles.after}>
        <button type="button" className={styles.linkButton} onClick={() => { setError(null); setMode(isReset ? 'password' : 'reset'); }}>
          {isReset ? 'Back to sign in' : 'Forgot your password?'}
        </button>
        <br />
        New to DuctLink? <Link href="/start">Start a free trial</Link>
      </p>
    </form>
  );
}
