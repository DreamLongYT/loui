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

/**
 * Vitepress Ecosystem Plugin
 */
export class VitepressPlugin extends BasePlugin {
  get name() {
    return 'vitepress';
  }

  getConfigFiles() {
    return ['package.json'];
  }

  async isActive(baseDir) {
    // Vitepress is active if it's in package.json OR if .vitepress folder exists
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      const hasDep = !!(pkgJson.dependencies?.vitepress || pkgJson.devDependencies?.vitepress);
      
      // Also check for .vitepress folder existence in common locations
      const possibleDirs = ['.vitepress', 'docs/.vitepress', '.docs/.vitepress'];
      for (const d of possibleDirs) {
        try {
          await fs.access(path.join(baseDir, d));
          return true;
        } catch {}
      }
      
      return hasDep;
    } catch {
      return false;
    }
  }

  async onDiscovery({ pkgDir, data, reachableFiles, queue, projectGraph, context }) {
    const hasVitepressDir = Array.from(projectGraph.keys()).some(f => f.includes('/.vitepress/'));
    const hasVitepressDep = !!(data.devDependencies?.vitepress || data.dependencies?.vitepress);

    if (hasVitepressDir && hasVitepressDep) {
      // Legitimate usage: Mark .vitepress files as reachable
      for (const [filePath, _] of projectGraph.entries()) {
        if (filePath.includes('/.vitepress/') && !reachableFiles.has(filePath)) {
          reachableFiles.add(filePath);
          queue.push(filePath);
        }
      }
      // Mark vue as used since it's required by vitepress
      if (!context.consumedRootPackages) context.consumedRootPackages = new Set();
      context.consumedRootPackages.add('vitepress');
      context.consumedRootPackages.add('vue');
    } else if (hasVitepressDir && !hasVitepressDep) {
      // Missing dependency case
      if (!context.unlistedDependencies) context.unlistedDependencies = [];
      context.unlistedDependencies.push({
        name: 'vitepress',
        reason: 'Found .vitepress configuration directory but package is not in package.json'
      });
    }
    // If hasVitepressDep but !hasVitepressDir, it remains "unused" by default logic
  }
}
