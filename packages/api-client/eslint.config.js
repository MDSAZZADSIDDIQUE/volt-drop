import { voltdrop } from '@voltdrop/config/eslint';

// The generated client is never edited by hand, so it isn't linted either (M0 plan, step 7).
export default voltdrop({
  tsconfigRootDir: import.meta.dirname,
  environment: 'browser',
  ignores: ['src/generated/**'],
});
