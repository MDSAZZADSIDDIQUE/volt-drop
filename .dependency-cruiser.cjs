/**
 * Architecture rules checked in CI (spec §5, §6).
 * Run with `pnpm lint:boundaries`.
 * @type {import('dependency-cruiser').IConfiguration}
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Circular imports hide coupling and break module initialisation order.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'packages-never-import-apps',
      comment: 'Shared packages are used by apps, never the other way round.',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'domain-stays-framework-free',
      comment:
        'packages/domain holds pure business logic (money, VAT, ids, state machines). ' +
        'It may use zod and uuid, and its tests may use vitest and fast-check. Nothing else.',
      severity: 'error',
      from: { path: '^packages/domain/' },
      to: {
        dependencyTypes: [
          'npm',
          'npm-dev',
          'npm-peer',
          'npm-optional',
          'npm-no-pkg',
          'npm-unknown',
        ],
        // Matches both hoisted paths and pnpm's node_modules/.pnpm/<pkg>@<v>/node_modules/<pkg>/.
        pathNot: 'node_modules/(zod|uuid|fast-check|vitest|@vitest)/',
      },
    },
    {
      name: 'core-never-imports-modules',
      comment:
        'apps/api/src/core is framework plumbing shared by every module (logging, errors, ' +
        'validation, OpenAPI). It must not depend on any business module.',
      severity: 'error',
      from: { path: '^apps/api/src/core/' },
      to: { path: '^apps/api/src/modules/' },
    },
    {
      name: 'api-module-boundaries',
      comment:
        "A module may use another module only through that module's public index.ts " +
        '(exported services, events and types), never its schema, repositories or internals.',
      severity: 'error',
      from: { path: '^apps/api/src/modules/([^/]+)/' },
      to: {
        path: '^apps/api/src/modules/[^/]+/',
        pathNot: ['^apps/api/src/modules/$1/', '^apps/api/src/modules/[^/]+/index\\.ts$'],
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|build|\\.next|\\.expo|\\.turbo|coverage)/' },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
