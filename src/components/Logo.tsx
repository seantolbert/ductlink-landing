/** DuctLink mark (the app icon's isometric box) and wordmark. */
export function Logo({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  const word = tone === 'dark' ? 'var(--ink-on-dark)' : 'var(--ink)';
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width="28" height="28" viewBox="0 0 512 512" aria-hidden="true">
        <rect width="512" height="512" rx="96" fill="#1b2430" />
        <g fill="none" stroke="#f2a33a" strokeWidth="32" strokeLinejoin="round">
          <path d="M136 196 L256 136 L376 196 L376 316 L256 376 L136 316 Z" />
          <path d="M136 196 L256 256 L376 196 M256 256 L256 376" />
        </g>
      </svg>
      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.02em', color: word }}>DuctLink</span>
    </span>
  );
}
