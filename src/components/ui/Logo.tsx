/**
 * DRS 3D WORLD mark — a printer gantry extruding onto a build plate,
 * redrawn as vector from the studio's visiting card.
 *
 * Used whenever the administrator has not uploaded a custom logo.
 */
export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id="drs-mark-flame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff9d63" />
          <stop offset="100%" stopColor="#ff6b00" />
        </linearGradient>
      </defs>
      {/* Gantry uprights + top beam */}
      <path
        d="M8 40V12a2 2 0 0 1 2-2h28a2 2 0 0 1 2 2v28"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity="0.85"
      />
      {/* Carriage rail */}
      <path d="M12 17h24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
      {/* Extruder body */}
      <rect x="20" y="13" width="8" height="8" rx="1.6" fill="currentColor" opacity="0.9" />
      {/* Nozzle */}
      <path d="M24 21v3.5" stroke="url(#drs-mark-flame)" strokeWidth="2.4" strokeLinecap="round" />
      {/* Printed cube on the plate */}
      <path
        d="M24 26.5l7 3.6v7.2l-7 3.6-7-3.6v-7.2l7-3.6z"
        fill="url(#drs-mark-flame)"
        opacity="0.95"
      />
      <path d="M24 26.5v14.4M17 30.1l7 3.7 7-3.7" stroke="#050506" strokeWidth="1.1" opacity="0.35" />
    </svg>
  );
}

/**
 * Full lockup. When `src` is set the administrator has uploaded a logo, and it
 * replaces both the mark and the wordmark — an uploaded logo is assumed to be
 * a complete lockup, since that is what a studio's brand file normally is.
 */
export function Logo({
  compact = false,
  src = null,
  alt = 'DRS 3D WORLD',
  className = '',
  onDarkChip = false,
}: {
  compact?: boolean;
  src?: string | null;
  alt?: string;
  className?: string;
  /**
   * Set when the only lockup available was drawn for a dark background and
   * the page is light. Most studio brand files are exported that way, and
   * dropping one straight onto white leaves a black rectangle floating in the
   * header. The chip gives it the dark surround it was designed against, so
   * it reads as a badge instead of a mistake. Upload a light-theme logo in
   * Settings → Logo &amp; favicon and this disappears.
   */
  onDarkChip?: boolean;
}) {
  if (src) {
    // Plain <img>: uploaded logos are arbitrary user files of unknown
    // dimensions, and running them through the image optimiser buys nothing
    // at this size while adding a failure mode.
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`w-auto object-contain ${compact ? 'h-8' : 'h-10'} ${onDarkChip ? '' : className}`}
      />
    );

    if (!onDarkChip) return img;

    return (
      <span
        className={`inline-flex items-center rounded-xl bg-ink-100 px-2.5 py-1.5 ring-1 ring-black/10 ${className}`}
      >
        {img}
      </span>
    );
  }

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-8 text-white" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-bold tracking-tight">
            DRS <span className="text-flame-500">3D</span>
          </span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.42em] text-ink-300">
            World
          </span>
        </span>
      )}
    </span>
  );
}
