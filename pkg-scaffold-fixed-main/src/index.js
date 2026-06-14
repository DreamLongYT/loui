import { DeadCodeDetector } from "./ast/DeadCodeDetector.js";
import { OxcAnalyzer } from "./ast/OxcAnalyzer.js";
/**
 * ============================================================================
 * 📦 pkg-scaffold v3.4.0: Unified Architectural Refactoring Orchestrator
 * ============================================================================
 * Main execution bridge managing multi-pass compilation cycles, semantic cross-linking,
 * supply-chain validation audits, and automated structural healing rollbacks.
 */

import fs from 'fs/promises';
import path from 'path';
import ansis from 'ansis';
import readline from 'readline/promises';

// Import local domain architecture sub-systems
import { EngineContext } from './EngineContext.js';
import { ASTAnalyzer } from './ast/ASTAnalyzer.js';
import { BarrelParser } from './ast/BarrelParser.js';
import { MagicDetector } from './ast/MagicDetector.js';
import { PathMapper } from './resolution/PathMapper.js';
import { WorkspaceGraph } from './resolution/WorkSpaceGraph.js';
import { DependencyResolver } from './resolution/DepencyResolver.js';
import { CircularDetector } from './resolution/CircularDetector.js';
import { TransactionManager } from './refractor/TransactionManager.js';
import { ImpactAnalyzer } from './refractor/ImpactAnalyzer.js';
import { SourceRewriter } from './refractor/SourceRewriter.js';
import { TypeIntegrity } from './refractor/TypeIntegrity.js';
import { GitSandbox } from './healing/GitSandbox.js';
import { SelfHealer } from './healing/SelfHealer.js';
import { IncrementalCacheManager } from './performance/GraphCache.js';
import { WorkerPool } from './performance/WorkerPool.js';
import { SupplyChainGuard } from './performance/SupplyChainGuard.js';

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
    this.circularDetector = new CircularDetector(this.context);
    
    // Stage 3: Wire official AST Syntax parsers and framework processors
    this.analyzer = new ASTAnalyzer(this.context);
    this.oxcAnalyzer = new OxcAnalyzer(this.context);
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
      
      let rl;
      if (!this.context.skipConfirm) {
        rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
      }
      
      // Pass 1: Boot environment contexts and load alias configuration maps
      await this.context.initialize();
      await this.pathMapper.loadMappings(this.context.tsconfigFilename);
      
      // Always attempt workspace mesh initialization – it will auto-detect workspace
      // configuration and flip `context.isWorkspaceEnabled` when found.
      console.log(ansis.dim('🌐 Probing for monorepo workspace configuration...'));
      await this.workspaceGraph.initializeWorkspaceMesh();
      if (this.context.isWorkspaceEnabled) {
        console.log(ansis.dim('🌐 Monorepo workspace detected – mapping package mesh layers...'));
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

      for (const filePath of sourceCodeFilesList) {
        const node = this.context.createNode(filePath);
        const currentHash = await this.cacheManager.computeHash(filePath);
        node.contentHash = currentHash;

        const isFileCached = cacheManifest[filePath] && cacheManifest[filePath].hash === currentHash;

        if (isFileCached) {
          this.context.metrics.cacheHits++;
          this.hydrateNodeFromCache(node, cacheManifest[filePath]);
        } else if (!parallelParseCompleted) {
          this.context.metrics.cacheMisses++;
          const fileContent = await fs.readFile(filePath, 'utf8'); // Read file content here
          if (this.oxcAnalyzer.isAvailable) {
            this.oxcAnalyzer.parseFile(filePath, fileContent, node);
          } else {
            this.analyzer.parseFile(filePath, fileContent, node);
          }
        }

        this.magicDetector.injectVirtualConsumerEdges(filePath, node, activeFrameworkEcosystems);
        node.externalPackageUsage.forEach(pkg => this.context.usedExternalPackages.add(pkg));
      }

      // Fix: Automatically mark active ecosystem packages as used.
      // Maps internal plugin names to their canonical npm package names.
      const pluginToPackageMap = {
        'typescript': 'typescript',
        'vitest': 'vitest',
        'eslint': 'eslint',
        'prettier': 'prettier',
        'tailwindcss': 'tailwindcss',
        'postcss': 'postcss',
        'jest': 'jest',
        'playwright': '@playwright/test',
        'cypress': 'cypress',
        'storybook': 'storybook',
        'nextjs': 'next',
        'nuxt': 'nuxt',
        'remix': '@remix-run/dev',
        'sveltekit': '@sveltejs/kit',
        'astro': 'astro'
      };

      activeFrameworkEcosystems.forEach(ecosystem => {
        if (ecosystem !== 'universal-tooling-vectors') {
          const pkgName = pluginToPackageMap[ecosystem] || ecosystem;
          this.context.usedExternalPackages.add(pkgName);
        }
      });

      // Ensure all workspace package names are pre-marked as used so they are
      // never reported as unused dependencies in the manifest audit.
      if (this.context.isWorkspaceEnabled) {
        this.workspaceGraph.markWorkspacePackagesAsUsed();
      }

      // Pass 4: Evaluate graph edges and link connections across the codebase mesh
      console.log(ansis.dim('🔗 Linking graph edges and checking structural usage paths...'));
      await this.linkDependencyGraph();

      // NEW: Circular Dependency Detection
      console.log(ansis.dim('🔄 Detecting circular dependencies...'));
      const cycles = this.circularDetector.detectCycles(this.context.graph, this.context);
      if (cycles.length > 0) {
        console.warn(ansis.bold.yellow(`\n⚠️  Detected ${cycles.length} circular dependencies:`));
        this.circularDetector.formatCycles().forEach(c => console.log(ansis.dim(`    • ${c}`)));
      }

      // Pass 5: Compile metrics summary and print diagnostics report
      const analysisSummary = await this.context.generateSummaryReport();
      this.displayConsoleDiagnostics(analysisSummary);

      // Pass 6: Display Optimization Plan and Run Automated Structural Healing
      const structuralModificationsStaged = 
        analysisSummary.structuralIssuesDetected.deadFiles.length > 0 || 
        analysisSummary.structuralIssuesDetected.deadExports.length > 0 ||
        analysisSummary.structuralIssuesDetected.unusedDependencies.length > 0;

      if (structuralModificationsStaged) {
        console.log(ansis.bold.yellow('\n📋 Proposed Optimization Plan:'));
        console.log(ansis.dim('------------------------------------------------------------'));
        
        if (analysisSummary.structuralIssuesDetected.deadFiles.length > 0) {
          console.log(ansis.bold(`  🗑️  Delete ${analysisSummary.structuralIssuesDetected.deadFiles.length} orphaned files:`));
          analysisSummary.structuralIssuesDetected.deadFiles.forEach(f => console.log(ansis.dim(`    • ${f}`)));
        }
        
        if (analysisSummary.structuralIssuesDetected.deadExports.length > 0) {
          console.log(ansis.bold(`  ✂️  Prune ${analysisSummary.structuralIssuesDetected.deadExports.length} unused named exports:`));
          analysisSummary.structuralIssuesDetected.deadExports.forEach(e => console.log(ansis.dim(`    • ${e.symbol} in ${e.file}:${e.line}`)));
        }

        if (analysisSummary.structuralIssuesDetected.unusedDependencies.length > 0) {
          console.log(ansis.bold(`  📦 Remove ${analysisSummary.structuralIssuesDetected.unusedDependencies.length} unused dependencies:`));
          analysisSummary.structuralIssuesDetected.unusedDependencies.forEach(d => console.log(ansis.dim(`    • ${d.package} (${d.type} in ${d.manifest})`)));
        }
        console.log(ansis.dim('------------------------------------------------------------'));

        if (this.context.allowAutoFix) {
          let proceed = this.context.skipConfirm;
          if (!proceed) {
            const answer = await rl.question(ansis.bold.cyan('\n❓ Apply these structural modifications? (y/N): '));
            proceed = answer.toLowerCase() === 'y';
          }

          if (proceed) {
            // Execute healing lifecycle (git-state-capture -> apply -> verify -> commit/rollback)
            await this.selfHealer.runSelfHealingLifecycle(async () => {
              for (const relPath of analysisSummary.structuralIssuesDetected.deadFiles) {
                const absPath = path.resolve(this.context.cwd, relPath);
                console.log(ansis.red(`✂️  Removing unreferenced file: ${relPath}`));
                await this.txManager.stageDeletion(absPath);
              }

              for (const unusedExport of analysisSummary.structuralIssuesDetected.deadExports) {
                const absPath = path.resolve(this.context.cwd, unusedExport.file);
                const node = this.context.graph.get(absPath);
                if (!node) continue;
                const meta = node.internalExports.get(unusedExport.symbol);

                const safetyVerdict = await this.impactAnalyzer.verifyRefactorSafety(absPath, unusedExport.symbol, this.context.graph);
                if (safetyVerdict.isSafeToPrune) {
                  console.log(ansis.yellow(`⚡ Stripping unused export [${unusedExport.symbol}] from: ${unusedExport.file}:${unusedExport.line}`));
                  const nextText = await this.sourceRewriter.stripNamedExportSignature(absPath, unusedExport.symbol, meta);
                  await this.txManager.stageWrite(absPath, nextText);
                  await this.typeIntegrity.synchronizeDeclarationFile(absPath, unusedExport.symbol);
                } else if (this.context.verbose) {
                  console.log(ansis.gray(`🛡️  Preserving symbol export [${unusedExport.symbol}] due to: ${safetyVerdict.blockReason}`));
                }
              }
            });
          } else {
            console.log(ansis.bold.yellow('\n⚠️  Optimization plan aborted by user. No changes applied.'));
          }
        }
      }

      await this.cacheManager.saveCacheManifest(this.context.graph);
      if (rl) rl.close();
      console.log(ansis.bold.green('\n✨ Core optimization cycle completed smoothly. Codebase workspace is healthy.'));

    } catch (criticalFault) {
      console.error(ansis.bold.red(`\n🚨 Critical Operational Pipeline Failure: ${criticalFault.message}`));
      if (criticalFault.stack) console.error(ansis.dim(criticalFault.stack));
      process.exit(1);
    }
  }

  async discoverSourceFiles(dir, fileList) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const res = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.scaffold-cache') continue;
        await this.discoverSourceFiles(res, fileList);
      } else {
        const ext = path.extname(entry.name);
        if (['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'].includes(ext) || entry.name === 'package.json') {
          fileList.push(res);
        }
      }
    }
  }

  async linkDependencyGraph() {
    for (const [filePath, node] of this.context.graph.entries()) {
      // Pass A: Link all explicit imports (static + dynamic + re-export sources)
      for (const specifier of node.explicitImports) {
        const resolvedPath = this.resolver.resolveModulePath(filePath, specifier);
        if (resolvedPath && this.context.graph.has(resolvedPath)) {
          this.context.graph.get(resolvedPath).incomingEdges.add(filePath);
          node.outgoingEdges.add(resolvedPath);
          
          // Fix: Ensure all internal exports from a re-exported source are marked as used
          // so the source file itself is never considered orphaned.
          const targetNode = this.context.graph.get(resolvedPath);
          const isReExport = Array.from(node.internalExports.values()).some(exp => exp.source === specifier);
          if (isReExport) {
            targetNode.isLibraryEntry = true; // Protect re-exported internal files
          }
        }
      }

      // Pass B: Link named-symbol imports through barrel/re-export chains
      for (const specToken of node.importedSymbols) {
        const delimiterIndex = specToken.indexOf(':');
        if (delimiterIndex === -1) continue;
        const specifier = specToken.slice(0, delimiterIndex);
        const symbol = specToken.slice(delimiterIndex + 1);
        const resolvedPath = this.resolver.resolveModulePath(filePath, specifier);

        if (!resolvedPath) continue;

        if (symbol === '*') {
          // Wildcard import / re-export-all: add a direct edge to the resolved file.
          if (this.context.graph.has(resolvedPath)) {
            this.context.graph.get(resolvedPath).incomingEdges.add(filePath);
            node.outgoingEdges.add(resolvedPath);
          }
        } else {
          // Named import: trace through barrel files to the actual declaration origin.
          const traceResolution = await this.barrelParser.determineSymbolDeclarationOrigin(resolvedPath, symbol, this.context.graph);
          if (traceResolution && this.context.graph.has(traceResolution.originFile)) {
            this.context.graph.get(traceResolution.originFile).incomingEdges.add(filePath);
            node.outgoingEdges.add(traceResolution.originFile);
          }
        }
      }
    }
  }

  async auditManifestSupplyChain(packageJsonPath) {
    try {
      const text = await fs.readFile(packageJsonPath, 'utf8');
      const data = JSON.parse(text);
      const prodDeps = Object.keys(data.dependencies || {});
      const devDeps = Object.keys(data.devDependencies || {});

      this.context.manifestDependencies.set(packageJsonPath, {
        dependencies: prodDeps,
        devDependencies: devDeps,
        peerDependencies: Object.keys(data.peerDependencies || {}),
        optionalDependencies: Object.keys(data.optionalDependencies || {})
      });
    } catch (e) {}
  }

  displayConsoleDiagnostics(summary) {
    console.log(ansis.bold.cyan('\n📊 Codebase Optimization Summary Report'));
    console.log(ansis.dim('------------------------------------------------------------'));
    console.log(`⏱️  Analysis Duration: ${summary.executionDuration}`);
    console.log(`📂 Total Files Scanned: ${summary.totalFilesProcessed}`);
    console.log(`💾 Cache Optimization: ${summary.graphCacheOptimization.ratio} hits`);
    
    console.log(ansis.bold('\n🔍 Structural Integrity:'));
    if (summary.structuralIssuesDetected.deadFiles.length === 0 && 
        summary.structuralIssuesDetected.deadExports.length === 0 &&
        summary.structuralIssuesDetected.unusedDependencies.length === 0) {
      console.log(ansis.green('  ✅ No major structural debt detected.'));
    } else {
      if (summary.structuralIssuesDetected.deadFiles.length > 0) {
        console.log(ansis.red(`  ❌ Found ${summary.structuralIssuesDetected.deadFiles.length} orphaned/dead files.`));
      }
      if (summary.structuralIssuesDetected.deadExports.length > 0) {
        console.log(ansis.yellow(`  ⚠️  Found ${summary.structuralIssuesDetected.deadExports.length} unused named exports.`));
      }
      if (summary.structuralIssuesDetected.unusedDependencies.length > 0) {
        console.log(ansis.yellow(`  📦 Found ${summary.structuralIssuesDetected.unusedDependencies.length} unused dependencies.`));
      }
    }

    console.log(ansis.dim('\n------------------------------------------------------------\n'));
  }

  hydrateNodeFromCache(node, cachedRecord) {
    if (cachedRecord.explicitImports) cachedRecord.explicitImports.forEach(i => node.explicitImports.add(i));
    if (cachedRecord.dynamicImports) cachedRecord.dynamicImports.forEach(i => node.dynamicImports.add(i));
    if (cachedRecord.importedSymbols) cachedRecord.importedSymbols.forEach(s => node.importedSymbols.add(s));
    if (cachedRecord.internalExports) {
      Object.entries(cachedRecord.internalExports).forEach(([k, v]) => node.internalExports.set(k, v));
    }
    if (cachedRecord.symbolSourceLocations) {
      Object.entries(cachedRecord.symbolSourceLocations).forEach(([k, v]) => node.symbolSourceLocations.set(k, v));
    }
    // Restore fields that were previously missing from cache hydration
    if (cachedRecord.externalPackageUsage) cachedRecord.externalPackageUsage.forEach(p => node.externalPackageUsage.add(p));
    if (cachedRecord.rawStringReferences) cachedRecord.rawStringReferences.forEach(r => node.rawStringReferences.add(r));
    if (cachedRecord.instantiatedIdentifiers) cachedRecord.instantiatedIdentifiers.forEach(id => node.instantiatedIdentifiers.add(id));
    if (cachedRecord.propertyAccessChains) cachedRecord.propertyAccessChains.forEach(c => node.propertyAccessChains.add(c));
    if (cachedRecord.localSuppressedRules) cachedRecord.localSuppressedRules.forEach(r => node.localSuppressedRules.add(r));
    if (cachedRecord.calculatedDynamicImports) node.calculatedDynamicImports = cachedRecord.calculatedDynamicImports;
    if (cachedRecord.isLibraryEntry !== undefined) node.isLibraryEntry = cachedRecord.isLibraryEntry;
  }
}
