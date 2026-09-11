import { voltdrop } from '@voltdrop/config/eslint';

// The CommonJS tool configs (Babel, Metro, Tailwind) follow each tool's documented shape and
// aren't linted.
export default voltdrop({
  tsconfigRootDir: import.meta.dirname,
  environment: 'browser',
  react: true,
  ignores: ['babel.config.js', 'metro.config.js', 'tailwind.config.js', '.expo/**'],
});
