/**
 * Bare shell for printable documents — deliberately outside the admin layout
 * so no sidebar, cursor or page chrome ends up on the paper (or in the
 * preview, which should match the paper exactly).
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-[var(--surface-sunken)]">{children}</div>;
}
