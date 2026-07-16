/**
 * Inline SVG icon set for the app shell. Stroke 1.75, currentColor, 24px grid.
 * Deliberately local: no icon library dependency (DESIGN.md keeps the surface small).
 */
type IconProps = React.SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function OrderIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 4.5h2l2.2 11a1.5 1.5 0 0 0 1.47 1.2h8.16a1.5 1.5 0 0 0 1.46-1.14L20.5 8.5H6.4" />
      <circle cx="9.75" cy="20" r="1.1" />
      <circle cx="16.75" cy="20" r="1.1" />
    </svg>
  );
}

export function QuotesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.5h8.5l4 4V19.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" />
      <path d="M14.5 3.5v4h4" />
      <path d="M8.5 12h7M8.5 15.5h7" />
    </svg>
  );
}

export function InvoicesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 3.5h13v17l-2.2-1.5-2.15 1.5L12 19l-2.15 1.5-2.15-1.5-2.2 1.5v-17Z" />
      <path d="M9 8.5h6M9 12h6" />
    </svg>
  );
}

export function CustomersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.1" />
      <path d="M3.5 19.5c0-3 2.5-5.4 5.5-5.4s5.5 2.4 5.5 5.4" />
      <circle cx="16.9" cy="9.2" r="2.4" />
      <path d="M16.1 14.3c2.5.4 4.4 2.6 4.4 5.2" />
    </svg>
  );
}

export function ProductsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 3.5h4M11 3.5v5.2L5.8 17a3 3 0 0 0 2.6 4.5h7.2A3 3 0 0 0 18.2 17L13 8.7V3.5" />
      <path d="M8 14.5h8" />
    </svg>
  );
}

export function ReportsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4v15.5a.5.5 0 0 0 .5.5H20" />
      <path d="M8 16v-4.5M12.5 16V8M17 16v-6" />
    </svg>
  );
}

export function PricingIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 11.2V4.5a1 1 0 0 1 1-1h6.7a1.5 1.5 0 0 1 1.06.44l7.8 7.8a1.5 1.5 0 0 1 0 2.12l-6.2 6.2a1.5 1.5 0 0 1-2.12 0l-7.8-7.8a1.5 1.5 0 0 1-.44-1.06Z" />
      <circle cx="8.2" cy="8.2" r="1.3" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9" />
      <circle cx="15" cy="7.5" r="2" />
      <circle cx="9" cy="16.5" r="2" />
    </svg>
  );
}

export function AccountIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.2" r="3.4" />
      <path d="M5 20c.7-3.4 3.6-5.6 7-5.6s6.3 2.2 7 5.6" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m9.5 6 6 6-6 6" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
