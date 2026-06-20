import fsSync from 'fs';
import path from 'path';
import ansis from 'ansis';

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

  isSymbolReferencedExternally(symbolName, projectGraph, visited = new Set()) {
    const visitKey = `${this.filePath}:${symbolName}`;
    if (visited.has(visitKey)) return false;
    visited.add(visitKey);

    // Self-reference check
    if (this.instantiatedIdentifiers.has(symbolName)) return true;
    for (const accessChain of this.propertyAccessChains) {
      if (accessChain.endsWith(`.${symbolName}`) || accessChain.includes(`.${symbolName}.`)) return true;
    }
    
    for (const parentPath of this.incomingEdges) {
      const parentNode = projectGraph.get(parentPath);
      if (!parentNode) continue;

      // Direct Import Tokens
      const absoluteImportKey = `${this.filePath}:${symbolName}`;
      const absoluteStarKey = `${this.filePath}:*`;
      if (parentNode.importedSymbols.has(absoluteImportKey) || parentNode.importedSymbols.has(absoluteStarKey)) return true;
      
      // Advanced Member Usage Detection
      if (parentNode.propertyAccessChains.has(symbolName)) return true;
      
      // If it's a member access like 'Logger.error' or 'app.start', we check for the leaf name usage.
      if (symbolName.includes('.')) {
          const parts = symbolName.split('.');
          const leafName = parts[parts.length - 1];
          const parentName = parts[0];
          
          if ((parentNode.instantiatedIdentifiers.has(parentName) || 
               parentNode.importedSymbols.has(`${this.filePath}:${parentName}`)) &&
              parentNode.instantiatedIdentifiers.has(leafName)) {
              return true;
          }
      }

      // Dynamic Import Check
      if (parentNode.dynamicImports.has(this.filePath) || parentNode.explicitImports.has(this.filePath)) {
         if (parentNode.dynamicImports.has(this.filePath)) return true;
      }

      // Recursive Re-export Resolution
      for (const [exportedName, exportMeta] of parentNode.internalExports.entries()) {
        const isMatch = (exportMeta.type === 're-export' || exportMeta.type === 're-export-namespace' || exportMeta.type === 're-export-all') && 
                        (exportMeta.originalName === symbolName || exportMeta.originalName === '*' || exportMeta.type === 're-export-all') && 
                        (exportMeta.source === this.filePath || (exportMeta.source && path.resolve(path.dirname(parentPath), exportMeta.source) === this.filePath));
        
        if (isMatch) {
          if (parentNode.isSymbolReferencedExternally(exportedName, projectGraph, visited)) return true;
        }
      }

      // Fuzzy / Dynamic usage (Identifiers, Strings, JSX, Decorators)
      // UPGRADE: Only check for fuzzy matches if we have a reason to believe it might be used.
      // We skip global names like 'toLowerCase' unless they are explicitly imported.
      const isGlobalName = ['toLowerCase', 'toUpperCase', 'toString', 'valueOf', 'hasOwnProperty', 'constructor'].includes(symbolName);
      
      if (!isGlobalName) {
        if (parentNode.instantiatedIdentifiers.has(symbolName)) return true;
        if (parentNode.rawStringReferences.has(symbolName)) return true;
        if (parentNode.jsxComponents.has(symbolName)) return true;
        if (parentNode.decorators.has(symbolName)) return true;
      }
      
      for (const accessChain of parentNode.propertyAccessChains) {
        if (accessChain.endsWith(`.${symbolName}`) || accessChain.includes(`.${symbolName}.`)) return true;
      }
    }

    return false;
  }
}

export class EngineContext {
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
    this.projectGraph = new Map(); // Path -> GraphNode
    this.usedExternalPackages = new Set();
    this.unimportedUsedPackages = new Set();
    this.importedUnusedPackages = new Set();
    this.unusedBinaries = new Set();
    this.manifestDependencies = new Map();
    
    this.isWorkspaceEnabled = false;
    this.monorepoPackageRoots = new Set();
    this.verbose = false;
    this.metrics = { totalFilesScanned: 0, cacheHits: 0, cacheMisses: 0 };
    this.allSecretFindings = [];
  }

  getOrCreateNode(filePath) {
    if (!this.projectGraph.has(filePath)) {
      this.projectGraph.set(filePath, new GraphNode(filePath));
    }
    return this.projectGraph.get(filePath);
  }

  async generateSummaryReport() {
    const report = {
      orphanedFiles: [],
      deadExports: [],
      unusedDependencies: [],
      unimportedUsedPackages: [],
      importedUnusedPackages: [],
      unusedBinaries: []
    };

    // --- DEEP REACHABILITY ANALYSIS (BFS) ---
    const reachableFiles = new Set();
    const queue = [];

    // 1. Initialize BFS with Entry Points
    for (const [filePath, node] of this.projectGraph.entries()) {
      // FIX: Also check if the file is explicitly mentioned in package.json bin or main
      if (node.isEntry || node.isLibraryEntry || node.isFrameworkComponent) {
        reachableFiles.add(filePath);
        queue.push(filePath);
      }
    }
    
    // UPGRADE: Ensure package.json main and bin are always entry points
    // UPGRADE: Comprehensive Entry Point Discovery (Manifests + Tooling)
    for (const [manifestPath, deps] of this.manifestDependencies.entries()) {
        try {
            const data = JSON.parse(fsSync.readFileSync(manifestPath, 'utf8'));
            const pkgDir = path.dirname(manifestPath);
            const entries = [];
            
            // 1. Standard Manifest Entries
            if (data.main) entries.push(path.resolve(pkgDir, data.main));
            if (data.module) entries.push(path.resolve(pkgDir, data.module));
            if (data.exports) {
                const unwind = (val) => {
                    if (typeof val === 'string') entries.push(path.resolve(pkgDir, val));
                    else if (typeof val === 'object' && val !== null) Object.values(val).forEach(unwind);
                };
                unwind(data.exports);
            }
            if (data.bin) {
                if (typeof data.bin === 'string') entries.push(path.resolve(pkgDir, data.bin));
                else Object.values(data.bin).forEach(b => entries.push(path.resolve(pkgDir, b)));
            }

            // 2. Protect Documentation & Configs
            const possibleConfigs = ['vite.config.js', 'vite.config.ts', 'vitest.config.ts', 'tsconfig.json'];
            possibleConfigs.forEach(c => entries.push(path.resolve(pkgDir, c)));

            entries.forEach(e => {
                const normalized = e.replace(/\\/g, '/');
                // Check with common extensions if not found
                const candidates = [normalized, normalized + '.js', normalized + '.ts', normalized + '.tsx', normalized + '/index.js', normalized + '/index.ts'];
                for (const cand of candidates) {
                    if (this.projectGraph.has(cand) && !reachableFiles.has(cand)) {
                        reachableFiles.add(cand);
                        queue.push(cand);
                        this.projectGraph.get(cand).isEntry = true;
                        break;
                    }
                }
            });

            // --- PLUGIN-BASED ECOSYSTEM DETECTION ---
            // Plugins will now handle their own reachability and dependency validation.
            if (this.pluginRegistry) {
                const activePlugins = await this.pluginRegistry.getActivePlugins(pkgDir);
                for (const plugin of activePlugins) {
                    if (typeof plugin.onDiscovery === 'function') {
                        await plugin.onDiscovery({
                            pkgDir,
                            data,
                            reachableFiles,
                            queue,
                            projectGraph: this.projectGraph,
                            context: this
                        });
                    }
                }
            }
        } catch (e) {}
    }

    // 2. BFS Traversal
    while (queue.length > 0) {
      const currentPath = queue.shift();
      const node = this.projectGraph.get(currentPath);
      
      if (!node) continue;

      // Track outgoing edges (static and linked dynamic imports)
      if (node.outgoingEdges) {
        for (const outgoingPath of node.outgoingEdges) {
          const normalizedPath = outgoingPath.replace(/\\/g, '/');
          if (!reachableFiles.has(normalizedPath)) {
            reachableFiles.add(normalizedPath);
            queue.push(normalizedPath);
          }
        }
      }

      // UPGRADE: Handle non-literal dynamic imports (calculatedDynamicImports)
      if ((node.calculatedDynamicImports && node.calculatedDynamicImports.length > 0) || (node.dynamicImports && node.dynamicImports.has('__DYNAMIC_PATTERN__'))) {
        const dir = path.dirname(currentPath);
        // Conservative: If we have a calculated dynamic import, any file in the same or sub directory could be a target
        for (const [otherPath, _] of this.projectGraph.entries()) {
          // Fix: Check if otherPath is in the same directory or a subdirectory of 'dir'
          if (otherPath !== currentPath && otherPath.startsWith(dir) && !reachableFiles.has(otherPath)) {
            // Additional check: If it's in a 'plugins' or 'modules' folder, it's very likely a dynamic target
            const isLikelyDynamicTarget = otherPath.includes('/plugins/') || otherPath.includes('/modules/') || otherPath.includes('/dynamic/');
            if (isLikelyDynamicTarget) {
              reachableFiles.add(otherPath);
              queue.push(otherPath);
            }
          }
        }
      }

      // UPGRADE: Handle Worker/Threads usage (new Worker('path'))
      for (const chain of node.propertyAccessChains) {
        if (chain.includes('new Worker(') || chain.includes('Worker(')) {
          // Check if any file path is mentioned in raw strings
          for (const str of node.rawStringReferences) {
            if (str.startsWith('.') || str.startsWith('/')) {
              try {
                const resolved = path.resolve(path.dirname(currentPath), str);
                const extensions = ['.js', '.ts', '.mjs', '.cjs'];
                for (const ext of extensions) {
                  const p = resolved.endsWith(ext) ? resolved : resolved + ext;
                  const normalized = p.replace(/\\/g, '/');
                  if (this.projectGraph.has(normalized) && !reachableFiles.has(normalized)) {
                    reachableFiles.add(normalized);
                    queue.push(normalized);
                  }
                }
              } catch (e) {}
            }
          }
        }
      }
      
      // Additional check for unlinked dynamic imports (conservative)
      if (node.dynamicImports) {
          for (const dynamicPath of node.dynamicImports) {
              if (dynamicPath.startsWith('__DYNAMIC_PATTERN__:')) {
                  const pattern = dynamicPath.split(':')[1];
                  const dir = path.dirname(currentPath);
                  for (const [otherPath, _] of this.projectGraph.entries()) {
                      if (otherPath.startsWith(dir) && !reachableFiles.has(otherPath)) {
                          reachableFiles.add(otherPath);
                          queue.push(otherPath);
                      }
                  }
              }
          }
      }
    }

    // --- ANALYSIS PHASE ---
    if (this.verbose) {
      console.log(`[Reachability] Total reachable files: ${reachableFiles.size}`);
      for (const f of reachableFiles) console.log(`  • Reachable: ${path.relative(this.cwd, f)}`);
    }
    for (const [filePath, node] of this.projectGraph.entries()) {
      const isSuppressed = node.localSuppressedRules.has('*') || node.localSuppressedRules.has('unused-file');
      const isReachable = reachableFiles.has(filePath);
      
      // Check for Orphaned Files
      if (!isReachable && !isSuppressed) {
        const relPath = path.relative(this.cwd, filePath).replace(/\\/g, '/');
        report.orphanedFiles.push(relPath);
      }

      // Check for Dead Exports
      if (isReachable) {
        const isPublicAPI = node.isEntry || node.isLibraryEntry;
        
        for (const [symbol, meta] of node.internalExports.entries()) {
          if (symbol === '*' || symbol === 'default' || node.localSuppressedRules.has('unused-export') || node.localSuppressedRules.has(`unused-export:${symbol}`)) {
            continue;
          }

          const isSymbolUsed = isPublicAPI || node.isSymbolReferencedExternally(symbol, this.projectGraph);

          if (!isSymbolUsed) {
            const loc = node.symbolSourceLocations.get(symbol) || { line: 0, column: 0 };
            report.deadExports.push({
              symbol,
              file: path.relative(this.cwd, filePath),
              line: loc.line
            });
          }

          // Member Analysis
          if (meta.members && meta.members.length > 0 && isSymbolUsed) {
            for (const member of meta.members) {
              const fullMemberName = `${symbol}.${member.name}`;
              
              if (isPublicAPI && member.isPublic !== false) {
                  continue; 
              }

              // UPGRADE: Check for dynamic usage in ANY reachable file, not just direct imports
              let isMemberUsed = false;
              for (const [otherPath, otherNode] of this.projectGraph.entries()) {
                if (reachableFiles.has(otherPath)) {
                  if (otherNode.instantiatedIdentifiers.has(member.name) || 
                      otherNode.propertyAccessChains.has(fullMemberName) ||
                      otherNode.rawStringReferences.has(member.name)) {
                    isMemberUsed = true;
                    break;
                  }
                }
              }

              if (!isMemberUsed && !node.isSymbolReferencedExternally(fullMemberName, this.projectGraph)) {
                const loc = node.symbolSourceLocations.get(fullMemberName) || { line: 0, column: 0 };
                report.deadExports.push({
                  symbol: fullMemberName,
                  file: path.relative(this.cwd, filePath),
                  line: loc.line
                });
              }
            }
          }
        }
      }
    }

    // --- DEPENDENCY ANALYSIS ---
    const usedByReachableFiles = new Set();
    reachableFiles.forEach(filePath => {
      const node = this.projectGraph.get(filePath);
      if (node) {
        node.externalPackageUsage.forEach(pkg => usedByReachableFiles.add(pkg));
        
        // Conservative check for dynamic imports in reachable files
        if (node.calculatedDynamicImports) {
          node.calculatedDynamicImports.forEach(entry => {
            const expr = typeof entry === 'string' ? entry : (entry.pattern || entry.text || '');
            // If it looks like a package name (no dots/slashes), assume it's used
            if (expr && !expr.includes('.') && !expr.includes('/') && !expr.includes('`') && !expr.includes("'") && !expr.includes('"')) {
               usedByReachableFiles.add(expr);
            }
            // Check raw strings for potential package names
            node.rawStringReferences.forEach(str => {
               if (!str.startsWith('.') && !str.startsWith('/')) {
                  const pkg = str.startsWith('@') ? str.split('/').slice(0, 2).join('/') : str.split('/')[0];
                  usedByReachableFiles.add(pkg);
               }
            });
          });
        }
      }
    });

    for (const [manifestPath, deps] of this.manifestDependencies.entries()) {
      const allDeps = [...(deps.dependencies || []), ...(deps.devDependencies || [])];
      const hasTypeScriptFiles = Array.from(this.projectGraph.keys()).some(f => f.endsWith('.ts') || f.endsWith('.tsx'));
      
      for (const dep of allDeps) {
        if (dep.startsWith('@types/') || dep === 'entkapp' || (dep === 'typescript' && hasTypeScriptFiles)) {
          continue;
        }
        
        // UPGRADE: Be more aggressive in detecting unused dependencies.
        // Check both externalPackageUsage and rawStringReferences.
        const isUsed = usedByReachableFiles.has(dep) || 
                       Array.from(reachableFiles).some(f => {
                         const node = this.projectGraph.get(f);
                         return node && (node.externalPackageUsage.has(dep) || node.rawStringReferences.has(dep));
                       });

        if (!isUsed) {
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
