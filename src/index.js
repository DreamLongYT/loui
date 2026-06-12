/**
 * ============================================================================
 * 📦 pkg-scaffold v3.0.0: Unified Architectural Refactoring Orchestrator
 * ============================================================================
 * Main execution bridge managing multi-pass compilation cycles, semantic cross-linking,
 * supply-chain validation audits, and automated git self-healing rollbacks.
 */

import fs from 'fs/promises';
import path from 'path';
import ansis from 'ansis';

// Import local domain architecture sub-systems
import { EngineContext } from './EngineContext.js';
import { ASTAnalyzer } from './ast/ASTAnalyzer.js';
import { BarrelParser } from './ast/BarrelParser.js';
import { MagicDetector } from './ast/MagicDetector.js';
import { PathMapper } from './resolution/PathMapper.js';
import { WorkspaceGraph } from './resolution/WorkspaceGraph.js';
import { DependencyResolver } from './resolution/DependencyResolver.js';
import { TransactionManager } from './refactor/TransactionManager.js';
import { ImpactAnalyzer } from './refactor/ImpactAnalyzer.js';
import { SourceRewriter } from './refactor/SourceRewriter.js';
import { TypeIntegrity } from './refactor/TypeIntegrity.js';
import { GitSandbox } from './healing/GitSandbox.js';
import { SelfHealer } from './healing/SelfHealer.js';
import { IncrementalCacheManager } from './performance/GraphCache.js';
import { WorkerPool } from './performance/WorkerPool.js';
import { SupplyChainGuard } from './security/SupplyChainGuard.js';

/**
 * Primary Refactoring Engine Core Coordination Controller
 */
export class RefactoringEngine {
  constructor(options = {}) {
    // Stage 1: Instantiate State Registers and Global Variables context
    this.context = new EngineContext(options);
    
    // Stage 2: Initialize File Mappers and Multi-Package Graph Networks
    this.pathMapper = new PathMapper(this.context);
    this.workspaceGraph = new WorkspaceGraph(this.context);
    this.resolver = new DependencyResolver(this.context, this.pathMapper, this.workspaceGraph);
    
    // Stage 3: Wire official AST Syntax parsers and framework processors
    this.analyzer = new ASTAnalyzer(this.context);
    this.barrelParser = new BarrelParser(this.context, this.resolver);
    this.magicDetector = new MagicDetector(this.context);
    
    // Stage 4: Connect Transaction managers and surgical code generation scripts
    this.txManager = new TransactionManager(this.context);
    this.impactAnalyzer = new ImpactAnalyzer(this.context);
    this.sourceRewriter = new SourceRewriter(this.context);
    this.typeIntegrity = new TypeIntegrity(this.context);
    
    // Stage 5: Bind security audit utilities and performance cache rings
    this.supplyChainGuard = new SupplyChainGuard(this.context);
    this.cacheManager = new IncrementalCacheManager(this.context);
    this.workerPool = new WorkerPool(this.context);
    this.gitSandbox = new GitSandbox(this.context);
    this.selfHealer = new SelfHealer(this.context, this.txManager, this.gitSandbox);
  }

  /**
   * Main Operational Loop executing multi-stage analysis passes across files.
   */
  async run() {
    try {
      console.log(ansis.bold.green('🎯 Starting pkg-scaffold Operational Optimization Cycle...'));
      
      // Pass 1: Boot environment contexts and load alias configuration maps
      await this.context.initialize();
      await this.pathMapper.loadMappings(this.context.tsconfigFilename);
      
      if (this.context.isWorkspaceEnabled) {
        console.log(ansis.dim('🌐 Mapping local monorepo workspaces and package mesh layers...'));
        await this.workspaceGraph.initializeWorkspaceMesh();
      }

      // Load asset fingerprints from disk cache to maximize cold-start performance
      const cacheManifest = await this.cacheManager.loadCacheManifest();

      // Pass 2: Recursively crawl directories to compile target codebase files list
      const fileList = [];
      await this.discoverSourceFiles(this.context.cwd, fileList);
      this.context.metrics.totalFilesScanned = fileList.length;

      // Identify meta-framework setups (Next.js, Remix, Nuxt, etc.)
      const activeFrameworkEcosystems = await this.magicDetector.identifyActiveProjectEcosystems(this.context.cwd);

      // Separate explicit configuration packages out for targeted supply chain security checks
      const sourceCodeFilesList = [];
      for (const file of fileList) {
        if (file.endsWith('package.json')) {
          await this.auditManifestSupplyChain(file);
        } else {
          sourceCodeFilesList.push(file);
        }
      }

      // Pass 3: Process source file tokens using high-performance concurrent workers
      let parallelParseCompleted = false;
      if (sourceCodeFilesList.length > 10) {
        parallelParseCompleted = await this.workerPool.parallelAnalyzeCodebase(sourceCodeFilesList, this);
      }

      // Synchronous fallback loop to parse remaining files or cache misses
      for (const filePath of sourceCodeFilesList) {
        const node = this.context.createNode(filePath);
        const currentHash = await this.cacheManager.computeHash(filePath);
        node.contentHash = currentHash;

        if (cacheManifest[filePath] && cacheManifest[filePath].hash === currentHash) {
          this.context.metrics.cacheHits++;
          this.hydrateNodeFromCache(node, cacheManifest[filePath]);
          parallelParseCompleted = true; // Cached elements don't need worker allocations
        }

        if (!parallelParseCompleted) {
          this.context.metrics.cacheMisses++;
          await this.analyzer.processFile(filePath, node);
        }

        // Apply ecosystem overrides directly to our parsed memory maps
        this.magicDetector.injectVirtualConsumerEdges(filePath, node, activeFrameworkEcosystems);
      }

      // Pass 4: Evaluate graph edges and link connections across the codebase mesh
      console.log(ansis.dim('🔗 Linking graph edges and checking structural usage paths...'));
      await this.linkDependencyGraph();

      // Pass 5: Compile metrics summary and print diagnostics report
      const analysisSummary = this.context.generateSummaryReport();
      this.displayConsoleDiagnostics(analysisSummary);

      // Pass 6: Run self-healing automated transformations if --fix is set
      if (this.context.allowAutoFix) {
        const structuralModificationsStaged = 
          analysisSummary.structuralIssuesDetected.deadFiles.length > 0 || 
          analysisSummary.structuralIssuesDetected.deadExports.length > 0;

        if (structuralModificationsStaged) {
          await this.selfHealer.runSelfHealingLifecycle(async () => {
            
            // Sub-Task A: Purge completely unreferenced dangling components
            for (const relPath of analysisSummary.structuralIssuesDetected.deadFiles) {
              const absPath = path.resolve(this.context.cwd, relPath);
              console.log(ansis.red(`✂️  Removing unreferenced file: ${relPath}`));
              await this.txManager.stageDeletion(absPath);
            }

            // Sub-Task B: Surgically remove unused named export blocks from active files
            for (const unusedExport of analysisSummary.structuralIssuesDetected.deadExports) {
              const absPath = path.resolve(this.context.cwd, unusedExport.file);
              const node = this.context.graph.get(absPath);
              
              if (!node) continue;
              const meta = node.internalExports.get(unusedExport.symbol);

              // Perform safety analysis to ensure the token isn't called via dynamic runtime methods
              const safetyVerdict = await this.impactAnalyzer.verifyRefactorSafety(absPath, unusedExport.symbol, this.context.graph);

              if (safetyVerdict.isSafeToPrune) {
                console.log(ansis.yellow(`⚡ Stripping unused export [${unusedExport.symbol}] from: ${unusedExport.file}:${unusedExport.line}`));
                const currentText = await fs.readFile(absPath, 'utf8');
                const nextText = await this.sourceRewriter.stripNamedExportSignature(absPath, unusedExport.symbol, meta);
                
                await this.txManager.stageWrite(absPath, nextText);
                
                // Align matching type declaration boundaries (.d.ts) to prevent compilation errors
                await this.typeIntegrity.synchronizeDeclarationFile(absPath, unusedExport.symbol);
              } else if (this.context.verbose) {
                console.log(ansis.gray(`🛡️  Preserving symbol export [${unusedExport.symbol}] due to: ${safetyVerdict.blockReason}`));
              }
            }
          });
        }
      }

      // Pass 7: Save optimized graph footprints back to the cache directory
      await this.cacheManager.saveCacheManifest(this.context.graph);
      console.log(ansis.bold.green('\n✨ Core optimization cycle completed smoothly. Codebase workspace is healthy.'));

    } catch (criticalFault) {
      console.error(ansis.bold.red(`\n🚨 Critical Operational Pipeline Failure: ${criticalFault.message}`));
      if (criticalFault.stack) console.error(ansis.dim(criticalFault.stack));
      process.exit(1);
    }
  }

  /**
   * Links nodes and processes barrel files recursively without regular expressions.
   */
  async linkDependencyGraph() {
    for (const [filePath, node] of this.context.graph.entries()) {
      
      // Connect standard module imports
      for (const specifier of node.explicitImports) {
        const resolvedPath = this.resolver.resolveModulePath(filePath, specifier);
        if (resolvedPath && this.context.graph.has(resolvedPath)) {
          this.context.graph.get(resolvedPath).incomingEdges.add(filePath);
          node.outgoingEdges.add(resolvedPath);
        }
      }

      // Unroll re-exports and unwrap barrel file links recursively
      for (const specToken of node.importedSymbols) {
        const delimiterIndex = specToken.indexOf(':');
        if (delimiterIndex === -1) continue;

        const specifier = specToken.slice(0, delimiterIndex);
        const symbol = specToken.slice(delimiterIndex + 1);

        const resolvedPath = this.resolver.resolveModulePath(filePath, specifier);
        
        if (resolvedPath && symbol !== '*') {
          const traceResolution = await this.barrelParser.determineSymbolDeclarationOrigin(
            resolvedPath, 
            symbol, 
            this.context.graph
          );
          
          if (traceResolution && this.context.graph.has(traceResolution.originFile)) {
            this.context.graph.get(traceResolution.originFile).incomingEdges.add(filePath);
            node.outgoingEdges.add(traceResolution.originFile);
          }
        }
      }
    }
  }

  /**
   * Audits package json files using token equality checks instead of fragile regex searches.
   */
  async auditManifestSupplyChain(packageJsonPath) {
    try {
      const text = await fs.readFile(packageJsonPath, 'utf8');
      const data = JSON.parse(text);
      
      const prodDeps = Object.keys(data.dependencies || {});
      const devDeps = Object.keys(data.devDependencies || {});
      const totalDependencies = [...prodDeps, ...devDeps];

      // Pass dependencies down to our Levenshtein string-distance guard to find typosquat targets
      const supplyChainThreats = this.supplyChainGuard.detectTyposquattingAnomalies(totalDependencies);
      
      for (const anomaly of supplyChainThreats) {
        console.warn(ansis.bold.red(`🚨 Supply Chain Alert: Malicious package masking candidate discovered [${anomaly.maliciousCandidate}]. Mimics trusted library [${anomaly.targetMimicked}].`));
      }

      // Verify lockfile hash configurations to catch poisoned manifests
      await this.supplyChainGuard.verifyIntegrityLockfileHashes(packageJsonPath);
    } catch {
      // Manifest unreadable or locked; skip gracefully
    }
  }

  hydrateNodeFromCache(node, cachedRecord) {
    cachedRecord.explicitImports.forEach(i => node.explicitImports.add(i));
    cachedRecord.dynamicImports.forEach(i => node.dynamicImports.add(i));
    cachedRecord.importedSymbols.forEach(s => node.importedSymbols.add(s));
    cachedRecord.rawStringReferences.forEach(r => node.rawStringReferences.add(r));
    cachedRecord.instantiatedIdentifiers.forEach(i => node.instantiatedIdentifiers.add(i));
    cachedRecord.propertyAccessChains.forEach(c => node.propertyAccessChains.add(c));
    
    if (cachedRecord.internalExports) {
      Object.entries(cachedRecord.internalExports).forEach(([k, v]) => {
        node.internalExports.set(k, v);
      });
    }
    node.isLibraryEntry = cachedRecord.isLibraryEntry || false;
    node.securityThreats = cachedRecord.securityThreats || [];
  }

  /**
   * Crawls project roots using precise token extension checking instead of high-risk text matching.
   */
  async discoverSourceFiles(currentDirectory, fileAccumulator) {
    try {
      const entries = await fs.readdir(currentDirectory, { withFileTypes: true });

      for (const entry of entries) {
        const absolutePath = path.join(currentDirectory, entry.name);

        if (entry.isDirectory()) {
          // Standard systemic exclusions filters
          if (entry.name === 'node_modules' || 
              entry.name === '.git' || 
              entry.name === '.scaffold-cache' || 
              entry.name === 'dist' || 
              entry.name === 'build') {
            continue;
          }
          await this.discoverSourceFiles(absolutePath, fileAccumulator);
        } else if (entry.isFile()) {
          const extension = path.extname(entry.name);
          if (extension === '.js' || 
              extension === '.ts' || 
              extension === '.tsx' || 
              extension === '.jsx' || 
              entry.name === 'package.json') {
            fileAccumulator.push(absolutePath);
          }
        }
      }
    } catch {
      // Path unreadable or access locked; close loop gracefully
    }
  }

  displayConsoleDiagnostics(report) {
    console.log(ansis.bold.green('\n📊 Codebase Structural Diagnostics Summary'));
    console.log(ansis.dim('============================================================'));
    console.log(`${ansis.bold('Processing Cycle Wall Duration:')} ${ansis.cyan(report.executionDuration)}`);
    console.log(`${ansis.bold('Total Files Indexed Globally  :')} ${ansis.white(report.totalFilesProcessed)}`);
    console.log(`${ansis.bold('Delta Cache Optimization Ratio:')} ${ansis.green(report.graphCacheOptimization.ratio)} (Hits: ${report.graphCacheOptimization.hits} / Misses: ${report.graphCacheOptimization.misses})`);
    console.log(ansis.dim('------------------------------------------------------------'));
    
    if (report.structuralIssuesDetected.deadFiles.length > 0) {
      console.log(ansis.bold.red(`\nOrphaned Files Flagged (${report.structuralIssuesDetected.deadFiles.length}):`));
      report.structuralIssuesDetected.deadFiles.forEach(f => console.log(ansis.dim(`  • ${f}`)));
    } else {
      console.log(ansis.green('\n✨ No orphaned or unreferenced component files found.'));
    }

    if (report.structuralIssuesDetected.deadExports.length > 0) {
      console.log(ansis.bold.yellow(`\nUnused Named Symbol Exports Flagged (${report.structuralIssuesDetected.deadExports.length}):`));
      report.structuralIssuesDetected.deadExports.forEach(e => {
        console.log(`  • ${ansis.dim(e.file)}:${e.line}:${e.column} -> [${ansis.yellow(e.symbol)}] (Type: ${e.type})`);
      });
    } else {
      console.log(ansis.green('✨ No dead or unused named symbols exported across components.'));
    }

    if (report.structuralIssuesDetected.securityThreats.length > 0) {
      console.log(ansis.bold.red(`\n⚠️  High-Risk Variable Assignment Alerts (${report.structuralIssuesDetected.securityThreats.length}):`));
      report.structuralIssuesDetected.securityThreats.forEach(threat => {
        console.log(`  • ${ansis.red(threat.file)}:${threat.line} -> Variable [${ansis.bold(threat.identifier)}] contains a high-entropy secret (Shannon Score: ${threat.entropy})`);
      });
    }

    console.log(ansis.dim('\n============================================================\n'));
  }
}
