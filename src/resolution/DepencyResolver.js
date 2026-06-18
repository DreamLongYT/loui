import resolve from 'enhanced-resolve';
import path from 'path';
import { existsSync } from 'fs';

/**
 * Industrial-Strength Module Resolution Supervisor
 * Integrates path mapping and workspace topologies using enhanced-resolve.
 */
export class DependencyResolver {
  constructor(context, pathMapper, workspaceGraph) {
    this.context = context;
    this.pathMapper = pathMapper;
    this.workspaceGraph = workspaceGraph;
    
    // Instantiate production-grade enhanced-resolve workspace parameters
    this.nativeResolver = resolve.create.sync({
      conditionNames: ['import', 'module', 'require', 'node', 'types'],
      // Extensions prioritized: TS then JS
      extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json', '.vue'],
      mainFields: ['module', 'main', 'types'],
      exportsFields: ['exports'],
      symlinks: true
    });
  }

  /**
   * Resolves a raw import string from a source file into an absolute file path.
   * Handles the "trap" where .ts files import .js files that should resolve to .ts.
   */
  resolveModulePath(containingFile, importSpecifier) {
    if (importSpecifier.startsWith('node:') || [
      'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console', 'constants',
      'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'fs/promises', 'http', 'http2',
      'https', 'inspector', 'module', 'net', 'os', 'path', 'perf_hooks', 'process',
      'punycode', 'querystring', 'readline', 'repl', 'stream', 'string_decoder',
      'timers', 'tls', 'trace_events', 'tty', 'url', 'util', 'v8', 'vm', 'worker_threads', 'zlib'
    ].includes(importSpecifier)) {
      return null;
    }

    const containingDir = path.dirname(containingFile);

    // --- NEW: Fix for JS-in-TS import trap ---
    // If we are in a TS file and importing something ending in .js, 
    // we should try to resolve the .ts version first.
    let effectiveSpecifier = importSpecifier;
    const isTsFile = /\.(ts|tsx|mts|cts)$/.test(containingFile);
    if (isTsFile && importSpecifier.endsWith('.js')) {
        // Try replacing .js with .ts
        const tsSpecifier = importSpecifier.replace(/\.js$/, '.ts');
        try {
            const resolvedTs = this.nativeResolver(containingDir, tsSpecifier);
            if (this.isAbsoluteInternalPath(resolvedTs)) return resolvedTs;
        } catch (e) {
            // Fall back to original specifier if .ts version doesn't exist
        }
    }
    // -----------------------------------------

    // Rule A: Intercept and resolve local monorepo workspace cross-links
    if (this.workspaceGraph.isLocalWorkspaceSpecifier(effectiveSpecifier)) {
      const match = this.workspaceGraph.getWorkspacePackageMatch(effectiveSpecifier);
      if (match) {
        if (effectiveSpecifier === match.packageName) {
          return match.entryPoints[0] || null;
        }
        
        const subPathOffset = effectiveSpecifier.slice(match.packageName.length + 1);
        try {
          return this.nativeResolver(match.rootDirectory, `./${subPathOffset}`);
        } catch {
        }
      }
    }

    // Rule B: Intercept and expand path mapping aliases (@/*)
    const aliasedCandidates = this.pathMapper.resolveCandidatePaths(effectiveSpecifier);
    if (aliasedCandidates.length > 0) {
      for (const candidate of aliasedCandidates) {
        try {
          const resolvedPath = this.nativeResolver(containingDir, candidate);
          if (this.isAbsoluteInternalPath(resolvedPath)) {
            return resolvedPath;
          }
        } catch {
        }
      }
    }

    // Rule C: Standard file system lookups
    try {
      const resolvedPath = this.nativeResolver(containingDir, effectiveSpecifier);
      
      // Fix: Improved handling for dynamic exports/imports
      if (this.isAbsoluteInternalPath(resolvedPath)) {
        return resolvedPath;
      }
    } catch (err) {
      // Fallback: Try to resolve with common extensions if enhanced-resolve fails
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        try {
          const trialPath = effectiveSpecifier.endsWith(ext) ? effectiveSpecifier : effectiveSpecifier + ext;
          const resolvedPath = path.resolve(containingDir, trialPath);
          if (existsSync(resolvedPath)) return resolvedPath;
        } catch {}
      }
      if (this.context.verbose) {
        console.debug(`[Resolution Trace Skip] Specifier unresolvable: ${effectiveSpecifier} inside ${containingFile}`);
      }
    }

    return null;
  }

  isAbsoluteInternalPath(resolvedPath) {
    if (!resolvedPath) return false;
    const normalized = resolvedPath.replace(/\\/g, '/');
    
    if (normalized.includes('/node_modules/')) {
      for (const [name, meta] of this.workspaceGraph.packageManifests.entries()) {
        if (normalized.startsWith(meta.rootDirectory.replace(/\\/g, '/'))) {
          return true;
        }
      }
      return false;
    }
    
    return path.isAbsolute(resolvedPath);
  }

  determineIntentProfile(filePath, declaredExportsManifest) {
    const fileName = path.basename(filePath);
    const isPublicContractFile = /(^index|^public\-api|^entry)\.(ts|js|tsx|jsx)$/i.test(fileName);
    
    if (isPublicContractFile) {
      for (const [symbolKey, metadata] of declaredExportsManifest.entries()) {
        metadata.isLibraryContract = true;
      }
      return 'LIBRARY_CONSUMPTION_TARGET';
    }

    return 'INTERNAL_CODEBASE_ELEMENT';
  }
}
