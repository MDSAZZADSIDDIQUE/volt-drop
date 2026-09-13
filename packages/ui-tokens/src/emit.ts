import type { Tokens } from './tokens.js';

const CSS_HEADER = '/* Generated from packages/ui-tokens/src/tokens.ts. Do not edit. */\n';
const JS_HEADER = '// Generated from packages/ui-tokens/src/tokens.ts. Do not edit.\n';

/** CSS custom properties holding the values, for web apps and any hand-written CSS. */
export function toCssVariables(tokens: Tokens): string {
  const lines = [
    ...Object.entries(tokens.color).map(([name, value]) => `  --vd-color-${name}: ${value};`),
    ...Object.entries(tokens.radius).map(([name, value]) => `  --vd-radius-${name}: ${value};`),
    ...Object.entries(tokens.font).map(([name, value]) => `  --vd-font-${name}: ${value};`),
    `  --vd-focus-ring-width: ${tokens.focusRing.width};`,
    `  --vd-focus-ring-offset: ${tokens.focusRing.offset};`,
  ];
  return `${CSS_HEADER}:root {\n${lines.join('\n')}\n}\n`;
}

/**
 * The Tailwind 4 theme for web: utilities such as `bg-primary`, `rounded-md` and `font-mono`
 * that read the CSS variables, so a value changes in one place.
 */
export function toTailwindTheme(tokens: Tokens): string {
  const lines = [
    ...Object.keys(tokens.color).map((name) => `  --color-${name}: var(--vd-color-${name});`),
    ...Object.keys(tokens.radius).map((name) => `  --radius-${name}: var(--vd-radius-${name});`),
    ...Object.keys(tokens.font).map((name) => `  --font-${name}: var(--vd-font-${name});`),
  ];
  return `${CSS_HEADER}@theme inline {\n${lines.join('\n')}\n}\n`;
}

/**
 * The Tailwind 3 preset for NativeWind, with the same utility names and literal values. Fonts stay
 * with the platform default until the chosen typefaces are bundled with the apps.
 */
export function toTailwindPreset(tokens: Tokens): string {
  const theme = { extend: { colors: { ...tokens.color }, borderRadius: { ...tokens.radius } } };
  return `${JS_HEADER}module.exports = { theme: ${JSON.stringify(theme, null, 2)} };\n`;
}
