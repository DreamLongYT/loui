import fs from 'fs/promises';
import path from 'path';
import { BasePlugin } from '../BasePlugin.js';

export class TailwindPlugin extends BasePlugin {
  get name() { return 'tailwind'; }
  getConfigFiles() { return ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.cjs', 'tailwind.config.mjs']; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.tailwindcss || pkgJson.devDependencies?.tailwindcss);
    } catch { return false; }
  }
}

export class PostcssPlugin extends BasePlugin {
  get name() { return 'postcss'; }
  getConfigFiles() { return ['postcss.config.js', 'postcss.config.cjs', 'postcss.config.mjs']; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.postcss || pkgJson.devDependencies?.postcss);
    } catch { return false; }
  }
}

export class JestPlugin extends BasePlugin {
  get name() { return 'jest'; }
  getConfigFiles() { return ['jest.config.js', 'jest.config.ts', 'jest.config.mjs', 'jest.config.cjs', 'package.json']; }
  getRoutePatterns() { return [/\.(test|spec)\.[jt]sx?$/]; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.jest || pkgJson.devDependencies?.jest);
    } catch { return false; }
  }
}

export class VitestPlugin extends BasePlugin {
  get name() { return 'vitest'; }
  getConfigFiles() { return ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mjs', 'vitest.workspace.ts']; }
  getRoutePatterns() { return [/\.(test|spec)\.[jt]sx?$/]; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.vitest || pkgJson.devDependencies?.vitest);
    } catch { return false; }
  }
}

export class PlaywrightPlugin extends BasePlugin {
  get name() { return 'playwright'; }
  getConfigFiles() { return ['playwright.config.ts', 'playwright.config.js']; }
  getRoutePatterns() { return [/.*\.spec\.[jt]s$/]; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.['@playwright/test'] || pkgJson.devDependencies?.['@playwright/test']);
    } catch { return false; }
  }
}

export class CypressPlugin extends BasePlugin {
  get name() { return 'cypress'; }
  getConfigFiles() { return ['cypress.config.ts', 'cypress.config.js']; }
  getRoutePatterns() { return [/cypress\/e2e\/.*\.cy\.[jt]s$/]; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.cypress || pkgJson.devDependencies?.cypress);
    } catch { return false; }
  }
}

export class StorybookPlugin extends BasePlugin {
  get name() { return 'storybook'; }
  getConfigFiles() { return ['.storybook/main.js', '.storybook/main.ts', '.storybook/preview.js', '.storybook/preview.ts']; }
  getRoutePatterns() { return [/\.stories\.[jt]sx?$/]; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.storybook || pkgJson.devDependencies?.storybook || pkgJson.devDependencies?.['@storybook/react']);
    } catch { return false; }
  }
}

export class EslintPlugin extends BasePlugin {
  get name() { return 'eslint'; }
  getConfigFiles() { return ['.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', 'eslint.config.js', 'eslint.config.mjs']; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.eslint || pkgJson.devDependencies?.eslint);
    } catch { return false; }
  }
}

export class PrettierPlugin extends BasePlugin {
  get name() { return 'prettier'; }
  getConfigFiles() { return ['.prettierrc', '.prettierrc.js', '.prettierrc.cjs', '.prettierrc.json', 'prettier.config.js']; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.prettier || pkgJson.devDependencies?.prettier);
    } catch { return false; }
  }
}

export class HuskyPlugin extends BasePlugin {
  get name() { return 'husky'; }
  getConfigFiles() { return ['.husky/pre-commit', '.husky/pre-push']; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.husky || pkgJson.devDependencies?.husky);
    } catch { return false; }
  }
}

export class LintStagedPlugin extends BasePlugin {
  get name() { return 'lint-staged'; }
  getConfigFiles() { return ['.lintstagedrc', '.lintstagedrc.js', '.lintstagedrc.json', 'lint-staged.config.js', 'package.json']; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.['lint-staged'] || pkgJson.devDependencies?.['lint-staged']);
    } catch { return false; }
  }
}

export class CommitlintPlugin extends BasePlugin {
  get name() { return 'commitlint'; }
  getConfigFiles() { return ['.commitlintrc', '.commitlintrc.js', '.commitlintrc.json', 'commitlint.config.js', 'package.json']; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.['@commitlint/cli'] || pkgJson.devDependencies?.['@commitlint/cli']);
    } catch { return false; }
  }
}

export class BabelPlugin extends BasePlugin {
  get name() { return 'babel'; }
  getConfigFiles() { return ['.babelrc', '.babelrc.js', '.babelrc.json', 'babel.config.js', 'babel.config.json', 'package.json']; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.['@babel/core'] || pkgJson.devDependencies?.['@babel/core']);
    } catch { return false; }
  }
}

export class RollupPlugin extends BasePlugin {
  get name() { return 'rollup'; }
  getConfigFiles() { return ['rollup.config.js', 'rollup.config.mjs', 'rollup.config.ts']; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.rollup || pkgJson.devDependencies?.rollup);
    } catch { return false; }
  }
}

export class WebpackPlugin extends BasePlugin {
  get name() { return 'webpack'; }
  getConfigFiles() { return ['webpack.config.js', 'webpack.config.ts', 'webpack.config.mjs', 'webpack.config.cjs']; }
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.webpack || pkgJson.devDependencies?.webpack);
    } catch { return false; }
  }
}

export class GithubActionsPlugin extends BasePlugin {
  get name() { return 'github-actions'; }
  getConfigFiles() { return ['.github/workflows/*.yml', '.github/workflows/*.yaml']; }
  async isActive(baseDir) {
    try {
      await fs.access(path.join(baseDir, '.github/workflows'));
      return true;
    } catch { return false; }
  }
}
