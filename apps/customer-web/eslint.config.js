import nextPlugin from '@next/eslint-plugin-next';
import { voltdrop } from '@voltdrop/config/eslint';

export default [
  ...voltdrop({
    tsconfigRootDir: import.meta.dirname,
    environment: 'browser',
    react: true,
    ignores: ['next-env.d.ts'],
  }),
  // Next.js's own rules: next/image, next/link, fonts and Core Web Vitals.
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
];
