import fs from 'fs/promises';
import path from 'path';

/**
 * Advanced Dependency Profiling Engine.
 * Traces Peer Dependencies and Implicit Tooling Invocations.
 * Now supports "Unused Binaries" detection.
 */
export class DependencyProfiler {
  constructor(context) {
    this.context = context;

    this.binaryToPackageMap = {
      'tsc': 'typescript',
      'ts-node': 'ts-node',
      'tsx': 'tsx',
      'node': 'node',
      'bun': 'bun',
      'deno': 'deno',
      'jest': 'jest',
      'vitest': 'vitest',
      'mocha': 'mocha',
      'jasmine': 'jasmine',
      'ava': 'ava',
      'tap': 'tap',
      'uvu': 'uvu',
      'c8': 'c8',
      'nyc': 'nyc',
      'playwright': '@playwright/test',
      'cypress': 'cypress',
      'puppeteer': 'puppeteer',
      'webdriverio': 'webdriverio',
      'wdio': '@wdio/cli',
      'eslint': 'eslint',
      'prettier': 'prettier',
      'tslint': 'tslint',
      'biome': '@biomejs/biome',
      'oxlint': 'oxlint',
      'stylelint': 'stylelint',
      'markdownlint': 'markdownlint-cli',
      'commitlint': '@commitlint/cli',
      'lint-staged': 'lint-staged',
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
      'tailwind': 'tailwindcss',
      'tailwindcss': 'tailwindcss',
      'postcss': 'postcss',
      'sass': 'sass',
      'less': 'less',
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
      'typedoc': 'typedoc',
      'jsdoc': 'jsdoc',
      'storybook': 'storybook',
      'sb': 'storybook',
      'husky': 'husky',
      'simple-git-hooks': 'simple-git-hooks',
      'lefthook': 'lefthook',
      'pnpm': 'pnpm',
      'yarn': 'yarn',
      'npm': 'npm',
      'patch-package': 'patch-package',
      'syncpack': 'syncpack',
      'publint': 'publint',
      'attw': '@arethetypeswrong/cli',
      'size-limit': 'size-limit',
      'bundlesize': 'bundlesize',
      'depcheck': 'depcheck',
      'knip': 'knip',
      'entkapp': 'entkapp'
    };

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

  async traceImplicitInvocations(projectRoot) {
    const usedPackages = new Set();
    const usedBinaries = new Set(); // NEW: Track which binaries are actually used
    
    // 1. Scan package.json scripts (Root)
    await this._scanDirectoryForConfigs(projectRoot, usedPackages, usedBinaries);

    // 1.5 Scan Workspace package.json scripts and configs
    if (this.context.isWorkspaceEnabled && this.context.monorepoPackageRoots) {
      for (const workspaceRoot of this.context.monorepoPackageRoots) {
        await this._scanDirectoryForConfigs(workspaceRoot, usedPackages, usedBinaries);
      }
    }

    // 2. Scan CI workflows
    try {
      const githubWorkflows = path.join(projectRoot, '.github/workflows');
      const files = await fs.readdir(githubWorkflows).catch(() => []);
      for (const file of files) {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
          const content = await fs.readFile(path.join(githubWorkflows, file), 'utf8');
          this.extractPackagesFromScript(content, usedPackages, usedBinaries);
        }
      }
    } catch (e) {}

    // 4. Identify Unused Binaries (Root)
    await this._identifyUnusedBinaries(projectRoot, usedBinaries);
    
    // 4.5 Identify Unused Binaries (Workspaces)
    if (this.context.isWorkspaceEnabled && this.context.monorepoPackageRoots) {
      for (const workspaceRoot of this.context.monorepoPackageRoots) {
        await this._identifyUnusedBinaries(workspaceRoot, usedBinaries);
      }
    }

    return usedPackages;
  }

  async _scanDirectoryForConfigs(dir, usedPackages, usedBinaries) {
    try {
      const pkgJsonPath = path.join(dir, 'package.json');
      const pkg = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
      
      if (pkg.scripts) {
        for (const script of Object.values(pkg.scripts)) {
          this.extractPackagesFromScript(script, usedPackages, usedBinaries);
        }
      }

      if (pkg.dependencies || pkg.devDependencies) {
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const depName of Object.keys(allDeps)) {
          if (depName.startsWith('@types/')) {
            usedPackages.add(depName);
          }
        }
      }
    } catch (e) {}

    try {
      const dirEntries = await fs.readdir(dir, { withFileTypes: true });
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
  }

  async _identifyUnusedBinaries(dir, usedBinaries) {
    try {
      const binDir = path.join(dir, 'node_modules', '.bin');
      const availableBinaries = await fs.readdir(binDir).catch(() => []);
      
      for (const bin of availableBinaries) {
        if (bin.startsWith('.') || ['npm', 'pnpm', 'yarn', 'bun'].includes(bin)) continue;
        
        if (!usedBinaries.has(bin)) {
          this.context.unusedBinaries.add(bin);
        }
      }
    } catch (e) {}
  }

  extractPackagesFromScript(script, packageCollector, binaryCollector) {
    const words = script.split(/[\s&|;()\n\r\t]+/);
    for (let i = 0; i < words.length; i++) {
      const rawWord = words[i];
      const cleanWord = rawWord.replace(/['"]/g, '').replace(/^(npx|pnpx|bunx|yarn|pnpm)\s+/, '');

      if (this.binaryToPackageMap[cleanWord]) {
        packageCollector.add(this.binaryToPackageMap[cleanWord]);
        if (binaryCollector) binaryCollector.add(cleanWord);
        continue;
      }

      if ((rawWord === 'npx' || rawWord === 'pnpx' || rawWord === 'bunx') && i + 1 < words.length) {
        const nextWord = words[i + 1].replace(/['"]/g, '');
        if (this.binaryToPackageMap[nextWord]) {
          packageCollector.add(this.binaryToPackageMap[nextWord]);
          if (binaryCollector) binaryCollector.add(nextWord);
        }
        if (nextWord.startsWith('@') || nextWord.includes('/')) {
          const pkgName = nextWord.split('/').slice(0, nextWord.startsWith('@') ? 2 : 1).join('/');
          if (pkgName) packageCollector.add(pkgName);
        }
      }
    }
  }

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

  shouldExcludeFromUnusedCheck(packageName, depType) {
    if (depType === 'peerDependency' || depType === 'optionalDependency') {
      return true;
    }
    if (packageName.startsWith('@types/')) {
      return true;
    }
    return false;
  }
}
