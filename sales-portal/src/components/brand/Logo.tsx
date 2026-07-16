/**
 * LA Peptides wordmark — recreates the triangle mark + "LA PEPTIDES" lockup used in the
 * company's existing pricing-sheet letterhead, as an inline SVG so it stays crisp at any
 * size and matches the teal brand color exactly (#00C4A7) without shipping a raster asset.
 */
export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2L22 20H2L12 2Z" fill="#0DA5BC" />
      </svg>
      {showWordmark && (
        <span className="font-heading text-lg font-semibold tracking-tight text-lap-ink">
          LA <span className="text-lap-teal">PEPTIDES</span>
        </span>
      )}
    </span>
  );
}
