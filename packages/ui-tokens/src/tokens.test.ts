import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { contrastRatio, relativeLuminance } from './contrast.js';
import { toCssVariables, toTailwindPreset, toTailwindTheme } from './emit.js';
import { TEXT_PAIRS, tokens, UI_COLOURS } from './tokens.js';

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    // #767676 is the lightest grey that passes 4.5:1 on white.
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
    expect(contrastRatio('#FFFFFF', '#767676')).toBe(contrastRatio('#767676', '#FFFFFF'));
  });

  it('rejects anything but #RRGGBB', () => {
    expect(() => relativeLuminance('#FFF')).toThrow(/Not a #RRGGBB colour/);
    expect(() => relativeLuminance('red')).toThrow(/Not a #RRGGBB colour/);
  });
});

describe('tokens', () => {
  it.each(TEXT_PAIRS)('%s text on %s meets WCAG 2.2 AA (4.5:1)', (text, background) => {
    const ratio = contrastRatio(tokens.color[text], tokens.color[background]);
    expect(ratio, `${text} on ${background} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_COLOURS)('%s meets WCAG 2.2 AA against the background (3:1)', (colour) => {
    const ratio = contrastRatio(tokens.color[colour], tokens.color.background);
    expect(ratio, `${colour} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  });

  it('never uses the stripe colour for text or behind text', () => {
    // Earth Yellow is only for Loom's delivered and verified stripe graphic (ADR-0019).
    expect(TEXT_PAIRS.flat()).not.toContain('success-stripe');
  });
});

describe('generated outputs', () => {
  const colours = Object.keys(tokens.color);

  it('declare every colour as a CSS variable with its value', () => {
    const css = toCssVariables(tokens);
    for (const [name, value] of Object.entries(tokens.color)) {
      expect(css).toContain(`--vd-color-${name}: ${value};`);
    }
    expect(css).toContain(`--vd-radius-md: ${tokens.radius.md};`);
    expect(css).toContain('--vd-focus-ring-width: 2px;');
    expect(css.startsWith('/* Generated')).toBe(true);
  });

  it('give the web its type scale in rem, so text follows the browser font-size setting', () => {
    const css = toCssVariables(tokens);
    expect(css).toContain('--vd-text-base: 1rem;');
    expect(css).toContain('--vd-text-base-line-height: 1.5rem;');
    expect(css).toContain('--vd-text-sm: 0.8125rem;');
  });

  it('give Tailwind 4 a utility for every colour, font and text size that reads its variable', () => {
    const theme = toTailwindTheme(tokens);
    expect(theme).toContain('@theme inline {');
    for (const name of colours) {
      expect(theme).toContain(`--color-${name}: var(--vd-color-${name});`);
    }
    for (const name of Object.keys(tokens.font)) {
      expect(theme).toContain(`--font-${name}: var(--vd-font-${name});`);
    }
    for (const name of Object.keys(tokens.fontSize)) {
      expect(theme).toContain(`--text-${name}: var(--vd-text-${name});`);
      expect(theme).toContain(`--text-${name}--line-height: var(--vd-text-${name}-line-height);`);
    }
  });

  it('give NativeWind the same colours, radii and text sizes, in px, as a Tailwind 3 preset', () => {
    const sandbox = { module: { exports: {} as unknown } };
    runInNewContext(toTailwindPreset(tokens), sandbox);
    expect(sandbox.module.exports).toEqual({
      theme: {
        extend: {
          colors: tokens.color,
          borderRadius: tokens.radius,
          fontSize: {
            sm: ['13px', { lineHeight: '18px' }],
            base: ['16px', { lineHeight: '24px' }],
            lg: ['20px', { lineHeight: '28px' }],
            xl: ['25px', { lineHeight: '32px' }],
            '2xl': ['31px', { lineHeight: '40px' }],
            '3xl': ['39px', { lineHeight: '48px' }],
            '4xl': ['49px', { lineHeight: '56px' }],
          },
        },
      },
    });
  });
});
