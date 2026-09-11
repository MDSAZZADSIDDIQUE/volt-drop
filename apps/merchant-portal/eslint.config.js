import { voltdrop } from '@voltdrop/config/eslint';

export default voltdrop({
  tsconfigRootDir: import.meta.dirname,
  environment: 'browser',
  react: true,
});
