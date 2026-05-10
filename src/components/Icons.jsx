import React from "react";

// Lucide-style icon set — 1.75 stroke, 24×24 viewBox, currentColor.
// Each component takes { size = 20, ...props } and forwards SVG props.
const I = ({ size = 20, children, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}
    {...props}
  >
    {children}
  </svg>
);

export const IconHome      = (p) => <I {...p}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" /></I>;
export const IconBox       = (p) => <I {...p}><path d="M21 8 12 3 3 8m18 0v8l-9 5-9-5V8m18 0L12 13M3 8l9 5m0 0v8" /></I>;
export const IconTag       = (p) => <I {...p}><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><circle cx="7" cy="7" r="1.5" /></I>;
export const IconFolder    = (p) => <I {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></I>;
export const IconStar      = (p) => <I {...p}><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></I>;
export const IconCart      = (p) => <I {...p}><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /><path d="M3 3h2l3 12h12l3-8H6" /></I>;
export const IconSettings  = (p) => <I {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></I>;
export const IconUsers     = (p) => <I {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></I>;
export const IconTicket    = (p) => <I {...p}><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" /><path d="M13 5v14" strokeDasharray="2 2" /></I>;
export const IconUpload    = (p) => <I {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></I>;
export const IconPlus      = (p) => <I {...p}><path d="M12 5v14M5 12h14" /></I>;
export const IconBell      = (p) => <I {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></I>;
export const IconSearch    = (p) => <I {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></I>;
export const IconArrowLeft = (p) => <I {...p}><path d="m15 18-6-6 6-6" /></I>;
export const IconArrowRight= (p) => <I {...p}><path d="m9 18 6-6-6-6" /></I>;
export const IconChevDown  = (p) => <I {...p}><path d="m6 9 6 6 6-6" /></I>;
export const IconCheck     = (p) => <I {...p}><path d="M20 6 9 17l-5-5" /></I>;
export const IconClose     = (p) => <I {...p}><path d="M18 6 6 18M6 6l12 12" /></I>;
export const IconEdit      = (p) => <I {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="m18.5 2.5 3 3L12 15l-4 1 1-4z" /></I>;
export const IconTrash     = (p) => <I {...p}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></I>;
export const IconEye       = (p) => <I {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8" /><circle cx="12" cy="12" r="3" /></I>;
export const IconEyeOff    = (p) => <I {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" /></I>;
export const IconLogout    = (p) => <I {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></I>;
export const IconStore     = (p) => <I {...p}><path d="m3 9 1-5h16l1 5M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M9 21v-7h6v7" /><path d="M3 9h18" /></I>;
export const IconChart     = (p) => <I {...p}><path d="M3 3v18h18" /><path d="m7 14 3-3 4 4 5-5" /></I>;
export const IconWallet    = (p) => <I {...p}><path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" /><path d="M22 12h-4a2 2 0 0 0 0 4h4z" /></I>;
export const IconTruck     = (p) => <I {...p}><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></I>;
export const IconAlert     = (p) => <I {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0M12 9v4M12 17h.01" /></I>;
export const IconClock     = (p) => <I {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></I>;
export const IconLock      = (p) => <I {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></I>;
export const IconDownload  = (p) => <I {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></I>;
export const IconRefresh   = (p) => <I {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" /></I>;
export const IconFilter    = (p) => <I {...p}><path d="M22 3H2l8 9.5V19l4 2v-8.5z" /></I>;
export const IconMenu      = (p) => <I {...p}><path d="M3 6h18M3 12h18M3 18h18" /></I>;
export const IconDot       = (p) => <I {...p}><circle cx="12" cy="12" r="3" fill="currentColor" /></I>;
export const IconImage     = (p) => <I {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></I>;
export const IconMail      = (p) => <I {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></I>;
export const IconPhone     = (p) => <I {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92" /></I>;
export const IconReceipt   = (p) => <I {...p}><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2z" /><path d="M8 8h8M8 12h8M8 16h5" /></I>;
export const IconSparkles  = (p) => <I {...p}><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" /></I>;
export const IconShield    = (p) => <I {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /></I>;
export const IconLayers    = (p) => <I {...p}><path d="m12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5" /></I>;
export const IconCheckCircle = (p) => <I {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></I>;
