// Second half of `build`: after tsc compiles src, write the web and native outputs into dist.
import { mkdirSync, writeFileSync } from 'node:fs';
import { toCssVariables, toTailwindPreset, toTailwindTheme } from '../dist/emit.js';
import { tokens } from '../dist/tokens.js';

const dist = new URL('../dist/', import.meta.url);
mkdirSync(dist, { recursive: true });
writeFileSync(new URL('tokens.css', dist), toCssVariables(tokens));
writeFileSync(new URL('theme.css', dist), toTailwindTheme(tokens));
writeFileSync(new URL('tailwind-preset.cjs', dist), toTailwindPreset(tokens));
