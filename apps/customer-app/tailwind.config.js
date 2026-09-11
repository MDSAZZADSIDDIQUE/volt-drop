// Tailwind 3.4, which NativeWind 4 requires. Design tokens arrive as a preset from ui-tokens
// (ADR-0018) once a design direction is chosen.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
