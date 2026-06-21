"use client";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function Icon({ name, size = 20, className = "", fill }) {
  const p = { ...base, width: size, height: size, viewBox: "0 0 24 24", className };
  switch (name) {
    case "search":
      return (
        <svg {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
      );
    case "sliders":
      return (
        <svg {...p}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h7M15 18h5" /><circle cx="16" cy="6" r="1.6" /><circle cx="8" cy="12" r="1.6" /><circle cx="13" cy="18" r="1.6" /></svg>
      );
    case "heart":
      return (
        <svg {...p} fill={fill || "none"}><path d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5.5 5.5 5.5c2 0 3 1.2 3.5 2 .5-.8 1.5-2 3.5-2 3 0 4.5 3 3 6C19 15.65 12 20 12 20z" /></svg>
      );
    case "bookmark":
      return (
        <svg {...p} fill={fill || "none"}><path d="M6 4h12v16l-6-4-6 4z" /></svg>
      );
    case "pin":
      return (
        <svg {...p}><path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.4" /></svg>
      );
    case "star":
      return (
        <svg {...p} fill={fill || "none"}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" /></svg>
      );
    case "people":
      return (
        <svg {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0112 0" /><path d="M16 6a3 3 0 010 6M22 20a6 6 0 00-5-5.9" /></svg>
      );
    case "cup":
      return (
        <svg {...p}><path d="M5 8h11v5a5 5 0 01-5 5H10a5 5 0 01-5-5z" /><path d="M16 9h2.5a2.5 2.5 0 010 5H16" /><path d="M8 3c-.6.8-.6 1.7 0 2.5M11.5 3c-.6.8-.6 1.7 0 2.5" /></svg>
      );
    case "compass":
      return (
        <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></svg>
      );
    case "user":
      return (
        <svg {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0114 0" /></svg>
      );
    case "trophy":
      return (
        <svg {...p}><path d="M7 4h10v3a5 5 0 01-10 0z" /><path d="M7 5H4v1a3 3 0 003 3M17 5h3v1a3 3 0 01-3 3" /><path d="M12 12v4M9 20h6M10 16h4" /></svg>
      );
    case "back":
      return (
        <svg {...p}><path d="M15 5l-7 7 7 7" /></svg>
      );
    case "directions":
      return (
        <svg {...p}><path d="M12 2l10 10-10 10L2 12z" /><path d="M9 13v-2a2 2 0 012-2h4" /><path d="M13 7l2 2-2 2" /></svg>
      );
    case "share":
      return (
        <svg {...p}><circle cx="6" cy="12" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="17" cy="18" r="2.5" /><path d="M8.2 11l6.6-3.8M8.2 13l6.6 3.8" /></svg>
      );
    case "plus":
      return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>;
    case "check":
      return <svg {...p}><path d="M5 12l4.5 4.5L19 7" /></svg>;
    case "clock":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case "phone":
      return <svg {...p}><path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" /></svg>;
    case "globe":
      return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>;
    case "dots":
      return <svg {...p}><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></svg>;
    case "near":
      return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
    case "chat":
      return <svg {...p}><path d="M5 5h14a2 2 0 012 2v7a2 2 0 01-2 2H9l-4 4V7a2 2 0 012-2z" /></svg>;
    case "menu":
      return <svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
    case "home":
      return <svg {...p}><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10.5V20h12v-9.5" /><path d="M10 20v-5h4v5" /></svg>;
    case "edit":
      return <svg {...p}><path d="M4 20h4L18 10l-4-4L4 16z" /><path d="M13 7l4 4" /></svg>;
    case "list":
      return <svg {...p}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>;
    case "grid":
      return <svg {...p}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>;
    case "x":
      return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "lock":
      return <svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>;
    default:
      return null;
  }
}
