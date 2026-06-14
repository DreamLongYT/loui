/**
 * ============================================================================
 * 📦 pkg-scaffold v3.3.5: Enterprise In-Memory Codebase State Manifest
 * ============================================================================
 * Implements a high-density, centralized graph database context for tracking
 * software engineering debt, dependencies, types, and vulnerabilities.
 */

import path from 'path';
import fs from 'fs/promises';
import { DependencyProfiler } from './resolution/DependencyProfiler.js';

/**
 * High-Fidelity Graph Element Node representing a single file asset boundary.
 * @scaffold-suppress GraphNode
 */
export class GraphNode {
  constructor(filePath) {
    this.filePath = path.normalize(filePath);
    this.contentHash = '';
    this.isLibraryEntry = false;
    this.isFrameworkContract = false;
    this.scriptKind = 0; // Ambient enum mapping

    // Explicit and Computed Dynamic Syntax Boundaries
    this.explicitImports = new Set();
    this.dynamicImports = new Set();
    this.importedSymbols = new Set(); // Format: 'specifier:symbol' or 'specifier:*'
    this.jsxComponents = new Set();
    this.jsxProps = new Set();
    this.decorators = new Set();
    
    // Internal API Exposed Interfaces (Symbol Name -> ExportMetadata)
    this.internalExports = new Map();
    this.typeOnlyExports = new Set();
    
    // Semantic Reference Verification Registries
    this.instantiatedIdentifiers = new Set();
    this.rawStringReferences = new Set();
    this.propertyAccessChains = new Set();
    
    // Dependency Mesh Connection Maps
    this.incomingEdges = new Set(); // Set of absolute filePaths depending on this component
    this.outgoingEdges = new Set(); // Set of absolute internal filePaths this component calls
    
    // Structural Syntax Boundaries
    this.calculatedDynamicImports = [];
    this.localSuppressedRules = new Set();
    this.externalPackageUsage = new Set(); // Tracked third-party package names
    
    // Detailed AST Location Diagnostics (Symbol -> Structural Location Mapping)
    this.symbolSourceLocations = new Map(); // Symbol -> { line: number, column: number, length: number }
  }

  /**
   * Evaluates if a specific exposed symbol token is utilized by any incoming edges.
   * Leverages precise syntax identity collections.
   */
  isSymbolReferencedExternally(symbolName, projectGraph) {
    if (this.isLibraryEntry) return true;
    
    for (const parentPath of this.incomingEdges) {
      const parentNode = projectGraph.get(parentPath);
      if (!parentNode) continue;

      // Check if the symbol is explicitly imported by the parent
      const importKey = `${path.relative(path.dirname(parentPath), this.filePath).replace(/\\/g, '/')}:${symbolName}`;
      const importKeyAlt = `${path.relative(path.dirname(parentPath), this.filePath).replace(/\\/g, '/').replace(/\.(js|ts|tsx|jsx)$/, '')}:${symbolName}`;
      
      if (parentNode.importedSymbols.has(importKey) || parentNode.importedSymbols.has(importKeyAlt)) {
        return true;
      }

      // Check for star imports or namespace imports
      const starKey = `${path.relative(path.dirname(parentPath), this.filePath).replace(/\\/g, '/')}:*`;
      const starKeyAlt = `${path.relative(path.dirname(parentPath), this.filePath).replace(/\\/g, '/').replace(/\.(js|ts|tsx|jsx)$/, '')}:*`;
      if (parentNode.importedSymbols.has(starKey) || parentNode.importedSymbols.has(starKeyAlt)) {
        return true;
      }

      // Direct identity reference check (for cases where it's used but not explicitly imported in a traceable way, or global)
      if (parentNode.instantiatedIdentifiers.has(symbolName)) return true;
      
      // Property lookup reference checks (e.g., config.databaseUrl)
      for (const accessChain of parentNode.propertyAccessChains) {
        if (accessChain.endsWith(`.${symbolName}`) || accessChain.includes(`.${symbolName}.`)) {
          return true;
        }
      }

      // Safe fallback lookup inside string reference caches (e.g., obj['databaseUrl'])
      if (parentNode.rawStringReferences.has(symbolName)) return true;

      // Check for JSX component usage
      if (parentNode.jsxComponents.has(symbolName)) return true;

      // Check for JSX prop usage (e.g., <MyComponent myProp={symbolName} />)
      for (const jsxProp of parentNode.jsxProps) {
        if (jsxProp.endsWith(`:${symbolName}`)) return true;
      }

      // Check for decorator usage
      if (parentNode.decorators.has(symbolName)) return true;
    }

    return false;
  }

  /**
   * Compiles complete localized diagnostic telemetry tracking metrics for this node instance.
   */
  compileNodeTelemetry() {
    return {
      path: this.filePath,
      totalExplicitImportsCount: this.explicitImports.size,
      totalExposedExportsCount: this.internalExports.size,
      incomingDependenciesCount: this.incomingEdges.size,
      outgoingDependenciesCount: this.outgoingEdges.size,
      isDanglingOrphan: this.incomingEdges.size === 0 && !this.isLibraryEntry,
      trackedThreatsCount: this.securityThreats.length
    };
  }
}

/**
 * Enterprise Engine Run State Registry & Suppression Context Matrix
 */
export class EngineContext {
  constructor(options = {}) {
    this.cwd = path.normalize(options.cwd || process.cwd());
    this.cacheDir = path.join(this.cwd, '.scaffold-cache');
    this.ignoreFilePath = path.join(this.cwd, '.scaffold-ignore');
    this.tsconfigFilename = options.tsconfig || 'tsconfig.json';
    this.testCommand = options.testCommand || 'npm test';
    
    this.allowAutoFix = options.autoFix ?? true;
    this.isWorkspaceEnabled = options.workspace ?? false;
    this.verbose = options.verbose ?? false;
    this.skipConfirm = options.skipConfirm ?? false;

    // Core Memory Repositories
    this.graph = new Map(); // Absolute File Path -> GraphNode
    this.registryHashes = new Map(); // Package Name -> Secure Lockfile Signature String
    this.globallyIgnoredSymbols = new Set();
    this.globallyIgnoredPaths = [];
    this.monorepoPackageRoots = new Set();
    
    // Structural Heuristic Verification Metrics Tracker
    this.metrics = {
      startTime: 0,
      endTime: 0,
      totalFilesScanned: 0,
      cacheHits: 0,
      cacheMisses: 0,
      prunedFilesCount: 0,
      prunedExportsCount: 0,
      totalSymbolsAnalyzed: 0,
      securityVulnerabilitiesMitigated: 0,
      unusedDependenciesCount: 0
    };
    this.usedExternalPackages = new Set(); // Global set of used npm packages
    this.manifestDependencies = new Map(); // Package.json path -> { dependencies, devDependencies, peerDependencies, optionalDependencies }

    // DependencyProfiler instance for implicit invocation tracing
    this._depProfiler = new DependencyProfiler(this);
  }

  /**
   * Initializes baseline context options, directory footprints, and suppression maps.
   */
  async initialize() {
    this.metrics.startTime = Date.now();
    await fs.mkdir(this.cacheDir, { recursive: true });
    await this.compileIgnoreConfigurations();
  }

  /**
   * Parses .scaffold-ignore layers using precise token segment matching
   * instead of high-risk loose regex blocks.
   */
  async compileIgnoreConfigurations() {
    try {
      const content = await fs.readFile(this.ignoreFilePath, 'utf8');
      const lines = content.split('\n');

      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) continue;

        if (line.startsWith('export:')) {
          const symbolToken = line.replace('export:', '').trim();
          this.globallyIgnoredSymbols.add(symbolToken);
        } else if (line.startsWith('path:')) {
          const pathToken = line.replace('path:', '').trim();
          this.globallyIgnoredPaths.push(path.normalize(pathToken));
        } else {
          // Standard structural path rule fallback
          this.globallyIgnoredPaths.push(path.normalize(line));
        }
      }
    } catch {
      // Configuration optionally omitted; proceed with default execution flags
    }
  }

  /**
   * Allocates or resolves a unified GraphNode reference inside our memory map index.
   */
  createNode(absoluteFilePath) {
    const normalizedPath = path.normalize(absoluteFilePath);
    if (this.graph.has(normalizedPath)) {
      return this.graph.get(normalizedPath);
    }
    const node = new GraphNode(normalizedPath);
    this.graph.set(normalizedPath, node);
    return node;
  }

  /**
   * Checks if an absolute file token path matches configuration ignore directives.
   * Evaluates sub-path sequences exactly to prevent regular expression parsing drops.
   */
  isPathIgnored(absoluteFilePath) {
    const relativeText = path.relative(this.cwd, absoluteFilePath);
    
    for (const ignoredTarget of this.globallyIgnoredPaths) {
      if (relativeText === ignoredTarget || relativeText.startsWith(path.join(ignoredTarget, path.sep))) {
        return true;
      }
      // Handle explicit wildcard terminal indicators
      if (ignoredTarget.endsWith('*')) {
        const baseSegment = ignoredTarget.slice(0, -1);
        if (relativeText.startsWith(baseSegment)) return true;
      }
    }
    return false;
  }

  /**
   * Processes the entire active dependency map to compile structural issue indices.
   * Evaluates orphaned components, dead exports, and supply-chain threats.
   */
  async generateSummaryReport() {
    this.metrics.endTime = Date.now();
    const durationSeconds = ((this.metrics.endTime - this.metrics.startTime) / 1000).toFixed(2);
    
    const summary = {
      executionDuration: `${durationSeconds}s`,
      totalFilesProcessed: this.metrics.totalFilesScanned,
      graphCacheOptimization: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        ratio: this.metrics.totalFilesScanned > 0 
          ? `${((this.metrics.cacheHits / this.metrics.totalFilesScanned) * 100).toFixed(1)}%`
          : '0%'
      },
      structuralIssuesDetected: {
        deadFiles: [],
        deadExports: [],
        unusedDependencies: []
      },
      modificationsExecuted: {
        filesUnlinked: this.metrics.prunedFilesCount,
        exportsStripped: this.metrics.prunedExportsCount
      }
    };

    for (const [filePath, node] of this.graph.entries()) {
      // Skip package control files from standard structural dead-code checks
      if (filePath.endsWith('package.json')) continue;
      
      // Fix: Always track external package usage from all files, even if they are orphaned,
      // to prevent false-positive unused dependency reports.
      node.externalPackageUsage.forEach(pkg => this.usedExternalPackages.add(pkg));

      if (this.isPathIgnored(filePath)) continue;

      const relativePath = path.relative(this.cwd, filePath);

      // Category A: Completely orphaned components
      const fileHasSuppressDirective = node.localSuppressedRules.size > 0;
      if (node.incomingEdges.size === 0 && !node.isLibraryEntry && !node.isFrameworkContract && !fileHasSuppressDirective) {
        summary.structuralIssuesDetected.deadFiles.push(relativePath);
        continue;
      }

      // Category B: Dead Named Exports
      for (const [exportName, meta] of node.internalExports.entries()) {
        this.metrics.totalSymbolsAnalyzed++;
        
        if (exportName === 'default' || 
            this.globallyIgnoredSymbols.has(exportName) || 
            node.localSuppressedRules.has(exportName)) {
          continue;
        }
        
        if (!node.isSymbolReferencedExternally(exportName, this.graph)) {
          const diagnosticLocation = node.symbolSourceLocations.get(exportName) || { line: 1, column: 1 };
          summary.structuralIssuesDetected.deadExports.push({
            file: relativePath,
            symbol: exportName,
            type: meta.type || 'named',
            line: diagnosticLocation.line,
            column: diagnosticLocation.column
          });
        }
      }

    }

    // Category D: Unused Dependencies Audit (Enhanced Classification)
    for (const [manifestPath, manifestData] of this.manifestDependencies.entries()) {
      const relativeManifest = path.relative(this.cwd, manifestPath);
      const packageRoot = path.dirname(manifestPath);

      // Collect packages that are implicitly used via scripts / config files
      const implicitlyUsed = await this._depProfiler.traceImplicitInvocations(packageRoot);

      // Resolve peer dependencies of all used packages so they are not flagged
      const allUsedForPeerResolution = new Set([...this.usedExternalPackages, ...implicitlyUsed]);
      const peerDepsOfUsed = await this._depProfiler.resolvePeerDependencies(allUsedForPeerResolution, packageRoot);

      const checkDeps = (deps, type) => {
        if (!deps) return;
        for (const dep of deps) {
          // Skip peer and optional dependencies – they are never "unused" in the
          // traditional sense because they are not required to be imported directly.
          if (this._depProfiler.shouldExcludeFromUnusedCheck(dep, type)) {
            continue;
          }

          const isUsedInCode = this.usedExternalPackages.has(dep);
          const isUsedImplicitly = implicitlyUsed.has(dep);
          const isRequiredAsPeer = peerDepsOfUsed.has(dep);

          if (!isUsedInCode && !isUsedImplicitly && !isRequiredAsPeer) {
            summary.structuralIssuesDetected.unusedDependencies.push({
              manifest: relativeManifest,
              package: dep,
              type: type
            });
            this.metrics.unusedDependenciesCount++;
          }
        }
      };

      checkDeps(manifestData.dependencies, 'dependency');
      checkDeps(manifestData.devDependencies, 'devDependency');
      // peerDependencies and optionalDependencies are excluded via shouldExcludeFromUnusedCheck
      checkDeps(manifestData.peerDependencies, 'peerDependency');
      checkDeps(manifestData.optionalDependencies, 'optionalDependency');
    }

    return summary;
  }
}
