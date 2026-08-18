// ============================================================================
// MageBorne Duelists — Sigils
// ============================================================================
// Presentation only. The single icon system for the whole GUI: hand-inked
// line glyphs (inline SVG, currentColor) presented inside wax-seal badges.
// No game logic, no store access.
// ============================================================================

import type { ReactNode } from 'react';

export type GlyphName =
  | 'coin' | 'gem' | 'essence' | 'star' | 'skull' | 'rosette'
  | 'hex' | 'cards' | 'swords' | 'scroll' | 'scales' | 'hat' | 'chalice'
  | 'flame' | 'droplet' | 'gust' | 'mountain' | 'bolt' | 'vapor'
  | 'chain' | 'eye' | 'hush' | 'spiral'
  | 'bed' | 'book' | 'anvil' | 'flask' | 'rune'
  | 'compass' | 'check' | 'quill' | 'clock'
  | 'shield' | 'heart' | 'ledger' | 'cross';

const PATHS: Record<GlyphName, ReactNode> = {
  // --- resources -----------------------------------------------------------
  coin: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 6.2v1.4M12 16.4v1.4M6.2 12h1.4M16.4 12h1.4" />
    </>
  ),
  gem: (
    <>
      <path d="M12 3.5 20 10l-8 10.5L4 10z" />
      <path d="M4 10h16M12 3.5 9 10l3 10.5M12 3.5l3 6.5-3 10.5" />
    </>
  ),
  essence: (
    <>
      <path d="M12 3.2c.7 4.6 2.2 6.1 6.8 6.8-4.6.7-6.1 2.2-6.8 6.8-.7-4.6-2.2-6.1-6.8-6.8 4.6-.7 6.1-2.2 6.8-6.8z" />
      <path d="M17.6 16.2c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3z" />
    </>
  ),
  star: <path d="M12 3.4l2.6 5.6 6 .8-4.4 4.3 1.1 6.1L12 17.3l-5.3 2.9 1.1-6.1L3.4 9.8l6-.8z" />,
  skull: (
    <>
      <path d="M5.6 11.4a6.4 6.4 0 1 1 12.8 0c0 2.3-1 3.5-1.8 4.3v2.5a1.4 1.4 0 0 1-1.4 1.4H8.8a1.4 1.4 0 0 1-1.4-1.4v-2.5c-.8-.8-1.8-2-1.8-4.3z" />
      <circle cx="9.6" cy="11.6" r="1.5" />
      <circle cx="14.4" cy="11.6" r="1.5" />
      <path d="M12 15v2" />
    </>
  ),
  rosette: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M12 6.4 13 8.4l2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 8.7l2.2-.3z" />
      <path d="M9 13.4 7.4 20l4.6-2.3L16.6 20 15 13.4" />
    </>
  ),

  // --- navigation ----------------------------------------------------------
  hex: (
    <>
      <path d="M12 3.2l7.4 4.3v8.9L12 20.8l-7.4-4.4V7.5z" />
      <circle cx="12" cy="12" r="2.1" />
    </>
  ),
  cards: (
    <>
      <rect x="8.4" y="5" width="10" height="14" rx="2" />
      <path d="M11.6 19H7.2a2 2 0 0 1-2-2V8" />
      <path d="M13.4 9.4l1.6 2.6-1.6 2.6-1.6-2.6z" />
    </>
  ),
  swords: (
    <>
      <path d="M4.5 4.5h3l10 10-3 3z" />
      <path d="M19.5 4.5h-3l-10 10 3 3z" />
      <path d="M6.2 17.6 4.4 19.4M17.8 17.6l1.8 1.8" />
    </>
  ),
  scroll: (
    <>
      <rect x="4.4" y="3.6" width="15.2" height="3" rx="1.5" />
      <rect x="4.4" y="17.4" width="15.2" height="3" rx="1.5" />
      <path d="M6.6 6.6v10.8M17.4 6.6v10.8" />
      <path d="M9.2 10h5.6M9.2 13.4h5.6" />
    </>
  ),
  scales: (
    <>
      <path d="M12 4.4v15M8 19.6h8M5 8h14M12 4.4 5 8M12 4.4 19 8" />
      <path d="M2.6 12.4 5 8l2.4 4.4a2.6 2.6 0 0 1-4.8 0zM16.6 12.4 19 8l2.4 4.4a2.6 2.6 0 0 1-4.8 0z" />
    </>
  ),
  hat: (
    <>
      <path d="M12 3.2c2.4 3 3.6 7.2 4.2 11.4-1.4.7-2.8 1-4.2 1s-2.8-.3-4.2-1C8.4 10.4 9.6 6.2 12 3.2z" />
      <path d="M4.4 17.6c0-1.4 3.4-2.6 7.6-2.6s7.6 1.2 7.6 2.6-3.4 2.6-7.6 2.6-7.6-1.2-7.6-2.6z" />
      <path d="M12 8.6l.6 1.4 1.4.4-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.4z" />
    </>
  ),
  chalice: (
    <>
      <path d="M6.6 4.4h10.8v3.2a5.4 5.4 0 0 1-10.8 0z" />
      <path d="M12 13v4.4M8.4 19.6h7.2" />
      <path d="M6.6 6h-2a3 3 0 0 0 3 3M17.4 6h2a3 3 0 0 1-3 3" />
    </>
  ),

  // --- elements ------------------------------------------------------------
  flame: (
    <>
      <path d="M12 3.4c3.4 3.4 5.6 6 5.6 9.2a5.6 5.6 0 1 1-11.2 0c0-2 .9-3.6 2.3-5 .3 1.2.9 2 1.8 2.4-.2-2.4.3-4.4 1.5-6.6z" />
      <path d="M12 19.6a2.8 2.8 0 0 1-1.6-5.1c.2 1 .8 1.5 1.4 1.7-.2-1.3.1-2.3.8-3.3 1 1.4 2 2.4 2 3.9a2.6 2.6 0 0 1-2.6 2.8z" />
    </>
  ),
  droplet: (
    <>
      <path d="M12 3.4c3.2 4 5.4 6.8 5.4 9.4a5.4 5.4 0 1 1-10.8 0c0-2.6 2.2-5.4 5.4-9.4z" />
      <path d="M9.4 13.6a2.6 2.6 0 0 0 2 3.5" />
    </>
  ),
  gust: (
    <>
      <path d="M3.6 8.6h9.2a2.6 2.6 0 1 0-2.6-2.6" />
      <path d="M3.6 12.6h13a2.6 2.6 0 1 1-2.6 2.6" />
      <path d="M5.6 16.8h5.6a2.2 2.2 0 1 1-2.2 2.2" />
    </>
  ),
  mountain: (
    <>
      <path d="M2.6 19.4 9 7.4l4 7 2.2-3.4 4.2 8.4z" />
      <path d="M6.6 14.4h4.8" />
    </>
  ),
  bolt: <path d="M13.6 2.6 6 13.4h4.6L9.4 21.4 18 10.2h-4.8z" />,
  vapor: (
    <>
      <path d="M4 7.4c1.6-1.6 3.2-1.6 4.8 0s3.2 1.6 4.8 0 3.2-1.6 4.8 0" />
      <path d="M4 12c1.6-1.6 3.2-1.6 4.8 0s3.2 1.6 4.8 0 3.2-1.6 4.8 0" />
      <path d="M4 16.6c1.6-1.6 3.2-1.6 4.8 0s3.2 1.6 4.8 0 3.2-1.6 4.8 0" />
    </>
  ),

  // --- conditions ----------------------------------------------------------
  chain: (
    <>
      <rect x="3" y="8.4" width="8.6" height="7.2" rx="3.6" />
      <rect x="12.4" y="8.4" width="8.6" height="7.2" rx="3.6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.6 12S6 6.4 12 6.4 21.4 12 21.4 12 18 17.6 12 17.6 2.6 12 2.6 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  hush: (
    <>
      <path d="M9.6 8.4 5.6 11H3v2.8h2.6l4 2.8z" />
      <path d="M13.6 9.4l5 5.2M18.6 9.4l-5 5.2" />
    </>
  ),
  spiral: (
    <>
      <path d="M12 12.6a2.2 2.2 0 1 1 2.2-2.2 4.4 4.4 0 0 1-4.4 4.4 6.6 6.6 0 0 1-6.6-6.6" />
      <path d="M12 12.6a4.6 4.6 0 0 0 4.6 4.6 4.6 4.6 0 0 0 4.6-4.6" />
    </>
  ),

  // --- settlement services --------------------------------------------------
  bed: (
    <>
      <path d="M3 17.4V8.6M3 12.4h18v5M21 17.4v-4" />
      <path d="M6.8 12.4V10h5.4a2 2 0 0 1 2 2v.4" />
      <circle cx="7.4" cy="9.4" r="1.6" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.4C10.4 5 8.4 4.4 4.4 4.4v13c4 0 6 .6 7.6 2 1.6-1.4 3.6-2 7.6-2v-13c-4 0-6 .6-7.6 2z" />
      <path d="M12 6.4v13" />
    </>
  ),
  anvil: (
    <>
      <path d="M4 8.4h9.6c0 2.4 2.2 3.4 4.4 3.4v2.4H9.4c-2.6 0-4.6-2-4.6-4.4z" />
      <path d="M9 14.2v2.2H6.4l-.8 3.2h12l-.8-3.2h-2.6v-2.2" />
    </>
  ),
  flask: (
    <>
      <path d="M9.6 3.4h4.8M10.6 3.4v6L5.8 17.6a2 2 0 0 0 1.8 3h8.8a2 2 0 0 0 1.8-3l-4.8-8.2v-6" />
      <path d="M8 14.6h8" />
    </>
  ),
  rune: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 5.6 18 16H6z" />
      <path d="M12 9.6v4.8" />
    </>
  ),

  // --- misc ----------------------------------------------------------------
  compass: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M15.4 8.6 10.4 10.4 8.6 15.4l5-1.8z" />
    </>
  ),
  check: <path d="M4.4 12.6 9.4 17.6 19.6 6.4" />,
  quill: (
    <>
      <path d="M4 20.4c0-6.4 4-13 15.4-16.8C19.4 13.4 14 19 4 20.4z" />
      <path d="M4 20.4c3.4-3 6.4-5.4 10.4-7.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7v5.4l3.4 2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 19.4 6v6c0 4.2-3 7.2-7.4 8.8C7.6 19.2 4.6 16.2 4.6 12V6z" />
      <path d="M12 7.4v8.4" />
    </>
  ),
  heart: (
    <path d="M12 20.2C6.6 16.6 3.6 13.6 3.6 10.2a4.2 4.2 0 0 1 8.4-1.4 4.2 4.2 0 0 1 8.4 1.4c0 3.4-3 6.4-8.4 10z" />
  ),
  ledger: (
    <>
      <rect x="4.4" y="3.6" width="15.2" height="16.8" rx="2" />
      <path d="M8.4 3.6v16.8M11.6 8h5M11.6 12h5M11.6 16h5" />
    </>
  ),
  cross: <path d="M6 6l12 12M18 6 6 18" />,
};

export function Glyph({
  name,
  className = 'w-4 h-4',
  strokeWidth = 1.8,
}: {
  name: GlyphName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

export type SealTone = 'brass' | 'ox' | 'tide' | 'moss' | 'wood' | 'ink' | 'arcane' | 'blank';

const TONE_CLASS: Record<SealTone, string> = {
  brass: 'seal-brass',
  ox: 'seal-ox',
  tide: 'seal-tide',
  moss: 'seal-moss',
  wood: 'seal-wood',
  ink: 'seal-ink',
  arcane: 'seal-arcane',
  blank: 'seal-blank',
};

/** Focus / arcane energy reads violet across meters and seals. */
export const ARCANE = '#5a5f9e';

const SIZE_CLASS: Record<'xs' | 'sm' | 'md' | 'lg', { box: string; glyph: string }> = {
  xs: { box: 'w-5 h-5', glyph: 'w-3 h-3' },
  sm: { box: 'w-6 h-6', glyph: 'w-3.5 h-3.5' },
  md: { box: 'w-8 h-8', glyph: 'w-[18px] h-[18px]' },
  lg: { box: 'w-11 h-11', glyph: 'w-6 h-6' },
};

/** A wax-seal badge. The one and only icon container in the UI. */
export function Seal({
  glyph,
  tone = 'brass',
  size = 'md',
  title,
  className = '',
  style,
}: {
  glyph: GlyphName;
  tone?: SealTone;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const s = SIZE_CLASS[size];
  return (
    <span className={`${TONE_CLASS[tone]} ${s.box} shrink-0 ${className}`} title={title} style={style}>
      <Glyph name={glyph} className={s.glyph} strokeWidth={2} />
    </span>
  );
}

/** A seal struck in an element's own wax (uses the --el vars from .el-* classes). */
export function ElementSeal({
  glyph,
  size = 'md',
  title,
  className = '',
}: {
  glyph: GlyphName;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  title?: string;
  className?: string;
}) {
  const s = SIZE_CLASS[size];
  return (
    <span
      className={`seal ${s.box} shrink-0 text-parchment-50 ${className}`}
      title={title}
      style={{ backgroundColor: 'var(--el)', borderColor: 'var(--el-deep)' }}
    >
      <Glyph name={glyph} className={s.glyph} strokeWidth={2} />
    </span>
  );
}

/** Element id -> the sigil struck on its seal. */
export const ELEMENT_GLYPH: Record<string, GlyphName> = {
  fire: 'flame',
  water: 'droplet',
  wind: 'gust',
  earth: 'mountain',
  magma: 'flame',
  lightning: 'bolt',
  steam: 'vapor',
  storm: 'bolt',
};

/** Element id -> the `.el-*` class that sets --el / --el-deep / --el-wash. */
export function elementInk(element: string): string {
  return `el-${element in ELEMENT_GLYPH ? element : 'earth'}`;
}
