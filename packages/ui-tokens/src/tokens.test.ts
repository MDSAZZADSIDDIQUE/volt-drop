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
});

describe('generated outputs', () => {
  const colours = Object.keys(tokens.color);

  it('declare every colour as a CSS variable with its value', () => {
    const css = toCssVariables(tokens);
    for (const [name, value] of Object.entries(tokens.color)) {
      expect(css).toContain(`--vd-color-${name}: ${value};`);
    }
    expect(css).toContain('--vd-radius-md: 4px;');
    expect(css).toContain('--vd-focus-ring-width: 2px;');
    expect(css.startsWith('/* Generated')).toBe(true);
  });

  it('give Tailwind 4 a utility for every colour that reads its variable', () => {
    const theme = toTailwindTheme(tokens);
    expect(theme).toContain('@theme inline {');
    for (const name of colours) {
      expect(theme).toContain(`--color-${name}: var(--vd-color-${name});`);
    }
    expect(theme).toContain('--font-mono: var(--vd-font-mono);');
  });

  it('give NativeWind the same colours and radii as a Tailwind 3 preset', () => {
    const sandbox = { module: { exports: {} as unknown } };
    runInNewContext(toTailwindPreset(tokens), sandbox);
    expect(sandbox.module.exports).toEqual({
      theme: { extend: { colors: tokens.color, borderRadius: tokens.radius } },
    });
  });
});
