/* Sigilos SVG procedurales — todo el arte procedural de cartas es vectorial */
import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  sword: <><path d="M5 19l3.5-3.5M6 21l-3-3 2-2 3 3-2 2z" /><path d="M8.5 15.5L19 5l-1.5-1.5L7 14" /><path d="M17 3l4 4" /></>,
  shield: <><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" /><path d="M12 7v10M8.5 10h7" /></>,
  helm: <><path d="M5 13a7 7 0 0 1 14 0v6H5v-6z" /><path d="M9 13v6M15 13v6M5 16h14" /></>,
  axe: <><path d="M6 20L17 9" /><path d="M14 4c3 0 6 2 6 5-3 0-5-1-7-3-1 2-1 4 0 6-3-1-4-5 1-8z" /></>,
  banner: <><path d="M6 3v18M6 4h12l-3 4 3 4H6" /></>,
  bannerBroken: <><path d="M6 3v18M6 4h12l-3 4h-4" /><path d="M13 12l5 0-3 4H9" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></>,
  bow: <><path d="M5 3c6 4 8 10 8 18" /><path d="M5 3c1 6 3 12 8 18" /><path d="M5 3l14 14" /><path d="M16 14l3 3-1 1-3-3" /></>,
  moon: <><path d="M19 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 9 10z" /></>,
  leaf: <><path d="M5 19C5 9 12 4 20 4c0 9-5 15-15 15z" /><path d="M5 19c3-5 7-9 11-11" /></>,
  paw: <><circle cx="7" cy="8" r="1.8" /><circle cx="12" cy="6" r="1.8" /><circle cx="17" cy="8" r="1.8" /><path d="M12 11c3 0 6 2.5 6 5.5 0 2-1.5 3-3 2.5-1.2-.4-2-1-3-1s-1.8.6-3 1c-1.5.5-3-.5-3-2.5 0-3 3-5.5 6-5.5z" /></>,
  horn: <><path d="M4 20C6 12 10 7 20 4c-2 4-3 7-3 10-3 0-6 2-8 6H4z" /><path d="M20 4c-1 6-3 10-7 12" /></>,
  fang: <><path d="M4 6c2 2 5 3 8 3s6-1 8-3c-1 6-3 12-5 14l-1.5-3h-3L9 20C7 18 5 12 4 6z" /></>,
  gem: <><path d="M7 4h10l4 5-9 11L3 9l4-5z" /><path d="M3 9h18M12 20L8 9l4-5 4 5-4 11" /></>,
  hammer: <><path d="M5 21l6-8" /><path d="M9 5l4-3 7 6-4 3-7-6z" /><path d="M13 2l2-1 6 6-1 2" /></>,
  flask: <><path d="M10 3h4M11 3v5l-6 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-6-9V3" /><path d="M7.5 15h9" /></>,
  ice: <><path d="M12 2v20M4 6l16 12M20 6L4 18" /><path d="M12 2l-2 3h4l-2-3zM12 22l-2-3h4l-2 3z" /></>,
  skull: <><path d="M12 3a8 8 0 0 0-8 8c0 3 1.5 5 3.5 6.5V21h9v-3.5C18.5 16 20 14 20 11a8 8 0 0 0-8-8z" /><circle cx="9" cy="11" r="1.6" /><circle cx="15" cy="11" r="1.6" /><path d="M12 14l-1 2h2l-1-2z" /></>,
  heart: <><path d="M12 20S4 15 4 9a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 6-8 11-8 11z" /></>,
  up: <><path d="M12 20V6M6 12l6-6 6 6" /><path d="M5 20h14" /></>,
  dagger: <><path d="M12 2l3 5-3 10-3-10 3-5z" /><path d="M7 12h10M12 17v5M9 22h6" /></>,
  wolf: <><path d="M4 5l4 3h8l4-3-1 7c0 5-3 9-7 9s-7-4-7-9L4 5z" /><path d="M9 12l1 1M15 12l-1 1M12 16l-1.5 2h3L12 16z" /></>,
  claw: <><path d="M5 4c1 5 1 9 0 13M10 3c1 5 1 10 0 15M15 3c1 5 1 10 0 15M20 5c0 4-1 8-3 12" /></>,
  moonFang: <><path d="M18 13A7 7 0 1 1 10 4a5.5 5.5 0 0 0 8 9z" /><path d="M17 17l1.5 4 1-3.5" /></>,
  fist: <><path d="M7 11V7a2 2 0 0 1 4 0v3M11 10V5a2 2 0 0 1 4 0v5M15 10V7a2 2 0 0 1 4 0v6c0 5-3 8-7 8s-7-3-7-8v-3a2 2 0 0 1 4 0" /></>,
  snake: <><path d="M4 18c4 0 4-4 8-4s4 4 8 4" /><path d="M4 10c4 0 4 4 8 4" /><path d="M19 6a2 2 0 1 1-2 4" /><path d="M18.5 7.5l2-2M19 10l2 1" /></>,
  bat: <><path d="M12 6c1 2 1 4 0 6-2-1-4 0-6 2 1-4-1-6-4-6 2-2 5-3 7-2l3-4 3 4c2-1 5 0 7 2-3 0-5 2-4 6-2-2-4-3-6-2-1-2-1-4 0-6z" /></>,
  wave: <><path d="M3 8c3 0 3 3 6 3s3-3 6-3 3 3 6 3" /><path d="M3 14c3 0 3 3 6 3s3-3 6-3 3 3 6 3" /><path d="M12 3v2M9 4l1 1.5M15 4l-1 1.5" /></>,
  imp: <><path d="M12 4c4 0 7 3 7 7 0 5-3 9-7 9s-7-4-7-9c0-4 3-7 7-7z" /><path d="M5 6L3 2l4 2M19 6l2-4-4 2" /><path d="M9 11l1.5 1M15 11l-1.5 1M8 15c2.5 2 5.5 2 8 0" /></>,
  demon: <><path d="M12 5c4 0 7 3 7 7 0 4-2.5 8-7 8s-7-4-7-8c0-4 3-7 7-7z" /><path d="M6 7C4 5 4 3 5 1c1 2 3 2 4 3M18 7c2-2 2-4 1-6-1 2-3 2-4 3" /><path d="M9 11h2M13 11h2M8 15l2 2h4l2-2" /></>,
  feather: <><path d="M20 4c-8 0-14 6-14 14v2h2c8 0 12-8 12-16z" /><path d="M6 18C10 12 14 8 18 6" /></>,
  dragon: <><path d="M3 8l5-4 1 4h4l2-3 3 3c2 2 3 4 3 6 0 5-4 8-9 8S4 18 4 13L3 8z" /><path d="M8 12l1.5 1M14 6l-3 6M17 14c-1 2-3 3-5 3" /><path d="M12 20l-2 2M15 19l-1 3" /></>,
  coin: <><circle cx="12" cy="12" r="8" /><path d="M12 7v10M9 9.5c0-1 1.3-1.8 3-1.8s3 .8 3 1.8-1 1.6-3 2-3 1-3 2 1.3 1.8 3 1.8 3-.8 3-1.8" /></>,
  lock: <><rect x="5" y="10" width="14" height="10" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  swords: <><path d="M4 4l7 7M4 4v3M4 4h3M20 4l-7 7M20 4v3M20 4h-3" /><path d="M7 14l-3 3 3 3 3-3M17 14l3 3-3 3-3-3" /><path d="M11 11l2 2M13 11l-2 2" /></>,
  crown: <><path d="M4 18h16M4 18l-1-9 5 4 4-7 4 7 5-4-1 9z" /></>,
  infinity: <><path d="M8.5 15.5c-2 2-5.5 1-5.5-3.5S8.5 7 10 9l4 6c1.5 2 7 1.5 7-3s-3.5-5-5.5-3L8 15" /></>,
  bag: <><path d="M5 8h14l-1.5 12h-11L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2M9 12c0 2 1.3 3 3 3s3-1 3-3" /></>,
  cards: <><rect x="3" y="5" width="10" height="14" /><path d="M9 3h10l2 4v12l-8 2" /><path d="M6 9h4M6 12h4" /></>,
  book: <><path d="M4 4h9a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3V4z" /><path d="M4 4v16M16 7v13" /></>,
  sound: <><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></>,
  soundOff: <><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17 9l5 6M22 9l-5 6" /></>,
  back: <><path d="M15 4l-8 8 8 8" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 16.5v.5" /></>,
  fire: <><path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1.5 1 2.5 2 3 4 .5-2 0-5 0-7z" /></>,
  flag: <><path d="M5 3v18" /><path d="M5 4c4-2 8 2 14 0v9c-6 2-10-2-14 0z" /></>,
};

export function Sigil({ icon, className = 'w-6 h-6' }: { icon: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {P[icon] ?? P.skull}
    </svg>
  );
}

/* Círculo rúnico decorativo giratorio */
export function RuneRing({ className = '', reverse = false }: { className?: string; reverse?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} ${reverse ? 'anim-rune-r' : 'anim-rune'}`} fill="none" aria-hidden>
      <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="1" strokeDasharray="4 7" opacity="0.7" />
      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.7" strokeDasharray="1 5" opacity="0.5" />
      <path d="M50 3v6M50 91v6M3 50h6M91 50h6" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
      <path d="M50 14l4 7h-8zM50 86l4-7h-8zM14 50l7-4v8zM86 50l-7-4v8z" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
