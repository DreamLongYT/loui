/**
 * ============================================================================
 * Modern Frameworks Plugins for loui v4.0.0
 * ============================================================================
 * Built-in support for React, Vue, Svelte, and Angular.
 */

import { BasePlugin } from '../BasePlugin.js';

/**
 * React Ecosystem Plugin
 */
export class ReactPlugin extends BasePlugin {
  get name() {
    return 'react';
  }

  getConfigFiles() {
    return ['package.json'];
  }

  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await require('fs').promises.readFile(require('path').join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.react || pkgJson.devDependencies?.react);
    } catch {
      return false;
    }
  }

  getRoutePatterns() {
    return [/\.(tsx?|jsx?)$/];
  }

  getRequiredSystemContracts() {
    return ['default', 'Component', 'PureComponent', 'Fragment', 'useEffect', 'useState', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef', 'useImperativeHandle', 'useLayoutEffect', 'useDebugValue'];
  }

  async analyze(node, filePath) {
    if (node.explicitImports.has('react')) {
      node.isReactComponent = true;
    }
    
    // Detect JSX
    if (node.rawCode && (node.rawCode.includes('</') || node.rawCode.includes('/>'))) {
      node.hasJSX = true;
    }

    // Detect Hooks
    const hookMatches = node.rawCode?.match(/use[A-Z]\w+/g) || [];
    if (hookMatches.length > 0) {
      node.reactHooks = new Set(hookMatches);
    }
  }
}

/**
 * Vue Ecosystem Plugin
 */
export class VuePlugin extends BasePlugin {
  get name() {
    return 'vue';
  }

  getConfigFiles() {
    return ['package.json', 'vue.config.js', 'vite.config.ts', 'vite.config.js'];
  }

  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await require('fs').promises.readFile(require('path').join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.vue || pkgJson.devDependencies?.vue);
    } catch {
      return false;
    }
  }

  getRoutePatterns() {
    return [/\.vue$/, /\.(tsx?|jsx?)$/];
  }

  async analyze(node, filePath) {
    if (filePath.endsWith('.vue')) {
      node.isVueSFC = true;
      // Extract template/script/style sections
      const templateMatch = node.rawCode?.match(/<template>([\s\S]*)<\/template>/);
      if (templateMatch) node.vueTemplate = templateMatch[1];
      
      const scriptMatch = node.rawCode?.match(/<script(?: setup)?(?: lang=['"]\w+['"])?>([\s\S]*)<\/script>/);
      if (scriptMatch) node.vueScript = scriptMatch[1];
    }
  }
}

/**
 * Svelte Ecosystem Plugin
 */
export class SveltePlugin extends BasePlugin {
  get name() {
    return 'svelte';
  }

  getConfigFiles() {
    return ['package.json', 'svelte.config.js'];
  }

  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await require('fs').promises.readFile(require('path').join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.svelte || pkgJson.devDependencies?.svelte);
    } catch {
      return false;
    }
  }

  getRoutePatterns() {
    return [/\.svelte$/, /\.(tsx?|jsx?)$/];
  }

  async analyze(node, filePath) {
    if (filePath.endsWith('.svelte')) {
      node.isSvelteComponent = true;
    }
  }
}

/**
 * Angular Ecosystem Plugin
 */
export class AngularPlugin extends BasePlugin {
  get name() {
    return 'angular';
  }

  getConfigFiles() {
    return ['package.json', 'angular.json'];
  }

  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await require('fs').promises.readFile(require('path').join(baseDir, 'package.json'), 'utf8'));
      return !!(pkgJson.dependencies?.['@angular/core'] || pkgJson.devDependencies?.['@angular/core']);
    } catch {
      return false;
    }
  }

  getRoutePatterns() {
    return [/\.ts$/];
  }

  async analyze(node, filePath) {
    if (node.rawCode?.includes('@Component') || node.rawCode?.includes('@Injectable') || node.rawCode?.includes('@NgModule')) {
      node.isAngularEntity = true;
    }
  }
}
