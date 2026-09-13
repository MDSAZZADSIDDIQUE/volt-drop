/**
 * VoltDrop design tokens (spec §9, ADR-0018): the only place colours, radii, fonts and focus
 * styles are defined. Web and native styles are generated from this file.
 *
 * PLACEHOLDER VALUES. They are neutral and accessible, and exist so the apps can be built before
 * the founder chooses a design direction (docs/design/directions.md). After that choice, only the
 * values here change: the role names below are ones both directions fill.
 */
export const tokens = {
  color: {
    background: '#FFFFFF',
    surface: '#F6F7F8',
    foreground: '#16181B',
    'muted-foreground': '#5B6168',
    /** Borders that identify controls (inputs, buttons), so at least 3:1 against the background. */
    border: '#6E747B',
    primary: '#1F2937',
    'primary-foreground': '#FFFFFF',
    link: '#1F5FA8',
    focus: '#1F5FA8',
    success: '#2E7D32',
    warning: '#8A5A00',
    danger: '#B42318',
  },
  radius: { sm: '2px', md: '4px', lg: '6px' },
  /** System fonts until the chosen direction's typefaces are self-hosted here. */
  font: {
    sans: 'ui-sans-serif, system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
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
