/**
 * Google and Facebook sign-in. Google is fully wired end-to-end
 * (`/api/auth/google/start` → Google → `/api/auth/google/callback`) and
 * activates the moment an admin pastes a client ID/secret into
 * Settings → Integrations. Facebook follows the identical pattern but its
 * backend route isn't built yet, so its button stays disabled until it is —
 * neither button ever claims to work before it does.
 */
export function OAuthButtons({
  googleEnabled,
  facebookEnabled,
  next,
}: {
  googleEnabled: boolean;
  facebookEnabled: boolean;
  next?: string;
}) {
  const googleHref = `/api/auth/google/start${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <div className="grid grid-cols-2 gap-3">
      {googleEnabled ? (
        <a
          href={googleHref}
          className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-ink-700 bg-[var(--surface)] text-[13.5px] font-semibold text-ink-100 transition-colors hover:border-ink-500"
        >
          <GoogleIcon />
          Google
        </a>
      ) : (
        <span
          title="Not configured yet — an admin needs to add Google credentials in Settings."
          className="flex h-12 cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-ink-800 text-[13.5px] font-semibold text-ink-600"
        >
          <GoogleIcon muted />
          Google
        </span>
      )}

      <span
        title={
          facebookEnabled
            ? 'Facebook sign-in'
            : 'Not available yet — Facebook sign-in is not switched on for this site.'
        }
        className="flex h-12 cursor-not-allowed items-center justify-center gap-2.5 rounded-xl border border-ink-800 text-[13.5px] font-semibold text-ink-600"
      >
        <FacebookIcon />
        Facebook
      </span>
    </div>
  );
}

function GoogleIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ opacity: muted ? 0.4 : 1 }}>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.93.46 3.76 1.27 5.38l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden style={{ opacity: 0.4 }}>
      <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z" />
    </svg>
  );
}
