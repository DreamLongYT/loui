/**
 * ============================================================================
 * Plugin SDK for entkapp v4.7.0 (Enterprise Edition)
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
   */
  registerHook(eventName, handler) {
    if (!this.hooks.has(eventName)) {
      this.hooks.set(eventName, []);
    }
    this.hooks.get(eventName).push(handler);
  }

  /**
   * Emit a hook event
   */
  async emitHook(eventName, data) {
    const handlers = this.hooks.get(eventName) || [];
    for (const handler of handlers) {
      await handler(data);
    }
  }

  /**
   * Register a code transformer
   */
  registerTransformer(transformer) {
    this.transformers.push(transformer);
  }

  /**
   * Register a validator
   */
  registerValidator(validator) {
    this.validators.push(validator);
  }

  /**
   * Enterprise: Register a Call Graph visitor
   */
  registerCallGraphVisitor(visitor) {
      this.context.callGraphVisitors = this.context.callGraphVisitors || [];
      this.context.callGraphVisitors.push(visitor);
  }
}

/**
 * SDK utilities for plugin development
 */
export class PluginSDK {
  /**
   * Create a custom plugin class
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
    };
  }

  /**
   * Create a specialized member usage analyzer
   */
  static createMemberAnalyzer(config = {}) {
      return this.createPlugin({
          name: config.name || 'custom-member-analyzer',
          async analyze(node, filePath, context) {
              // Custom logic to protect or flag specific members
              if (config.protectMembers) {
                  for (const [symbol, meta] of node.internalExports.entries()) {
                      if (meta.members) {
                          meta.members.forEach(m => {
                              if (config.protectMembers.includes(m.name)) {
                                  m.isPublic = true; // Mark as public to protect from deletion
                              }
                          });
                      }
                  }
              }
          }
      });
  }
}

export default PluginSDK;
