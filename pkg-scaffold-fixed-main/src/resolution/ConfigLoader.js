import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Loads and parses pkg-scaffold configuration files.
 * Supports scaffold.config.js, .scaffoldrc.json, and .scaffoldrc.
 */
export class ConfigLoader {
  constructor(context) {
    this.context = context;
  }

  async loadConfig(projectRoot) {
    const searchPaths = [
      'pkg-scaffold.json',
      'pkg-scaffold.jsonc',
      '.pkg-scaffold.json',
      '.pkg-scaffold.jsonc',
      'pkg-scaffold.js',
      'pkg-scaffold.ts',
      'pkg-scaffold/config.json',
      'scaffold.config.js',
      'scaffold.config.mjs',
      '.scaffoldrc.json',
      '.scaffoldrc'
    ];

    let config = this.getDefaultConfig();

    // Try package.json first
    try {
      const pkgPath = path.join(projectRoot, 'package.json');
      const pkgContent = await fs.readFile(pkgPath, 'utf8');
      const pkg = JSON.parse(pkgContent);
      if (pkg['pkg-scaffold']) {
        Object.assign(config, pkg['pkg-scaffold']);
      }
    } catch (e) {
      // ignore
    }

    for (const fileName of searchPaths) {
      const fullPath = path.join(projectRoot, fileName);
      try {
        await fs.access(fullPath);
        
        if (fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.ts')) {
          const module = await import(pathToFileURL(fullPath).href);
          Object.assign(config, module.default || module);
          break;
        } else {
          const content = await fs.readFile(fullPath, 'utf8');
          // Very basic JSONC parsing (strip comments)
          const stripped = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
          Object.assign(config, JSON.parse(stripped));
          break;
        }
      } catch (e) {
        continue;
      }
    }

    return config;
  }

  getDefaultConfig() {
    return {
      entryPoints: ['src/index.ts', 'index.js', 'src/index.js', 'src/main.ts', 'src/main.js'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.test.js',
        '**/*.spec.js'
      ],
      plugins: [],
      rules: {
        'no-unused-exports': 'error',
        'no-unused-vars': 'warn',
        'no-dead-code': 'error'
      }
    };
  }
}
