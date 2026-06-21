import fs from 'fs/promises';
import path from 'path';

/**
 * ConfigLoader
 * Loads and merges entkapp configuration from multiple sources:
 * - entkapp/config.json (project config)
 * - entkapp.config.js / entkapp.config.mjs (JS config)
 * - package.json "entkapp" key
 * - CLI flags (passed as overrides)
 */
export class ConfigLoader {
  constructor(cwd) { 
    this.cwd = cwd; 
  }

  async loadConfig(overrides = {}) {
    let config = this._defaultConfig();

    // 1. Try entkapp/config.json
    const jsonConfigPath = path.join(this.cwd, 'entkapp', 'config.json');
    try {
      const raw = await fs.readFile(jsonConfigPath, 'utf8');
      // Strip comments from JSON (JSONC support)
      const stripped = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const parsed = JSON.parse(stripped);
      config = this._merge(config, parsed);
    } catch (e) {}

    // 2. Try entkapp.config.js / entkapp.config.mjs
    for (const configFile of ['entkapp.config.mjs', 'entkapp.config.js', 'entkapp.config.cjs']) {
      const jsConfigPath = path.join(this.cwd, configFile);
      try {
        const mod = await import(jsConfigPath);
        const jsConfig = mod.default || mod;
        if (typeof jsConfig === 'object') {
          config = this._merge(config, jsConfig);
          break;
        }
      } catch (e) {}
    }

    // 3. Try package.json "entkapp" key
    const pkgPath = path.join(this.cwd, 'package.json');
    try {
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
      if (pkg.entkapp && typeof pkg.entkapp === 'object') {
        config = this._merge(config, pkg.entkapp);
      }
    } catch (e) {}

    // 4. Apply CLI overrides
    config = this._merge(config, overrides);

    return config;
  }

  _defaultConfig() {
    return {
      interface: 'CLI',
      useBuiltinPlugins: true,
      useCustomPlugins: true,
      options: {
        verbose: false,
        fastMode: true,
        selfHealing: true
      },
      enabledPlugins: [],
      ignoreDependencies: ['entkapp', '@types/*'],
      exclude: ['node_modules', '.git', 'dist', 'build', 'coverage'],
      entryPoints: [],
      workspace: false
    };
  }

  _merge(base, override) {
    if (!override || typeof override !== 'object') return base;
    const result = { ...base };
    for (const key of Object.keys(override)) {
      if (key === 'options' && typeof override[key] === 'object') {
        result.options = { ...(base.options || {}), ...override[key] };
      } else if (Array.isArray(override[key])) {
        result[key] = override[key];
      } else {
        result[key] = override[key];
      }
    }
    return result;
  }
}
