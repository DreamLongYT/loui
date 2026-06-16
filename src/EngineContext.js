import path from 'path';

/**
 * Core In-Memory Graph Node Representation.
 * Tracks structural metadata, dependencies, and usage metrics for a single file.
 */
export class GraphNode {
  constructor(filePath) {
    this.filePath = filePath;
    this.incomingEdges = new Set(); // Files that import THIS file
    this.outgoingEdges = new Set(); // Files that THIS file imports
    
    this.explicitImports = new Set(); // Raw import strings
    this.importedSymbols = new Set(); // "file:symbol" or "file:*"
    this.internalExports = new Map(); // symbol -> { type, start, end, ... }
    
    this.externalPackageUsage = new Set();
    this.instantiatedIdentifiers = new Set();
    this.propertyAccessChains = new Set();
    this.rawStringReferences = new Set();
    this.jsxComponents = new Set();
    this.jsxProps = new Set();
    this.decorators = new Set();
    this.dynamicImports = new Set();
    this.calculatedDynamicImports = [];
    
    this.isEntry = false;
    this.isLibraryEntry = false;
    this.isFrameworkComponent = false;
    this.symbolSourceLocations = new Map(); // symbol -> { line, column }
    this.localSuppressedRules = new Set();
  }

  isSymbolReferencedExternally(symbolName, projectGraph) {
    if (this.isLibraryEntry) return true;

    // --- NEW: Self-reference check (Fix for SecretSeverity bug) ---
    // If the symbol is used within the same file, it is NOT dead.
    if (this.instantiatedIdentifiers.has(symbolName)) return true;
    
    // Check property access in the same file
    for (const accessChain of this.propertyAccessChains) {
      if (accessChain.endsWith(`.${symbolName}`) || accessChain.includes(`.${symbolName}.`)) {
        return true;
      }
    }
    // --------------------------------------------------------------
    
    for (const parentPath of this.incomingEdges) {
      const parentNode = projectGraph.get(parentPath);
      if (!parentNode) continue;

      // Strategy 1: Check absolute path based tokens
      const absoluteImportKey = `${this.filePath}:${symbolName}`;
      const absoluteStarKey = `${this.filePath}:*`;
      
      if (parentNode.importedSymbols.has(absoluteImportKey) || parentNode.importedSymbols.has(absoluteStarKey)) {
        return true;
      }

      // Strategy 2: Check relative path based tokens
      const relativePath = path.relative(path.dirname(parentPath), this.filePath).replace(/\\/g, '/');
      const relativePathNoExt = relativePath.replace(/\.(js|ts|tsx|jsx)$/, '');
      
      const importKey = `${relativePath}:${symbolName}`;
      const importKeyAlt = `${relativePathNoExt}:${symbolName}`;
      const starKey = `${relativePath}:*`;
      const starKeyAlt = `${relativePathNoExt}:*`;
      
      if (parentNode.importedSymbols.has(importKey) || parentNode.importedSymbols.has(importKeyAlt) ||
          parentNode.importedSymbols.has(starKey) || parentNode.importedSymbols.has(starKeyAlt)) {
        return true;
      }

      if (parentNode.instantiatedIdentifiers.has(symbolName)) return true;
      
      for (const accessChain of parentNode.propertyAccessChains) {
        if (accessChain.endsWith(`.${symbolName}`) || accessChain.includes(`.${symbolName}.`)) {
          return true;
        }
      }

      if (parentNode.rawStringReferences.has(symbolName)) return true;
      if (parentNode.jsxComponents.has(symbolName)) return true;

      for (const jsxProp of parentNode.jsxProps) {
        if (jsxProp.endsWith(`:${symbolName}`)) return true;
      }

      if (parentNode.decorators.has(symbolName)) return true;
    }

    return false;
  }
}

export class EngineContext {
  constructor(cwd) {
    this.cwd = cwd;
    this.projectGraph = new Map(); // Path -> GraphNode
    this.usedExternalPackages = new Set();
    this.unimportedUsedPackages = new Set(); // NEW: For "Unimported but used"
    this.importedUnusedPackages = new Set(); // NEW: For "Imported but unused"
    this.unusedBinaries = new Set();         // NEW: For "Unused Binaries"
    this.manifestDependencies = new Map();   // NEW: Store dependencies from package.json
    
    this.isWorkspaceEnabled = false;
    this.monorepoPackageRoots = new Set();
    this.verbose = false;
    this.metrics = { totalFilesScanned: 0, cacheHits: 0, cacheMisses: 0 };
  }

  getOrCreateNode(filePath) {
    if (!this.projectGraph.has(filePath)) {
      this.projectGraph.set(filePath, new GraphNode(filePath));
    }
    return this.projectGraph.get(filePath);
  }

  generateSummaryReport() {
    const report = {
      orphanedFiles: [],
      deadExports: [],
      unusedDependencies: [],
      unimportedUsedPackages: [], // NEW
      importedUnusedPackages: [], // NEW
      unusedBinaries: []          // NEW
    };

    // 1. Files & Exports
    for (const [filePath, node] of this.projectGraph.entries()) {
      const isSuppressed = node.localSuppressedRules.has('*') || node.localSuppressedRules.has('unused-file');
      
      if (node.incomingEdges.size === 0 && !node.isEntry && !node.isLibraryEntry && !node.isFrameworkComponent && !isSuppressed) {
        report.orphanedFiles.push(path.relative(this.cwd, filePath));
      }

      for (const [symbol, meta] of node.internalExports.entries()) {
        if (symbol === '*' || symbol === 'default' || node.localSuppressedRules.has('unused-export') || node.localSuppressedRules.has(`unused-export:${symbol}`)) {
          continue;
        }

        if (!node.isSymbolReferencedExternally(symbol, this.projectGraph)) {
          const loc = node.symbolSourceLocations.get(symbol) || { line: 0, column: 0 };
          report.deadExports.push({
            symbol,
            file: path.relative(this.cwd, filePath),
            line: loc.line
          });
        }
      }
    }

    // 2. Dependency Analysis (Extended)
    // Compare manifest dependencies with actually used packages
    for (const [manifestPath, deps] of this.manifestDependencies.entries()) {
      const allDeps = [...(deps.dependencies || []), ...(deps.devDependencies || [])];
      
      for (const dep of allDeps) {
        // Skip @types packages and known safe packages
        if (dep.startsWith('@types/') || dep === 'pkg-scaffold') {
          continue;
        }
        
        // Check if the dependency is actually used in the code
        if (!this.usedExternalPackages.has(dep)) {
          report.unusedDependencies.push({
            package: dep,
            type: deps.dependencies.includes(dep) ? 'dependency' : 'devDependency',
            manifest: path.relative(this.cwd, manifestPath)
          });
          this.importedUnusedPackages.add(dep);
        }
      }
    }
    
    report.unimportedUsedPackages = Array.from(this.unimportedUsedPackages);
    report.importedUnusedPackages = Array.from(this.importedUnusedPackages);
    report.unusedBinaries = Array.from(this.unusedBinaries);

    return report;
  }
}
