/**
 * ============================================================================
 * Plugin SDK for entkapp v4.0.0
 * ============================================================================
 * Provides utilities and helpers for developing custom plugins that extend
 * entkapp's analysis and healing capabilities.
 */

import { BasePlugin } from '../plugins/BasePlugin.js';

/**
 * Extended plugin base class with SDK utilities
 */
export class PluginSDKBase extends BasePlugin {
  constructor(context) {
    super(context);
    this.hooks = new Map();
    this.transformers = [];
    this.validators = [];
  }

  /**
   * Register a hook for a specific lifecycle event
   * @param {string} eventName - Event name (e.g., 'analyze:start', 'refactor:complete')
   * @param {Function} handler - Handler function
   */
  registerHook(eventName, handler) {
    if (!this.hooks.has(eventName)) {
      this.hooks.set(eventName, []);
    }
    this.hooks.get(eventName).push(handler);
  }

  /**
   * Emit a hook event
   * @param {string} eventName - Event name
   * @param {Object} data - Event data
   */
  async emitHook(eventName, data) {
    const handlers = this.hooks.get(eventName) || [];
    for (const handler of handlers) {
      await handler(data);
    }
  }

  /**
   * Register a code transformer
   * @param {Function} transformer - Transformer function
   */
  registerTransformer(transformer) {
    this.transformers.push(transformer);
  }

  /**
   * Register a validator
   * @param {Function} validator - Validator function
   */
  registerValidator(validator) {
    this.validators.push(validator);
  }

  /**
   * Apply all registered transformers to a code string
   * @param {string} code - Source code
   * @param {string} filePath - File path
   * @returns {Promise<string>} Transformed code
   */
  async applyTransformers(code, filePath) {
    let result = code;
    for (const transformer of this.transformers) {
      result = await transformer(result, filePath);
    }
    return result;
  }

  /**
   * Run all validators on a code string
   * @param {string} code - Source code
   * @param {string} filePath - File path
   * @returns {Promise<Array>} Validation errors
   */
  async runValidators(code, filePath) {
    const errors = [];
    for (const validator of this.validators) {
      const result = await validator(code, filePath);
      if (result && result.length > 0) {
        errors.push(...result);
      }
    }
    return errors;
  }
}

/**
 * SDK utilities for plugin development
 */
export class PluginSDK {
  /**
   * Create a custom plugin class
   * @param {Object} config - Plugin configuration
   * @returns {Class} Plugin class
   */
  static createPlugin(config) {
    return class CustomPlugin extends PluginSDKBase {
      get name() {
        return config.name;
      }

      getConfigFiles() {
        return config.configFiles || [];
      }

      getRoutePatterns() {
        return config.routePatterns || [];
      }

      getRequiredSystemContracts() {
        return config.requiredContracts || ['default'];
      }

      async isActive(baseDir) {
        if (config.isActive) {
          return await config.isActive(baseDir);
        }
        return super.isActive(baseDir);
      }

      async initialize() {
        if (config.initialize) {
          await config.initialize(this.context);
        }
      }

      async analyze(node, filePath) {
        if (config.analyze) {
          return await config.analyze(node, filePath, this.context);
        }
      }

      async transform(code, filePath) {
        if (config.transform) {
          return await config.transform(code, filePath, this.context);
        }
        return code;
      }

      async validate(code, filePath) {
        if (config.validate) {
          return await config.validate(code, filePath, this.context);
        }
        return [];
      }
    };
  }

  /**
   * Create a CSS-in-JS analyzer plugin
   * @param {Object} config - Configuration for CSS-in-JS analysis
   * @returns {Class} Plugin class
   */
  static createCSSInJSPlugin(config = {}) {
    const cssLibraries = config.libraries || [
      'styled-components',
      'emotion',
      '@emotion/react',
      '@emotion/styled',
      'linaria',
      'vanilla-extract'
    ];

    return this.createPlugin({
      name: config.name || 'css-in-js-analyzer',
      configFiles: [],
      routePatterns: [/\.(tsx?|jsx?)$/],
      requiredContracts: [],

      async analyze(node, filePath) {
        // Track CSS-in-JS imports
        for (const lib of cssLibraries) {
          if (node.explicitImports.has(lib)) {
            node.cssInJsLibraries = node.cssInJsLibraries || new Set();
            node.cssInJsLibraries.add(lib);
          }
        }

        // Detect styled component definitions
        const styledPattern = /(?:styled|css|keyframes)\s*\.\w+|styled\(\w+\)/g;
        for (const match of (node.rawCode || '').matchAll(styledPattern)) {
          node.styledComponentUsages = node.styledComponentUsages || [];
          node.styledComponentUsages.push(match[0]);
        }
      },

      async validate(code, filePath) {
        const errors = [];
        // Check for unused CSS-in-JS definitions
        const unusedStylesPattern = /(?:const|let|var)\s+(\w+)\s*=\s*(?:styled|css)\./g;
        const matches = [...code.matchAll(unusedStylesPattern)];

        for (const match of matches) {
          const styleName = match[1];
          const usagePattern = new RegExp(`\\b${styleName}\\b`);
          if (!usagePattern.test(code.substring(match.index + match[0].length))) {
            errors.push({
              type: 'unused-style',
              name: styleName,
              line: code.substring(0, match.index).split('\n').length,
              message: `Unused CSS-in-JS definition: ${styleName}`
            });
          }
        }

        return errors;
      }
    });
  }

  /**
   * Create an asset tracking plugin
   * @param {Object} config - Configuration for asset tracking
   * @returns {Class} Plugin class
   */
  static createAssetTrackingPlugin(config = {}) {
    const assetExtensions = config.extensions || [
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
      '.mp4', '.webm', '.mp3', '.wav',
      '.woff', '.woff2', '.ttf', '.eot'
    ];

    return this.createPlugin({
      name: config.name || 'asset-tracker',
      configFiles: [],
      routePatterns: [/\.(tsx?|jsx?)$/],

      async analyze(node, filePath) {
        node.assetReferences = node.assetReferences || new Set();

        // Track asset imports
        const assetImportPattern = /import\s+(?:\*\s+as\s+\w+|[\w\s,{}]+)\s+from\s+['"]([^'"]+(?:${assetExtensions.join('|')}))['"]/g;
        for (const match of (node.rawCode || '').matchAll(assetImportPattern)) {
          node.assetReferences.add(match[1]);
        }

        // Track asset requires
        const assetRequirePattern = /require\s*\(\s*['"]([^'"]+(?:${assetExtensions.join('|')}))['"]\s*\)/g;
        for (const match of (node.rawCode || '').matchAll(assetRequirePattern)) {
          node.assetReferences.add(match[1]);
        }

        // Track asset URLs in strings
        const assetUrlPattern = /['"]([^'"]*(?:${assetExtensions.join('|')}))['"]/g;
        for (const match of (node.rawCode || '').matchAll(assetUrlPattern)) {
          node.assetReferences.add(match[1]);
        }
      }
    });
  }

  /**
   * Create a monorepo awareness plugin
   * @param {Object} config - Configuration for monorepo support
   * @returns {Class} Plugin class
   */
  static createMonorepoPlugin(config = {}) {
    return this.createPlugin({
      name: config.name || 'monorepo-aware',
      configFiles: config.configFiles || ['nx.json', 'pnpm-workspace.yaml', 'lerna.json'],

      async analyze(node, filePath) {
        // Track workspace package references
        node.workspaceReferences = node.workspaceReferences || new Set();

        // Detect workspace imports (e.g., @workspace/package-name)
        const workspacePattern = /@[\w-]+\/[\w-]+/g;
        for (const match of (node.rawCode || '').matchAll(workspacePattern)) {
          node.workspaceReferences.add(match[0]);
        }
      }
    });
  }

  /**
   * Create a circular dependency detector plugin
   * @param {Object} config - Configuration
   * @returns {Class} Plugin class
   */
  static createCircularDepPlugin(config = {}) {
    return this.createPlugin({
      name: config.name || 'circular-dep-detector',

      async analyze(node, filePath) {
        node.potentialCycles = node.potentialCycles || [];
        // Cycle detection will be handled by the main engine
      }
    });
  }
}

export default PluginSDK;
