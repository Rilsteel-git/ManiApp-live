/* ============================================================
   IconSprite.tsx — sprite ikon design system, disalin apa adanya
   dari personal-wallet/index.html. Dirender sekali di root; semua
   ikon lain memakai <Icon name="..." /> yang menunjuk ke sini.
   ============================================================ */

export type IconName =
  | "home"
  | "settings"
  | "wallet"
  | "transfer"
  | "category"
  | "stats"
  | "user"
  | "logout"
  | "login"
  | "plus"
  | "minus"
  | "wallet-plus"
  | "arrow-in"
  | "arrow-out"
  | "search"
  | "calendar"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "arrow-right"
  | "edit"
  | "close"
  | "receipt"
  | "bank"
  | "ewallet"
  | "cash"
  | "trash"
  | "eye"
  | "eye-off"
  | "camera"
  | "alert";

export function Icon({ name, className = 'svg-icon' }: { name: IconName | string; className?: string }) {
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <use href={`#icon-${name}`} />
    </svg>
  );
}

export function IconSprite() {
  return (
    <svg className="icon-sprite" aria-hidden="true" focusable="false">
    <symbol id="icon-settings" viewBox="0 0 24 24" fill="none"><path d="M4 7h4m4 0h8M4 17h8m4 0h4"/><circle cx="10" cy="7" r="2"/><circle cx="14" cy="17" r="2"/></symbol>
    <symbol id="icon-home" viewBox="0 0 24 24" fill="none"><path d="M4 10.7 12 4.2l8 6.5V19a1.6 1.6 0 0 1-1.6 1.6h-3.2v-5.8H8.8v5.8H5.6A1.6 1.6 0 0 1 4 19v-8.3Z"/></symbol>
    <symbol id="icon-wallet" viewBox="0 0 24 24" fill="none"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h10A2.5 2.5 0 0 1 19 8.5v8A2.5 2.5 0 0 1 16.5 19h-10A2.5 2.5 0 0 1 4 16.5v-8Z"/><path d="M4 9.5h13.5A2.5 2.5 0 0 1 20 12v1a2.5 2.5 0 0 1-2.5 2.5H15A2.25 2.25 0 0 1 15 11h5"/></symbol>
    <symbol id="icon-transfer" viewBox="0 0 24 24" fill="none"><path d="M7.5 4.5v15M7.5 19.5 4.5 16M16.5 19.5v-15M16.5 4.5 19.5 8"/></symbol>
    <symbol id="icon-category" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></symbol>
    <symbol id="icon-stats" viewBox="0 0 24 24" fill="none"><path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12V3.5Z"/><path d="M15.5 3.9A8.5 8.5 0 0 1 20.1 8.5h-4.6V3.9Z"/></symbol>
    <symbol id="icon-user" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></symbol>
    <symbol id="icon-logout" viewBox="0 0 24 24" fill="none"><path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10"/><path d="M13 8l4 4-4 4M17 12H9"/></symbol>
    <symbol id="icon-login" viewBox="0 0 24 24" fill="none"><path d="M14 5h3.2A1.8 1.8 0 0 1 19 6.8v10.4a1.8 1.8 0 0 1-1.8 1.8H14"/><path d="m11 8-4 4 4 4M7 12h8"/></symbol>
    <symbol id="icon-plus" viewBox="0 0 24 24" fill="none"><path d="M12 5.5v13M5.5 12h13"/></symbol>
    <symbol id="icon-minus" viewBox="0 0 24 24" fill="none"><path d="M5.5 12h13"/></symbol>
    <symbol id="icon-wallet-plus" viewBox="0 0 24 24" fill="none"><path d="M19 11V8.5A2.5 2.5 0 0 0 16.5 6h-10A2.5 2.5 0 0 0 4 8.5v8A2.5 2.5 0 0 0 6.5 19h6"/><path d="M4 9.5h13.5"/><path d="M17.5 14.5v5M15 17h5"/></symbol>
    <symbol id="icon-arrow-in" viewBox="0 0 24 24" fill="none"><path d="M16.5 7.5 7.5 16.5M9 7.5h7.5V15"/></symbol>
    <symbol id="icon-arrow-out" viewBox="0 0 24 24" fill="none"><path d="M7.5 16.5 16.5 7.5M15 16.5H7.5V9"/></symbol>
    <symbol id="icon-search" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6"/><path d="m15.5 15.5 4 4"/></symbol>
    <symbol id="icon-calendar" viewBox="0 0 24 24" fill="none"><rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></symbol>
    <symbol id="icon-chevron-down" viewBox="0 0 24 24" fill="none"><path d="m7 10 5 5 5-5"/></symbol>
    <symbol id="icon-chevron-left" viewBox="0 0 24 24" fill="none"><path d="m14 6-6 6 6 6"/></symbol>
    <symbol id="icon-chevron-right" viewBox="0 0 24 24" fill="none"><path d="m10 6 6 6-6 6"/></symbol>
    <symbol id="icon-arrow-right" viewBox="0 0 24 24" fill="none"><path d="M4.5 12h15M14 6.5l5.5 5.5L14 17.5"/></symbol>
    <symbol id="icon-edit" viewBox="0 0 24 24" fill="none"><path d="M5 19h3l9-9a2.1 2.1 0 0 0-3-3l-9 9v3Z"/><path d="m14 8 2 2"/></symbol>
    <symbol id="icon-close" viewBox="0 0 24 24" fill="none"><path d="m7 7 10 10M17 7 7 17"/></symbol>
    <symbol id="icon-receipt" viewBox="0 0 24 24" fill="none"><path d="M6 3.8h12v16.4l-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6L6 20.2V3.8Z"/><path d="M9.5 9h5M9.5 13h5"/></symbol>
    <symbol id="icon-bank" viewBox="0 0 24 24" fill="none"><path d="M4 10 12 5l8 5"/><path d="M6 10v7M10 10v7M14 10v7M18 10v7M4 20h16"/></symbol>
    <symbol id="icon-ewallet" viewBox="0 0 24 24" fill="none"><rect x="6.5" y="3.5" width="11" height="17" rx="2.5"/><path d="M10.5 17h3"/></symbol>
    <symbol id="icon-cash" viewBox="0 0 24 24" fill="none"><rect x="3.5" y="7" width="17" height="10" rx="2.5"/><circle cx="12" cy="12" r="2.2"/><path d="M6.5 12h.01M17.5 12h.01"/></symbol>
    <symbol id="icon-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16"/><path d="M9.5 7V5.4A1.4 1.4 0 0 1 10.9 4h2.2a1.4 1.4 0 0 1 1.4 1.4V7"/><path d="M6.5 7 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5L17.5 7"/><path d="M10.5 11v5.5M13.5 11v5.5"/></symbol>
    <symbol id="icon-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></symbol>
    <symbol id="icon-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.2 4"/><path d="M6.3 7.8A16.7 16.7 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 3.9-.8"/><path d="m10 10a2.8 2.8 0 0 0 4 4"/><path d="m3.5 3.5 17 17"/></symbol>
    <symbol id="icon-camera" viewBox="0 0 24 24" fill="none"><path d="M3.5 9.5A2 2 0 0 1 5.5 7.5h1.9l1.2-2h6.8l1.2 2h1.9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-7Z"/><circle cx="12" cy="13" r="3.2"/></symbol>
    <symbol id="icon-alert" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5M12 16h.01"/></symbol>
    </svg>
  );
}
