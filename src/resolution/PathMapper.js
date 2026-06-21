import fs from 'fs';
import path from 'path';
import { TSConfigLoader } from './TSConfigLoader.js';

export class PathMapper {
  constructor(context) { 
    this.context = context; 
    this.aliasMappers = []; // list of alias mapping functions
  }
  
  async loadMappings(tsconfigFilename = 'tsconfig.json') {
    // Load root tsconfig
    const loader = new TSConfigLoader(this.context.cwd);
    const config = loader.load();
    if (config) {
      const mapper = loader.getAliasMapper(config);
      this.aliasMappers.push(mapper);
      if (this.context.verbose) console.log(`[PathMapper] Loaded root tsconfig aliases`);
    }

    // Load workspace tsconfigs if available
    if (this.context.isWorkspaceEnabled && this.context.monorepoPackageRoots) {
      for (const root of this.context.monorepoPackageRoots) {
        const wsLoader = new TSConfigLoader(root);
        const wsConfig = wsLoader.load();
        if (wsConfig) {
          const wsMapper = wsLoader.getAliasMapper(wsConfig);
          this.aliasMappers.push(wsMapper);
          if (this.context.verbose) console.log(`[PathMapper] Loaded workspace tsconfig aliases from ${root}`);
        }
      }
    }
  }

  /**
   * Resolves physical module paths on disk, translating modern .js imports 
   * back to their actual TypeScript source files.
   * @param {string} p - The target module specifier or absolute path
   */
  resolvePath(p) {
    if (!p || typeof p !== 'string') return p;

    let resolvedP = p;

    // Try alias mappers first
    for (const mapper of this.aliasMappers) {
      const mapped = mapper(resolvedP);
      if (mapped !== resolvedP && fs.existsSync(mapped)) {
        resolvedP = mapped;
        break;
      }
    }

    // FIX 1: If the import ends with .js, translate it to .ts for the search
    if (resolvedP.endsWith('.js')) {
      const tsPath = resolvedP.slice(0, -3) + '.ts';
      if (fs.existsSync(tsPath)) return tsPath;
    }

    // FIX 2: If the import ends with .jsx, translate it to .tsx for the search
    if (resolvedP.endsWith('.jsx')) {
      const tsxPath = resolvedP.slice(0, -4) + '.tsx';
      if (fs.existsSync(tsxPath)) return tsxPath;
    }

    // FIX 3: Support for directory imports (z.B. ./adapters -> ./adapters/index.ts)
    try {
      const stat = fs.statSync(resolvedP);
      if (stat.isDirectory()) {
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        for (const ext of extensions) {
          const indexPath = path.join(resolvedP, `index${ext}`);
          if (fs.existsSync(indexPath)) return indexPath;
        }
      }
    } catch {
      // File does not exist or is not a directory, continue with default
    }

    return resolvedP; 
  }
}
