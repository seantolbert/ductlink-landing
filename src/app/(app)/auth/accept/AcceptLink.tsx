'use client';

import type { EmailOtpType } from '@supabase/supabase-js';
import Link from 'next/link';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { INBOX_URL } from '@/lib/env';
import { browserClient } from '@/lib/supabase/browser';
import styles from '../../app.module.css';

type State = { kind: 'working' } | { kind: 'failed'; message: string } | { kind: 'setPassword' };

const MIN_PASSWORD = 8;

/** `next` is a same-site path, or `inbox` for the shop inbox in the app. */
function destination(next: string | null): string {
  if (next === 'inbox') return INBOX_URL;
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/onboarding';
}

/**
 * Turns an emailed link into a session, whichever form Supabase sent:
 *   #access_token=…  invites (implicit flow; PKCE isn't possible for invites)
 *   ?token_hash=…    custom email templates
 *   ?code=…          sign-up and reset links from this browser (PKCE; the
 *                    client exchanges it on load)
 * Then asks for a password when `set=password`, and moves on.
 */
export function AcceptLink() {
  const [state, setState] = useState<State>({ kind: 'working' });
  const [next, setNext] = useState('/onboarding');

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const to = destination(query.get('next'));
    const wantsPassword = query.get('set') === 'password';
    setNext(to);

    const run = async () => {
      const supabase = browserClient();
      const linkError = hash.get('error_description') ?? query.get('error_description');
      if (linkError) throw new Error(linkError);

      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      const tokenHash = query.get('token_hash');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) throw error;
      } else if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: (query.get('type') ?? 'email') as EmailOtpType });
        if (error) throw error;
      }
      // Waits for the client's own ?code= exchange, if there was one.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw new Error(
          query.has('code')
            ? 'This link has to be opened in the same browser you signed up in. Sign in below instead.'
            : 'This link has expired or was already used.',
        );
      }
      // Keep tokens out of the address bar and history.
      window.history.replaceState(null, '', window.location.pathname);
      if (wantsPassword) setState({ kind: 'setPassword' });
      else window.location.replace(to);
    };

    run().catch((err: unknown) => {
      setState({ kind: 'failed', message: err instanceof Error ? err.message : 'This link didn’t work.' });
    });
  }, []);

  if (state.kind === 'working') {
    return (
      <p className={styles.lead} role="status" aria-busy="true">
        Signing you in…
      </p>
    );
  }
  if (state.kind === 'failed') {
    return (
      <div>
        <h1 className={styles.title}>That link didn’t work</h1>
        <p className="notice notice--error" role="alert" style={{ marginTop: 20 }}>
          {state.message}
        </p>
        <p className={styles.after}>
          <Link href={`/login?next=${encodeURIComponent(next.startsWith('/') ? next : '/account')}`}>Sign in</Link> or ask for a new link.
        </p>
      </div>
    );
  }
  return <SetPassword next={next} />;
}

function SetPassword({ next }: { next: string }) {
  const id = useId();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await browserClient().auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    window.location.replace(next);
  };

  return (
    <>
      <h1 className={styles.title}>Set your password</h1>
      <p className={styles.lead}>You’ll use your email and this password to sign in to the shop inbox.</p>
      <form className={styles.form} onSubmit={(e) => void submit(e)} noValidate>
        <div className="field">
          <label className="field__label" htmlFor={id}>
            New password
          </label>
          <input id={id} className="input" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} value={password} onChange={(e) => setPassword(e.target.value)} />
          <span className="field__hint">At least {MIN_PASSWORD} characters.</span>
        </div>
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? 'Saving…' : 'Save and continue'}
        </button>
      </form>
    </>
  );
}
