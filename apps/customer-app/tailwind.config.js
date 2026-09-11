// Tailwind 3.4, which NativeWind 4 requires. Colours and radii come from the ui-tokens preset
// (ADR-0018), so screens say bg-primary, never a hex value.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset'), require('@voltdrop/ui-tokens/tailwind-preset')],
  theme: { extend: {} },
  plugins: [],
};
