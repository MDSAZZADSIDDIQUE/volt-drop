// Shared ESLint flat config (spec §6): strict type-aware TypeScript rules, no `any`,
// no non-null assertions without a justifying eslint-disable comment, Prettier owns formatting.
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * @param {object} options
 * @param {string} options.tsconfigRootDir Directory of the package's tsconfig.json (usually `import.meta.dirname`).
 * @param {'node' | 'browser'} [options.environment] Which globals the package's code runs with.
 * @param {string[]} [options.ignores] Extra glob patterns to skip.
 */
export function voltdrop({ tsconfigRootDir, environment = 'node', ignores = [] }) {
  return defineConfig([
    globalIgnores([
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/src/generated/**',
      ...ignores,
    ]),
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
        globals: environment === 'browser' ? { ...globals.browser } : { ...globals.node },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        // NestJS modules are decorated classes with no body, by design.
        '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { fixStyle: 'inline-type-imports' },
        ],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
        eqeqeq: ['error', 'always'],
        'no-console': 'error',
      },
    },
    {
      files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
      extends: [tseslint.configs.disableTypeChecked],
      rules: { 'no-console': 'off' },
    },
    prettier,
  ]);
}
