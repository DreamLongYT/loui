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
    
    // Check if it's a workspace package reference
    if (this.context.isWorkspaceEnabled && this.workspaceGraph && this.workspaceGraph.isLocalWorkspaceSpecifier(specifier)) {
      const match = this.workspaceGraph.getWorkspacePackageMatch(specifier);
      if (match && match.entryPoints && match.entryPoints.length > 0) {
        // Return the first entry point for the workspace package
        return this.normalizePath(match.entryPoints[0]);
      }
    }

    // UPGRADE: Use PathMapper for sophisticated resolution (TS-to-JS, aliases, etc.)
    if (this.pathMapper) {
      // Allow pathMapper to resolve aliases directly from specifier
      const aliasResolved = this.pathMapper.resolvePath(specifier);
      if (aliasResolved && aliasResolved !== specifier && existsSync(aliasResolved)) {
         return this.normalizePath(aliasResolved);
      }

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
