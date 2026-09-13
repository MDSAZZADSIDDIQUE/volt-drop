/**
 * VoltDrop design tokens (spec §9, ADR-0018): the only place colours, radii, fonts, text sizes and
 * focus styles are defined. Web and native styles are generated from this file.
 *
 * The values are Direction A, Loom, which the founder chose on 2026-09-13 (docs/design/directions.md,
 * ADR-0019): UK flex-cable colours and the spec labels printed on tech packaging.
 */
export const tokens = {
  color: {
    /** Insulation White: the page. */
    background: '#F7F8F9',
    /** White panels and cards on the page. */
    surface: '#FFFFFF',
    /** Conduit Black: text. */
    foreground: '#16181B',
    /** Sheath Grey: secondary text and inactive states. */
    'muted-foreground': '#5B6168',
    /** Sheath Grey rules. Borders that identify controls need 3:1 against the background. */
    border: '#5B6168',
    /** Live Brown: primary actions, and the live wire in the tracker. */
    primary: '#6B3F22',
    'primary-foreground': '#FFFFFF',
    /** Neutral Blue: links and information. */
    link: '#1F5FA8',
    /** Neutral Blue focus rings. */
    focus: '#1F5FA8',
    /** Earth Green: done and verified. */
    success: '#2E7D32',
    /** Earth Yellow: only the stripe graphic that goes with success. Never text, nor behind text. */
    'success-stripe': '#F2C230',
    /** Loom names no warning or danger colour, so these signal colours stay (ADR-0019). */
    warning: '#8A5A00',
    danger: '#B42318',
  },
  /** Loom uses one corner radius for everything. */
  radius: { sm: '2px', md: '2px', lg: '2px' },
  font: {
    /** Atkinson Hyperlegible Next: the interface and body text. */
    sans: "'Atkinson Hyperlegible Next Variable', ui-sans-serif, system-ui, sans-serif",
    /** Archivo: headings, set narrow with `font-stretch-condensed` (75%). */
    heading: "'Archivo Variable', ui-sans-serif, system-ui, sans-serif",
    /** IBM Plex Mono: specs, codes, order references and PINs. */
    mono: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  /** Loom's type scale: a 1.25 ratio on 16 px. Sizes and line heights in px. */
  fontSize: {
    sm: { size: 13, lineHeight: 18 },
    base: { size: 16, lineHeight: 24 },
    lg: { size: 20, lineHeight: 28 },
    xl: { size: 25, lineHeight: 32 },
    '2xl': { size: 31, lineHeight: 40 },
    '3xl': { size: 39, lineHeight: 48 },
    '4xl': { size: 49, lineHeight: 56 },
  },
  focusRing: { width: '2px', offset: '2px' },
} as const;

export type Tokens = typeof tokens;
export type ColorToken = keyof Tokens['color'];

/** Text on background pairings that must meet WCAG 2.2 AA for normal text (4.5:1). */
export const TEXT_PAIRS: readonly (readonly [text: ColorToken, background: ColorToken])[] = [
  ['foreground', 'background'],
  ['foreground', 'surface'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'surface'],
  ['primary-foreground', 'primary'],
  ['link', 'background'],
  ['success', 'background'],
  ['warning', 'background'],
  ['danger', 'background'],
];

/** Non-text colours that must meet WCAG 2.2 AA against the background (3:1). */
export const UI_COLOURS: readonly ColorToken[] = ['border', 'focus', 'primary'];
