import type { ReactNode, SVGProps } from "react";

export type AngelIconName =
  | "activity"
  | "alert"
  | "audit"
  | "booking"
  | "calendar"
  | "check"
  | "clock"
  | "coverage"
  | "dashboard"
  | "diagnostic"
  | "doctor"
  | "flag"
  | "info"
  | "insurance"
  | "lock"
  | "logout"
  | "moon"
  | "play"
  | "reception"
  | "refresh"
  | "shield"
  | "slots"
  | "specialty"
  | "sun"
  | "trend"
  | "user"
  | "users"
  | "whatsapp";

type AngelIconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: AngelIconName;
  size?: number;
  title?: string;
};

const icons: Record<AngelIconName, ReactNode> = {
  activity: (
    <>
      <path d="M3 12h4l2.2-5 4.1 10 2.2-5H21" />
      <path d="M5 5.5A9 9 0 1 1 3.2 15" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.8 19h18.4L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 16.5h.01" />
    </>
  ),
  audit: (
    <>
      <path d="M9 5h6" />
      <path d="M9 3h6v4H9z" />
      <path d="M6 5H4v16h16V5h-2" />
      <path d="m8 13 2 2 5-5" />
      <path d="M8 18h8" />
    </>
  ),
  booking: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16.5 8.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4M17 3v4M3 10h18" />
      <path d="m8 15 2 2 5-5" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16.5 8.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  coverage: (
    <>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
      <path d="M8 12h2l1-2 2 4 1-2h2" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  diagnostic: (
    <>
      <path d="M12 3 5 6v5c0 4.8 2.8 8.2 7 10 4.2-1.8 7-5.2 7-10V6l-7-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-4.8" />
    </>
  ),
  doctor: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
      <path d="M8 14.2V17h8v-2.8" />
      <path d="M12 16v4M10 18h4" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 5h11l-2 4 2 4H5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  insurance: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v3" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H5v14h5" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </>
  ),
  moon: (
    <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />
  ),
  play: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8 6 4-6 4V8Z" />
    </>
  ),
  reception: (
    <>
      <path d="M4 13v-2a8 8 0 0 1 16 0v2" />
      <path d="M4 13h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2Z" />
      <path d="M20 13h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2Z" />
      <path d="M17 19c0 1.1-1.8 2-4 2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M6.1 8A7 7 0 0 1 18.8 9.5L20 12" />
      <path d="M17.9 16A7 7 0 0 1 5.2 14.5L4 12" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 4.8 2.8 8.2 7 10 4.2-1.8 7-5.2 7-10V6l-7-3Z" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  slots: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M7 2v4M17 2v4M3 9h18" />
      <path d="M8 13h3M14 13h2M8 17h2M13 17h3" />
    </>
  ),
  specialty: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M7 12h10" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  trend: (
    <>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 4-4 3 2 5-6" />
      <path d="M16 7h3v3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M14 16a5 5 0 0 1 7 4" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z" />
      <path d="M9 8.5c.8 2.6 2 3.8 4.6 4.7" />
      <path d="m9 8.5 1.2-.7 1 1.6-.7 1M13.6 13.2l1-.7 1.6 1-0.7 1.2" />
    </>
  ),
};

export default function AngelIcon({
  name,
  size = 18,
  title,
  ...props
}: AngelIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      {icons[name]}
    </svg>
  );
}
