// ===== أيقونات السوشيال ميديا بـ SVG =====
// استخدم هذا الملف في أي مكان بالمشروع

export const TikTokIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#010101"/>
    <path d="M16.6 5.82a4.49 4.49 0 0 1-1.06-2.82h-2.28v11.4c0 1.22-.99 2.2-2.22 2.2a2.21 2.21 0 0 1-2.21-2.2 2.21 2.21 0 0 1 2.21-2.21c.22 0 .43.03.63.09V9.97a4.5 4.5 0 0 0-.63-.04 4.5 4.5 0 0 0-4.5 4.5 4.5 4.5 0 0 0 4.5 4.5 4.5 4.5 0 0 0 4.5-4.5V9.61a6.77 6.77 0 0 0 3.97 1.27V8.62a4.5 4.5 0 0 1-2.91-2.8z" fill="white"/>
    <path d="M16.6 5.82a4.49 4.49 0 0 1-1.06-2.82h-2.28v11.4c0 1.22-.99 2.2-2.22 2.2a2.21 2.21 0 0 1-2.21-2.2 2.21 2.21 0 0 1 2.21-2.21c.22 0 .43.03.63.09V9.97a4.5 4.5 0 0 0-.63-.04 4.5 4.5 0 0 0-4.5 4.5 4.5 4.5 0 0 0 4.5 4.5 4.5 4.5 0 0 0 4.5-4.5V9.61a6.77 6.77 0 0 0 3.97 1.27V8.62a4.5 4.5 0 0 1-2.91-2.8z" fill="#69C9D0" opacity="0.7"/>
  </svg>
);

export const InstagramIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <radialGradient id="ig1" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497"/>
        <stop offset="5%" stopColor="#fdf497"/>
        <stop offset="45%" stopColor="#fd5949"/>
        <stop offset="60%" stopColor="#d6249f"/>
        <stop offset="90%" stopColor="#285AEB"/>
      </radialGradient>
    </defs>
    <rect width="24" height="24" rx="6" fill="url(#ig1)"/>
    <rect x="6" y="6" width="12" height="12" rx="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.5" fill="none"/>
    <circle cx="16.2" cy="7.8" r="0.9" fill="white"/>
  </svg>
);

export const FacebookIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#1877F2"/>
    <path d="M13.5 21v-7.5h2.25l.375-2.625H13.5V9.75c0-.75.375-1.5 1.5-1.5h1.5V5.625S15.375 5.25 14.25 5.25c-2.25 0-3.75 1.5-3.75 3.75v1.875H8.25V13.5H10.5V21" fill="white"/>
  </svg>
);

export const TwitterXIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#000000"/>
    <path d="M18 5.5L13.28 10.93 18.77 18.5H14.6L11.2 13.8 7.3 18.5H5L10.07 12.68 4.8 5.5H9.1L12.2 9.85 15.8 5.5H18ZM15.3 17.1L7.6 6.9H6.7L14.5 17.1H15.3Z" fill="white"/>
  </svg>
);

export const WhatsAppIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#25D366"/>
    <path d="M12 4.5a7.5 7.5 0 0 0-6.5 11.22L4.5 19.5l3.9-1.02A7.5 7.5 0 1 0 12 4.5zm0 13.5a6 6 0 0 1-3.06-.84l-.22-.13-2.3.6.62-2.24-.14-.23A6 6 0 1 1 12 18zm3.3-4.5c-.18-.09-1.06-.52-1.22-.58-.17-.06-.29-.09-.41.09-.12.18-.46.58-.57.7-.1.12-.21.13-.39.04a4.87 4.87 0 0 1-2.44-2.13c-.18-.32.18-.3.53-.98.06-.12.03-.22-.02-.31-.04-.09-.41-1-.56-1.37-.15-.36-.3-.31-.41-.31h-.35c-.12 0-.31.04-.47.22-.16.18-.62.6-.62 1.47s.63 1.7.72 1.82c.09.12 1.24 1.9 3 2.66.42.18.74.29 1 .37.42.13.8.11 1.1.07.34-.05 1.04-.43 1.19-.84.14-.41.14-.76.1-.84-.05-.09-.17-.13-.35-.22z" fill="white"/>
  </svg>
);