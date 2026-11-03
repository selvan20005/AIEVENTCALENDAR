// Thin-stroke icon set (1.3px) for the minimalist look.
const s = (p, w = 1.3) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

export const I = {
  cal: s('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  star: s('<path d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6L12 16.6l-5 2.6.9-5.6-4-3.9 5.6-.8z"/>'),
  check: s('<path d="M5 12.5l4.2 4.2L19 7"/>', 1.6),
  bell: s('<path d="M6 16v-5a6 6 0 1112 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 004 0"/>'),
  gear: s('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
  search: s('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  filter: s('<path d="M4 6h16M7 12h10M10 18h4"/>'),
  left: s('<path d="M14.5 6l-6 6 6 6"/>'),
  right: s('<path d="M9.5 6l6 6-6 6"/>'),
  globe: s('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.7 5.4 3.7 8.5s-1.2 5.9-3.7 8.5c-2.5-2.6-3.7-5.4-3.7-8.5s1.2-5.9 3.7-8.5z"/>'),
  lock: s('<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 118 0v2.5"/>'),
  face: s('<path d="M4 8V6.5A2.5 2.5 0 016.5 4H8M16 4h1.5A2.5 2.5 0 0120 6.5V8M20 16v1.5a2.5 2.5 0 01-2.5 2.5H16M8 20H6.5A2.5 2.5 0 014 17.5V16"/><path d="M9 9.5v1.2M15 9.5v1.2M12 9.5v3.5h-1M9.5 15.5c1.4 1.2 3.6 1.2 5 0"/>'),
  share: s('<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M6 11.5H5.5A1.5 1.5 0 004 13v6a1.5 1.5 0 001.5 1.5h13A1.5 1.5 0 0020 19v-6a1.5 1.5 0 00-1.5-1.5H18"/>'),
  download: s('<path d="M12 4v11M8 11l4 4 4-4M5 19.5h14"/>'),
  link: s('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'),
  x: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  shield: s('<path d="M12 3l7 3v5.5c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5V6z"/><path d="M9 12l2 2 4-4"/>', 1.5),
  clock: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  pin: s('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1113 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>'),
  play: s('<circle cx="12" cy="12" r="8.5"/><path d="M10.2 8.8l5 3.2-5 3.2z"/>'),
  ext: s('<path d="M14 4h6v6M20 4l-9 9M18 14v4.5A1.5 1.5 0 0116.5 20h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10"/>'),
  sparkle: s('<path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>'),
  user: s('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3"/>'),
};
