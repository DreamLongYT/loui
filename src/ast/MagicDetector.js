import path from 'path';
import fs from 'fs/promises';
import { PluginRegistry } from '../plugins/PluginRegistry.js';

/**
 * Ecosystem Entry Point Manifest & Dynamic Framework Router Heuristic Validator
 * Intercepts implicit conventions to handle cases where direct import statements are absent.
 * Now refactored to use a pluggable architecture.
 *
 * Improvements over v1:
 * - Extended config-file detection list (Biome, Oxlint, tsup, unbuild, etc.)
 * - Next.js App Router conventions (page.tsx, layout.tsx, loading.tsx, error.tsx, etc.)
 * - Remix conventions (route files under app/routes/)
 * - SvelteKit conventions (+page.svelte, +layout.svelte, etc.)
 * - Astro page/layout conventions
 * - Common entry-point patterns (bin/, cli.ts, server.ts, main.ts, app.ts)
 * - Test file patterns extended to cover Vitest workspace files
 */
export class MagicDetector {
  constructor(context) {
    this.context = context;
    this.registry = new PluginRegistry(context);
    this.isInitialized = false;
  }

  async ensureInitialized(baseDir) {
    if (this.isInitialized) return;
    await this.registry.init(baseDir || process.cwd());
    this.isInitialized = true;
  }

  /**
   * Audits the project context to map active micro-framework ecosystems.
   * @param {string} baseContextDirectory - Root file workspace context execution vector path
   */
  async identifyActiveProjectEcosystems(baseContextDirectory) {
    await this.ensureInitialized(baseContextDirectory);
    const activePlugins = await this.registry.getActivePlugins(baseContextDirectory);
    const activeFrameworkFlags = activePlugins.map(p => p.name);
    
    // Universal infrastructure overrides (testing platforms and common bundlers)
    activeFrameworkFlags.push('universal-tooling-vectors');
    return activeFrameworkFlags;
  }

  /**
   * Assesses if a file path acts as an implicit route entry point.
   */
  async isImplicitlyRequiredByEcosystem(absolutePath, activeFrameworks, baseDir) {
    await this.ensureInitialized();
    const normalizedSystemPath = absolutePath.replace(/\\/g, '/');

    const plugins = this.registry.getPlugins();
    for (const plugin of plugins) {
      if (activeFrameworks.includes(plugin.name)) {
        const patterns = plugin.getRoutePatterns();
        if (patterns.some(regex => regex.test(normalizedSystemPath))) {
          return true;
        }
      }
    }

    // Apply baseline platform rules (Test suites, lint parameters, continuous integration files)
    if (this.isCoreToolingSuiteElement(normalizedSystemPath)) {
      return true;
    }

    return false;
  }

  isCoreToolingSuiteElement(normalizedPath) {
    // ── Test / spec files ──────────────────────────────────────────────────────
    if (/\.(test|spec|e2e|cy)\.(js|ts|tsx|jsx)$/i.test(normalizedPath)) return true;
    if (/\.stories\.(js|ts|tsx|jsx)$/i.test(normalizedPath)) return true;

    // ── Build / bundler config files ───────────────────────────────────────────
    const configFragments = [
      // Test runners
      'jest.config.', 'vitest.config.', 'vitest.workspace.',
      'playwright.config.', 'cypress.config.',
      // Bundlers
      'webpack.config.', 'vite.config.', 'rollup.config.',
      'esbuild.config.', 'parcel.config.',
      'tsup.config.', 'unbuild.config.', 'pkgroll.config.',
      // CSS / styling
      'tailwind.config.', 'postcss.config.', '.postcssrc.',
      // Linters / formatters
      '.eslintrc.', 'eslint.config.', 'prettier.config.', '.prettierrc.',
      '.stylelintrc.', 'stylelint.config.',
      'biome.json', '.oxlintrc.',
      // Babel / transpilation
      '.babelrc.', 'babel.config.',
      // Commit / git hooks
      '.commitlintrc.', 'commitlint.config.',
      '.lintstagedrc.', 'lint-staged.config.',
      // Documentation
      'typedoc.config.', 'typedoc.json',
      // Monorepo tools
      'turbo.json', 'nx.json', 'lerna.json',
      // Misc tooling
      'knip.config.', 'knip.json',
      'syncpack.config.',
      // Internal worker
      'WorkerTaskRunner.js'
    ];
    if (configFragments.some(f => normalizedPath.includes(f))) return true;

    // ── Common application entry points ───────────────────────────────────────
    const entryPatterns = [
      // CLI binaries
      '/bin/cli.js', '/bin/cli.ts', '/bin/cli.mjs',
      '/bin/index.js', '/bin/index.ts',
      // Server / app entry points (Reduced in v3.3.8 to avoid false positives in libraries)
      '/src/main.ts', '/src/main.js',
      '/src/app.ts', '/src/app.js',
      '/src/api/HeadlessAPI.js', '/src/api/PluginSDK.js',
      '/main.ts', '/main.js',
      '/app.ts', '/app.js',
    ];
    if (entryPatterns.some(p => normalizedPath.endsWith(p))) return true;

    // ── Next.js App Router conventions ────────────────────────────────────────
    // Files under app/ directory with Next.js special names
    if (/\/app\/(page|layout|loading|error|not-found|template|default|route|middleware)\.(js|ts|tsx|jsx)$/.test(normalizedPath)) return true;
    // Next.js Pages Router
    if (/\/pages\/.*\.(js|ts|tsx|jsx)$/.test(normalizedPath)) return true;
    // Next.js API routes
    if (/\/pages\/api\/.*\.(js|ts)$/.test(normalizedPath)) return true;
    // Next.js middleware
    if (/\/middleware\.(js|ts)$/.test(normalizedPath)) return true;
    // Next.js config
    if (/\/next\.config\.(js|ts|mjs|cjs)$/.test(normalizedPath)) return true;

    // ── Remix conventions ─────────────────────────────────────────────────────
    if (/\/app\/routes\/.*\.(js|ts|tsx|jsx)$/.test(normalizedPath)) return true;
    if (/\/app\/root\.(js|ts|tsx|jsx)$/.test(normalizedPath)) return true;
    if (/\/app\/entry\.(client|server)\.(js|ts|tsx|jsx)$/.test(normalizedPath)) return true;

    // ── SvelteKit conventions ─────────────────────────────────────────────────
    if (/\/\+page(\.(server|client))?\.(svelte|js|ts)$/.test(normalizedPath)) return true;
    if (/\/\+layout(\.(server|client))?\.(svelte|js|ts)$/.test(normalizedPath)) return true;
    if (/\/\+error\.(svelte|js|ts)$/.test(normalizedPath)) return true;
    if (/\/\+server\.(js|ts)$/.test(normalizedPath)) return true;
    if (/\/svelte\.config\.(js|ts|mjs)$/.test(normalizedPath)) return true;

    // ── Astro conventions ─────────────────────────────────────────────────────
    if (/\/src\/pages\/.*\.astro$/.test(normalizedPath)) return true;
    if (/\/src\/layouts\/.*\.astro$/.test(normalizedPath)) return true;
    if (/\/astro\.config\.(mjs|js|ts)$/.test(normalizedPath)) return true;

    // ── Nuxt conventions ──────────────────────────────────────────────────────
    if (/\/pages\/.*\.vue$/.test(normalizedPath)) return true;
    if (/\/layouts\/.*\.vue$/.test(normalizedPath)) return true;
    if (/\/server\/api\/.*\.(js|ts)$/.test(normalizedPath)) return true;
    if (/\/nuxt\.config\.(js|ts|mjs)$/.test(normalizedPath)) return true;

    // ── React / Vite entry points ─────────────────────────────────────────────
    if (/\/vite\.config\.(js|ts|mjs)$/.test(normalizedPath)) return true;

    // ── Angular conventions ───────────────────────────────────────────────────
    if (/\/main\.(ts|js)$/.test(normalizedPath)) return true;
    if (/\/app\.module\.(ts|js)$/.test(normalizedPath)) return true;
    if (/\/angular\.json$/.test(normalizedPath)) return true;

    // ── Expo / React Native ───────────────────────────────────────────────────
    if (/\/app\/_layout\.(js|ts|tsx|jsx)$/.test(normalizedPath)) return true;
    if (/\/app\/index\.(js|ts|tsx|jsx)$/.test(normalizedPath)) return true;

    return false;
  }

  /**
   * Challenge #4 Framework Overrides. Protects interface boundaries from false positive report flags.
   */
  async injectVirtualConsumerEdges(filePath, fileNode, activeFrameworks) {
    await this.ensureInitialized();
    if (!await this.isImplicitlyRequiredByEcosystem(filePath, activeFrameworks)) return;

    // Retain entry point elements within memory to keep verification safe
    fileNode.isEntry = true;

    // Apply dynamic exports coverage metrics based on active platform contracts
    const normalizedPath = filePath.replace(/\\/g, '/');
    const plugins = this.registry.getPlugins();

    for (const plugin of plugins) {
      if (activeFrameworks.includes(plugin.name)) {
        const patterns = plugin.getRoutePatterns();
        const appliesToFramework = patterns.some(regex => regex.test(normalizedPath));
        
        if (appliesToFramework) {
          const contracts = plugin.getRequiredSystemContracts();
          contracts.forEach(contractMethodToken => {
            if (fileNode.internalExports.has(contractMethodToken)) {
              // Emulate active local reference linkages to protect the export
              fileNode.instantiatedIdentifiers.add(contractMethodToken);
            }
          });
        }
      }
    }
  }
}
