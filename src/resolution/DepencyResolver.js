import resolve from 'enhanced-resolve';
import path from 'path';

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
      extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json', '.vue'],
      mainFields: ['module', 'main', 'types'],
      exportsFields: ['exports'],
      symlinks: true
    });
  }

  /**
   * Resolves a raw import string from a source file into an absolute file path.
   * @param {string} containingFile - Absolute path of the file containing the import declaration
   * @param {string} importSpecifier - Raw import target string (e.g., '../components/Button' or '@utils/math')
   * @returns {string|null} Resolved absolute file path location on disk, or null if external/third-party node_module
   */
  resolveModulePath(containingFile, importSpecifier) {
    // Challenge #16: Ignore built-in Node.js modules (fs, path, etc.)
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

    // Rule A: Intercept and resolve local monorepo workspace cross-links
    if (this.workspaceGraph.isLocalWorkspaceSpecifier(importSpecifier)) {
      const match = this.workspaceGraph.getWorkspacePackageMatch(importSpecifier);
      if (match) {
        if (importSpecifier === match.packageName) {
          // Point directly to the target package's configured index entry file
          return match.entryPoints[0] || null;
        }
        
        // Handle deep sub-path monorepo target imports
        const subPathOffset = importSpecifier.slice(match.packageName.length + 1);
        try {
          return this.nativeResolver(match.rootDirectory, `./${subPathOffset}`);
        } catch {
          // Fall back to scanning the package root directly if the sub-path lookup fails
        }
      }
    }

    // Rule B: Intercept and expand path mapping aliases (@/*)
    const aliasedCandidates = this.pathMapper.resolveCandidatePaths(importSpecifier);
    if (aliasedCandidates.length > 0) {
      for (const candidate of aliasedCandidates) {
        try {
          const resolvedPath = this.nativeResolver(containingDir, candidate);
          if (this.isAbsoluteInternalPath(resolvedPath)) {
            return resolvedPath;
          }
        } catch {
          // Candidate target path absent; try the next fallback pattern entry
        }
      }
    }

    // Rule C: Standard file system lookups for standard files or package assets
    try {
      const resolvedPath = this.nativeResolver(containingDir, importSpecifier);
      if (this.isAbsoluteInternalPath(resolvedPath)) {
        return resolvedPath;
      }
    } catch (err) {
      if (this.context.verbose) {
        // Output trace logs for unresolvable dependencies during deep code investigations
        console.debug(`[Resolution Trace Skip] Specifier unresolvable from context: ${importSpecifier} inside ${containingFile}`);
      }
    }

    return null; // Target is an external node_module dependency or an unresolvable asset
  }

  /**
   * Ensures our tracking focus stays locked onto internal codebase components, bypassing third-party node_modules.
   */
  isAbsoluteInternalPath(resolvedPath) {
    if (!resolvedPath) return false;
    const normalized = resolvedPath.replace(/\\/g, '/');
    
    // Ignore external node_modules blocks, but preserve local monorepo packages that live inside symlinked node_modules
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

  /**
   * Challenge #17 Intent Detection. Evaluates if an export serves as a consumer contract distribution node.
   */
  determineIntentProfile(filePath, declaredExportsManifest) {
    const fileName = path.basename(filePath);
    const isPublicContractFile = /(^index|^public\-api|^entry)\.(ts|js|tsx|jsx)$/i.test(fileName);
    
    // If the file is a primary bundle entry point, flag its exports as protected public contracts
    if (isPublicContractFile) {
      for (const [symbolKey, metadata] of declaredExportsManifest.entries()) {
        metadata.isLibraryContract = true;
      }
      return 'LIBRARY_CONSUMPTION_TARGET';
    }

    return 'INTERNAL_CODEBASE_ELEMENT';
  }
}
