/**
 * The open ring + wordmark (brand guidelines §3).
 * The ring's 60° opening always faces right — forward, toward the road.
 * Never closed, narrowed or rotated. Wordmark is always lowercase,
 * "open" in ink, "lease" in the accent.
 */

// Ring with a 60° gap centred on 0° (facing right): arc from 30° to 330°.
// The gap faces right in every locale, including RTL — it's the idea.
export function OpenRing({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M 19.794 7.5 A 9 9 0 1 0 19.794 16.5"
        stroke="currentColor"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={`font-[family-name:var(--font-display)] font-bold lowercase leading-none tracking-tight ${className ?? ""}`}
    >
      open<span className="text-accent">lease</span>
    </span>
  );
}

export function Logo({
  className,
  ringClassName = "h-6 w-6",
  textClassName = "text-xl",
  reverse = false,
}: {
  className?: string;
  ringClassName?: string;
  textClassName?: string;
  /** On ink backgrounds the wordmark's "open" flips to white. */
  reverse?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <OpenRing className={`shrink-0 text-accent ${ringClassName}`} />
      <span
        className={`font-[family-name:var(--font-display)] font-bold lowercase leading-none tracking-tight ${
          reverse ? "text-white" : "text-ink"
        } ${textClassName}`}
      >
        open<span className="text-accent">lease</span>
      </span>
    </span>
  );
}
