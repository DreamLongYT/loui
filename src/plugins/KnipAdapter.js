/**
 * ============================================================================
 * Knip Plugin Adapter for pkg-scaffold v4.0.0
 * ============================================================================
 * This adapter allows pkg-scaffold to use existing Knip plugins without
 * requiring knip as a dependency. It implements the Knip plugin interface
 * internally to ensure full compatibility.
 */

import path from 'path';
import fs from 'fs/promises';

export class KnipAdapter {
  constructor(context) {
    this.context = context;
    this.knipPlugins = new Map();
  }

  /**
   * Discovers and loads Knip plugins from the project's node_modules
   * or a specified directory.
   */
  async discoverPlugins(projectRoot) {
    // Knip plugins are typically named 'knip-plugin-*' or are part of knip's core
    // We look for common Knip plugin patterns in node_modules
    const nodeModulesPath = path.join(projectRoot, 'node_modules');
    
    try {
      const dirs = await fs.readdir(nodeModulesPath);
      for (const dir of dirs) {
        if (dir.startsWith('knip-plugin-') || dir === '@knip/plugin') {
          await this.loadPlugin(path.join(nodeModulesPath, dir));
        }
      }
    } catch (e) {
      // node_modules not found or unreadable
    }
  }

  /**
   * Loads a specific Knip plugin and wraps it for pkg-scaffold
   */
  async loadPlugin(pluginPath) {
    try {
      const pluginModule = await import(pluginPath);
      const plugin = pluginModule.default || pluginModule;
      
      if (plugin.name && (plugin.config || plugin.entry)) {
        this.knipPlugins.set(plugin.name, this.wrapKnipPlugin(plugin));
        if (this.context.verbose) {
          console.log(`[KnipAdapter] Successfully integrated Knip plugin: ${plugin.name}`);
        }
      }
    } catch (e) {
      // Failed to load plugin
    }
  }

  /**
   * Wraps a Knip plugin to match the pkg-scaffold BasePlugin interface
   */
  wrapKnipPlugin(knipPlugin) {
    return {
      name: `knip-${knipPlugin.name}`,
      isKnipWrapped: true,
      
      getConfigFiles: () => {
        if (Array.isArray(knipPlugin.config)) return knipPlugin.config;
        if (typeof knipPlugin.config === 'string') return [knipPlugin.config];
        return [];
      },
      
      getRoutePatterns: () => {
        if (Array.isArray(knipPlugin.entry)) return knipPlugin.entry.map(e => new RegExp(e.replace('*', '.*')));
        if (typeof knipPlugin.entry === 'string') return [new RegExp(knipPlugin.entry.replace('*', '.*'))];
        return [];
      },
      
      isActive: async (baseDir) => {
        const configFiles = Array.isArray(knipPlugin.config) ? knipPlugin.config : [knipPlugin.config];
        for (const file of configFiles) {
          if (!file) continue;
          try {
            await fs.access(path.join(baseDir, file));
            return true;
          } catch {
            continue;
          }
        }
        return false;
      },
      
      // Map other Knip plugin properties to pkg-scaffold
      get: (key) => knipPlugin[key]
    };
  }

  /**
   * Returns all integrated Knip plugins
   */
  getPlugins() {
    return Array.from(this.knipPlugins.values());
  }
}

export default KnipAdapter;
