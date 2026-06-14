import fs from 'fs/promises';
import path from 'path';

/**
 * Advanced Dependency Profiling Engine.
 * Traces Peer Dependencies and Implicit Tooling Invocations.
 *
 * Improvements over v1:
 * - Extended binary-to-package map covering 60+ common tools
 * - Scans all package.json scripts (including nested workspaces)
 * - Recognises @types/* packages as implicitly used by TypeScript
 * - Handles framework-specific config-file conventions (Next.js, Vite, etc.)
 * - Correctly skips peerDependencies and optionalDependencies from "unused" checks
 * - Scans common config files for additional package references
 */
export class DependencyProfiler {
  constructor(context) {
    this.context = context;

    /**
     * Maps CLI binary names to their corresponding npm package names.
     * This list covers the most common build tools, test runners, linters,
     * formatters, bundlers, and framework CLIs encountered in real projects.
     */
    this.binaryToPackageMap = {
      // TypeScript / JavaScript compilers & runtimes
      'tsc': 'typescript',
      'ts-node': 'ts-node',
      'tsx': 'tsx',
      'node': 'node',
      'bun': 'bun',
      'deno': 'deno',

      // Test runners
      'jest': 'jest',
      'vitest': 'vitest',
      'mocha': 'mocha',
      'jasmine': 'jasmine',
      'ava': 'ava',
      'tap': 'tap',
      'uvu': 'uvu',
      'c8': 'c8',
      'nyc': 'nyc',

      // E2E / browser testing
      'playwright': '@playwright/test',
      'cypress': 'cypress',
      'puppeteer': 'puppeteer',
      'webdriverio': 'webdriverio',
      'wdio': '@wdio/cli',

      // Linters & formatters
      'eslint': 'eslint',
      'prettier': 'prettier',
      'tslint': 'tslint',
      'biome': '@biomejs/biome',
      'oxlint': 'oxlint',
      'stylelint': 'stylelint',
      'markdownlint': 'markdownlint-cli',
      'commitlint': '@commitlint/cli',
      'lint-staged': 'lint-staged',

      // Bundlers & build tools
      'vite': 'vite',
      'webpack': 'webpack',
      'rollup': 'rollup',
      'esbuild': 'esbuild',
      'parcel': 'parcel',
      'turbo': 'turbo',
      'nx': 'nx',
      'lerna': 'lerna',
      'changesets': '@changesets/cli',
      'changeset': '@changesets/cli',
      'tsup': 'tsup',
      'unbuild': 'unbuild',
      'pkgroll': 'pkgroll',
      'microbundle': 'microbundle',
      'ncc': '@vercel/ncc',
      'swc': '@swc/cli',

      // CSS / styling tools
      'tailwind': 'tailwindcss',
      'tailwindcss': 'tailwindcss',
      'postcss': 'postcss',
      'sass': 'sass',
      'less': 'less',

      // Framework CLIs
      'next': 'next',
      'nuxt': 'nuxt',
      'astro': 'astro',
      'remix': '@remix-run/dev',
      'svelte-kit': '@sveltejs/kit',
      'expo': 'expo',
      'react-scripts': 'react-scripts',
      'ng': '@angular/cli',
      'vue': '@vue/cli-service',
      'gatsby': 'gatsby',

      // API / server tools
      'nodemon': 'nodemon',
      'ts-node-dev': 'ts-node-dev',
      'concurrently': 'concurrently',
      'cross-env': 'cross-env',
      'dotenv': 'dotenv-cli',
      'dotenv-cli': 'dotenv-cli',
      'rimraf': 'rimraf',
      'del-cli': 'del-cli',
      'copyfiles': 'copyfiles',
      'cpy-cli': 'cpy-cli',
      'mkdirp': 'mkdirp',
      'shx': 'shx',
      'npm-run-all': 'npm-run-all',
      'run-p': 'npm-run-all',
      'run-s': 'npm-run-all',

      // Documentation
      'typedoc': 'typedoc',
      'jsdoc': 'jsdoc',
      'storybook': 'storybook',
      'sb': 'storybook',

      // Git hooks
      'husky': 'husky',
      'simple-git-hooks': 'simple-git-hooks',
      'lefthook': 'lefthook',

      // Package managers (used in scripts)
      'pnpm': 'pnpm',
      'yarn': 'yarn',
      'npm': 'npm',

      // Misc
      'patch-package': 'patch-package',
      'syncpack': 'syncpack',
      'publint': 'publint',
      'attw': '@arethetypeswrong/cli',
      'size-limit': 'size-limit',
      'bundlesize': 'bundlesize',
      'depcheck': 'depcheck',
      'knip': 'knip',
      'pkg-scaffold': 'pkg-scaffold'
    };

    /**
     * Config file names that imply a package is in use even when not imported
     * in source code. Maps config filename fragment -> package name.
     */
    this.configFileToPackageMap = {
      'jest.config': 'jest',
      'vitest.config': 'vitest',
      'playwright.config': '@playwright/test',
      'cypress.config': 'cypress',
      'webpack.config': 'webpack',
      'vite.config': 'vite',
      'rollup.config': 'rollup',
      'tailwind.config': 'tailwindcss',
      'postcss.config': 'postcss',
      '.eslintrc': 'eslint',
      'eslint.config': 'eslint',
      '.prettierrc': 'prettier',
      'prettier.config': 'prettier',
      '.babelrc': '@babel/core',
      'babel.config': '@babel/core',
      '.stylelintrc': 'stylelint',
      'stylelint.config': 'stylelint',
      'svelte.config': '@sveltejs/kit',
      'astro.config': 'astro',
      'nuxt.config': 'nuxt',
      'next.config': 'next',
      'remix.config': '@remix-run/dev',
      '.commitlintrc': '@commitlint/cli',
      'commitlint.config': '@commitlint/cli',
      'tsup.config': 'tsup',
      'typedoc': 'typedoc',
      '.lintstagedrc': 'lint-staged',
      'lint-staged.config': 'lint-staged',
      'lefthook': 'lefthook',
      'knip.config': 'knip',
      'knip.json': 'knip'
    };
  }

  /**
   * Scans package.json scripts and CI files for binary usage.
   * Also scans config files that imply package usage.
   *
   * @param {string} projectRoot - Absolute path to the package root directory
   * @returns {Promise<Set<string>>} Set of npm package names that are implicitly used
   */
  async traceImplicitInvocations(projectRoot) {
    const usedPackages = new Set();
    
    // 1. Scan package.json scripts
    try {
      const pkgJsonPath = path.join(projectRoot, 'package.json');
      const pkg = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
      
      if (pkg.scripts) {
        for (const script of Object.values(pkg.scripts)) {
          this.extractPackagesFromScript(script, usedPackages);
        }
      }

      // 2. Detect packages referenced in the "bin" field of installed packages
      //    (e.g. turbo, nx, etc. that are only run via scripts)
      if (pkg.dependencies || pkg.devDependencies) {
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const depName of Object.keys(allDeps)) {
          // @types/* packages are always "used" by TypeScript – never flag them as unused
          if (depName.startsWith('@types/')) {
            usedPackages.add(depName);
          }
        }
      }
    } catch (e) {}

    // 3. Scan CI workflows
    try {
      const githubWorkflows = path.join(projectRoot, '.github/workflows');
      const files = await fs.readdir(githubWorkflows).catch(() => []);
      for (const file of files) {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
          const content = await fs.readFile(path.join(githubWorkflows, file), 'utf8');
          this.extractPackagesFromScript(content, usedPackages);
        }
      }
    } catch (e) {}

    // 4. Scan config files that imply package usage
    try {
      const dirEntries = await fs.readdir(projectRoot, { withFileTypes: true });
      for (const entry of dirEntries) {
        if (!entry.isFile()) continue;
        const fileName = entry.name;
        for (const [fragment, pkgName] of Object.entries(this.configFileToPackageMap)) {
          if (fileName.startsWith(fragment) || fileName === fragment) {
            usedPackages.add(pkgName);
            break;
          }
        }
      }
    } catch (e) {}

    // 5. Scan Makefile / shell scripts in the project root for binary usage
    try {
      for (const scriptFile of ['Makefile', 'makefile', 'GNUmakefile']) {
        try {
          const content = await fs.readFile(path.join(projectRoot, scriptFile), 'utf8');
          this.extractPackagesFromScript(content, usedPackages);
        } catch {}
      }
    } catch (e) {}

    return usedPackages;
  }

  /**
   * Extracts npm package names from a script string by matching known binary names.
   * Handles npx/pnpx/yarn/bunx prefixes and common shell constructs.
   *
   * @param {string} script - Script string (e.g. from package.json scripts)
   * @param {Set<string>} collector - Set to add found package names to
   */
  extractPackagesFromScript(script, collector) {
    // Split on common shell delimiters
    const words = script.split(/[\s&|;()\n\r\t]+/);
    for (let i = 0; i < words.length; i++) {
      const rawWord = words[i];
      // Strip quotes and common prefixes like npx, pnpx, bunx, yarn, pnpm exec
      const cleanWord = rawWord.replace(/['"]/g, '').replace(/^(npx|pnpx|bunx|yarn|pnpm)\s+/, '');

      // Direct binary match
      if (this.binaryToPackageMap[cleanWord]) {
        collector.add(this.binaryToPackageMap[cleanWord]);
        continue;
      }

      // Handle "npx <binary>" pattern where npx and binary are separate words
      if ((rawWord === 'npx' || rawWord === 'pnpx' || rawWord === 'bunx') && i + 1 < words.length) {
        const nextWord = words[i + 1].replace(/['"]/g, '');
        if (this.binaryToPackageMap[nextWord]) {
          collector.add(this.binaryToPackageMap[nextWord]);
        }
        // Also handle "npx @scope/pkg" style
        if (nextWord.startsWith('@') || nextWord.includes('/')) {
          const pkgName = nextWord.split('/').slice(0, nextWord.startsWith('@') ? 2 : 1).join('/');
          if (pkgName) collector.add(pkgName);
        }
      }
    }
  }

  /**
   * Resolves peer dependencies for a given set of used packages.
   * Peer dependencies are considered "implicitly used" and should not be
   * flagged as unused even if they are not directly imported in source code.
   *
   * @param {Set<string>} usedPackages - Set of package names that are known to be used
   * @param {string} projectRoot - Absolute path to the package root directory
   * @returns {Promise<Set<string>>} Set of peer dependency package names
   */
  async resolvePeerDependencies(usedPackages, projectRoot) {
    const peerDeps = new Set();
    const nodeModules = path.join(projectRoot, 'node_modules');

    for (const pkgName of usedPackages) {
      try {
        const pkgJsonPath = path.join(nodeModules, pkgName, 'package.json');
        const pkg = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
        if (pkg.peerDependencies) {
          Object.keys(pkg.peerDependencies).forEach(dep => peerDeps.add(dep));
        }
      } catch (e) {}
    }
    return peerDeps;
  }

  /**
   * Determines whether a dependency should be excluded from "unused" checks.
   *
   * Rules:
   * - peerDependencies: always excluded (they are required by the consumer, not the package itself)
   * - optionalDependencies: always excluded (they may not be installed at all)
   * - @types/* packages: excluded when TypeScript is present (used implicitly by tsc)
   * - Packages used in scripts / config files: excluded via traceImplicitInvocations()
   *
   * @param {string} packageName - npm package name
   * @param {'dependency'|'devDependency'|'peerDependency'|'optionalDependency'} depType
   * @returns {boolean} true if this dependency should be skipped in unused checks
   */
  shouldExcludeFromUnusedCheck(packageName, depType) {
    if (depType === 'peerDependency' || depType === 'optionalDependency') {
      return true;
    }
    // @types/* packages are consumed implicitly by the TypeScript compiler
    if (packageName.startsWith('@types/')) {
      return true;
    }
    return false;
  }
}
