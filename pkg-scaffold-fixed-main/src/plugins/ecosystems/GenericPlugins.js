import path from 'path';
import fs from 'fs/promises';
import { BasePlugin } from '../BasePlugin.js';

export class NuxtPlugin extends BasePlugin {
  get name() { return 'nuxt'; }
  getConfigFiles() { return ['nuxt.config.js', 'nuxt.config.ts']; }
  getRoutePatterns() {
    return [/\/pages\//, /\/server\/(api|routes|middleware)\//, /\/components\/[a-zA-Z0-9_\-\/]+\.vue$/];
  }
  getRequiredSystemContracts() { return ['default']; }
  async isActive(baseDir) {
    for (const file of this.getConfigFiles()) {
      try { await fs.access(path.join(baseDir, file)); return true; } catch {}
    }
    return false;
  }
}

export class RemixPlugin extends BasePlugin {
  get name() { return 'remix'; }
  getConfigFiles() { return ['remix.config.js', 'vite.config.js', 'vite.config.ts']; }
  getRoutePatterns() { return [/\/app\/routes\//, /\/app\/root\.(tsx|jsx)$/]; }
  getRequiredSystemContracts() { return ['default', 'loader', 'action', 'meta', 'links']; }
  async isActive(baseDir) {
    for (const file of this.getConfigFiles()) {
      try {
        const content = await fs.readFile(path.join(baseDir, file), 'utf8');
        if (content.includes('@remix-run/') || content.includes('remix')) return true;
      } catch {}
    }
    return false;
  }
}

export class SvelteKitPlugin extends BasePlugin {
  get name() { return 'sveltekit'; }
  getConfigFiles() { return ['svelte.config.js', 'vite.config.ts']; }
  getRoutePatterns() {
    return [/\+page\.(svelte|ts|js)$/, /\+page\.server\.(ts|js)$/, /\+layout\.(svelte|ts|js)$/, /\+server\.(ts|js)$/];
  }
  getRequiredSystemContracts() { return ['load', 'actions', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH']; }
  async isActive(baseDir) {
    try {
      await fs.access(path.join(baseDir, 'svelte.config.js'));
      return true;
    } catch {
      return false;
    }
  }
}

export class AstroPlugin extends BasePlugin {
  get name() { return 'astro'; }
  getConfigFiles() { return ['astro.config.mjs', 'astro.config.cjs', 'astro.config.ts']; }
  getRoutePatterns() { return [/\/src\/pages\/.*\.astro$/, /\/src\/pages\/.*\.(ts|js)$/]; }
  getRequiredSystemContracts() { return ['default', 'getStaticPaths']; }
  async isActive(baseDir) {
    for (const file of this.getConfigFiles()) {
      try { await fs.access(path.join(baseDir, file)); return true; } catch {}
    }
    return false;
  }
}
