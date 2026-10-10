/**
 * Architecture rules, enforced in CI (`pnpm arch:check`). They keep the modular monolith from
 * decaying: layering inside each module, explicit public APIs between modules, and framework-free
 * domain and application code. See ADR-0001 and spec Section 9.
 *
 * Tests are excluded: they may reach into internals they verify.
 */
const MODULES = '^apps/api/src/modules';
const SHARED_KERNEL = '^packages/shared-kernel/src/';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'Circular imports make initialization order fragile and modules impossible to separate.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'domain-is-pure',
      severity: 'error',
      comment:
        "Domain code depends only on its own module's domain and the shared kernel: no framework, ORM, " +
        'validation library, platform code or other layers.',
      from: { path: `${MODULES}/([^/]+)/domain/` },
      to: {
        pathNot: [`${MODULES}/$1/domain/`, SHARED_KERNEL],
      },
    },
    {
      name: 'application-is-framework-free',
      severity: 'error',
      comment:
        'Use cases depend on their own domain, their own ports and the shared kernel only. ' +
        'NestJS and Prisma are wired in the module file (composition root), not here.',
      from: { path: `${MODULES}/([^/]+)/application/` },
      to: {
        pathNot: [`${MODULES}/$1/(domain|application)/`, SHARED_KERNEL],
      },
    },
    {
      name: 'infrastructure-does-not-depend-on-interface',
      severity: 'error',
      from: { path: `${MODULES}/([^/]+)/infrastructure/` },
      to: { path: `${MODULES}/$1/interface/` },
    },
    {
      name: 'modules-talk-through-public-api',
      severity: 'error',
      comment: 'A module may import another module only through its public-api.ts.',
      from: { path: `${MODULES}/([^/]+)/` },
      to: {
        path: `${MODULES}/`,
        pathNot: [`${MODULES}/$1/`, `${MODULES}/[^/]+/public-api\\.ts$`],
      },
    },
    {
      name: 'platform-does-not-depend-on-modules',
      severity: 'error',
      comment: 'Cross-cutting platform code sits below the business modules.',
      from: { path: '^apps/api/src/platform/' },
      to: { path: `${MODULES}/` },
    },
    {
      name: 'shared-kernel-has-no-dependencies',
      severity: 'error',
      comment:
        'The shared kernel is plain TypeScript: no npm packages, no other workspace packages.',
      from: { path: SHARED_KERNEL },
      to: { pathNot: [SHARED_KERNEL], dependencyTypesNot: ['core'] },
    },
    {
      name: 'packages-do-not-depend-on-apps',
      severity: 'error',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
    {
      name: 'no-dev-dependencies-in-production-code',
      severity: 'error',
      comment: 'Production code must not import packages that are only installed for development.',
      from: { path: '^(apps|packages)/[^/]+/src/' },
      to: { dependencyTypes: ['npm-dev'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['/dist/', '/generated/', '\\.(spec|int-spec)\\.ts$', '/test/'] },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      // Resolve workspace packages to their TypeScript sources, as the IDE and tests do.
      conditionNames: ['@stockforge/source', 'import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.js', '.json'],
    },
  },
};
