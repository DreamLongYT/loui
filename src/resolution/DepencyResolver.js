import path from 'path';
import { existsSync } from 'fs';

export class DependencyResolver {
  constructor(context, pathMapper, workspaceGraph) {
    this.context = context;
    this.pathMapper = pathMapper;
    this.workspaceGraph = workspaceGraph;
  }

  normalizePath(p) {
    if (!p) return p;
    const original = p;
    // Handle Windows drive letters and backslashes
    let normalized = p.replace(/\\/g, '/');
    if (/^[a-z]:\//i.test(normalized)) {
      normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
    if (this.context.verbose && original !== normalized) {
       // console.log(`[Path-DEBUG] Normalized: ${original} -> ${normalized}`);
    }
    return normalized;
  }

  resolveModulePath(sourceFile, specifier) {
    const cleanSource = this.normalizePath(sourceFile);
    
    // UPGRADE: Use PathMapper for sophisticated resolution (TS-to-JS, aliases, etc.)
    if (this.pathMapper) {
      const dir = path.dirname(cleanSource);
      const target = path.resolve(dir, specifier);
      const resolved = this.pathMapper.resolvePath(target);
      if (resolved && existsSync(resolved)) {
        return this.normalizePath(resolved);
      }
    }

    if (specifier.startsWith('.')) {
      const dir = path.dirname(cleanSource);
      const target = path.resolve(dir, specifier);
      const normalizedTarget = this.normalizePath(target);
      
      const extensions = ['', '.js', '.ts', '.tsx', '.jsx', '/index.js', '/index.ts', '/index.tsx'];
      for (const ext of extensions) {
        const p = normalizedTarget + ext;
        if (existsSync(p)) return this.normalizePath(p);
      }
    }
    return null;
  }
}
