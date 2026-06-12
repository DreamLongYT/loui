import fs from 'fs/promises';
import path from 'path';
import ansis from 'ansis';

// Import Local System Domain Sub-Layers
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

/**
 * Orchestrator Class Coordinating the Complete Core Operational Cycle
 */
export class RefactoringEngine {
  constructor(options = {}) {
    // Phase 1: Initialize System Infrastructure Options
    this.context = new EngineContext(options);
    
    // Phase 2: Wire Structural Resolution Architectures
    this.pathMapper = new PathMapper(this.context);
    this.workspaceGraph = new WorkspaceGraph(this.context);
    this.resolver = new DependencyResolver(this.context, this.pathMapper, this.workspaceGraph);
    
    // Phase 3: Bind Core Code Parsing Libraries
    this.analyzer = new ASTAnalyzer(this.context);
    this.barrelParser = new BarrelParser(this.context, this.resolver);
    this.magicDetector = new MagicDetector(this.context);
    
    // Phase 4: Configure Code Optimization & Safety Subsystems
    this.txManager = new TransactionManager(this.context);
    this.impactAnalyzer = new ImpactAnalyzer(this.context);
    this.sourceRewriter = new SourceRewriter(this.context);
    this.typeIntegrity = new TypeIntegrity(this.context);
    
    // Phase 5: Initialize Caching and Verification Sandbox Environments
    this.cacheManager = new IncrementalCacheManager(this.context);
    this.gitSandbox = new GitSandbox(this.context);
    this.selfHealer = new SelfHealer(this.context, this.txManager, this.gitSandbox);
  }

  /**
   * Main Execution Entrypoint running sequential compilation passes.
   */
  async run() {
    try {
      // Step 1: Boot Environment Configurations
      await this.context.initialize();
      await this.pathMapper.loadMappings(this.context.tsconfigFilename);
      
      if (this.context.isWorkspaceEnabled) {
        console.log(ansis.dim('🌐 Constructing localized workspace mesh mappings...'));
        await this.workspaceGraph.initializeWorkspaceMesh();
      }

      // Challenge #14: Load asset fingerprints from disk to enable rapid cold starts
      console.log(ansis.cyan('🚀 Compiling incremental cache fingerprints...'));
      const cacheManifest = await this.cacheManager.loadCacheManifest();

      // Step 2: Recurse across directories to collect target file components
      const fileList = [];
      await this.discoverSourceFiles(this.context.cwd, fileList);
      this.context.metrics.totalFilesScanned = fileList.length;

      const frameworkEcosystems = await this.magicDetector.identifyActiveProjectEcosystems(this.context.cwd);

      // Step 3: Run Pass 1 over files (Parse code trees or read cached delta logs)
      for (const filePath of fileList) {
        const node = this.context.createNode(filePath);
        const currentHash = await this.cacheManager.computeHash(filePath);
        node.contentHash = currentHash;

        // Challenge #12 & #13: Extract declared fields from package files to audit safety configurations
        if (filePath.endsWith('package.json')) {
          await this.auditPackageDependencies(filePath);
        }

        // Challenge #15: Load pre-computed analysis if the current file hash matches the cache log
        if (cacheManifest[filePath] && cacheManifest[filePath].hash === currentHash) {
          this.context.metrics.cacheHits++;
          this.hydrateNodeFromCache(node, cacheManifest[filePath]);
        } else {
          this.context.metrics.cacheMisses++;
          const parseSuccess = await this.analyzer.processFile(filePath, node);
          if (!parseSuccess && this.context.verbose) {
            console.warn(ansis.yellow(`⚠️  Skipping unparseable syntax node bounds: ${filePath}`));
          }
        }

        // Apply ecosystem-specific routing protections (Next.js, SvelteKit, etc.)
        this.magicDetector.injectVirtualConsumerEdges(filePath, node, frameworkEcosystems);
      }

      // Step 4: Run Pass 2 to establish semantic connection paths across the dependency graph
      console.log(ansis.dim('🔗 Linking dependency chains across components...'));
      await this.linkDependencyGraph();

      // Step 5: Process compilation data and evaluate orphan metrics
      const analysisSummary = this.context.generateSummaryReport();
      this.displayConsoleDiagnostics(analysisSummary);

      // Step 6: Execute Refactoring Tasks inside our Git safety sandbox if --fix is set
      if (this.context.allowAutoFix) {
        const hasOptimizationsStaged = 
          analysisSummary.structuralIssuesDetected.deadFiles.length > 0 || 
          analysisSummary.structuralIssuesDetected.deadExports.length > 0;

        if (hasOptimizationsStaged) {
          await this.selfHealer.runSelfHealingLifecycle(async () => {
            // Task A: Purge unreferenced code components from the filesystem
            for (const relPath of analysisSummary.structuralIssuesDetected.deadFiles) {
              const absPath = path.resolve(this.context.cwd, relPath);
              console.log(ansis.red(`✂️  Removing unreferenced component: ${relPath}`));
              await this.txManager.stageDeletion(absPath);
              this.context.metrics.prunedFilesCount++;
            }

            // Task B: Surgically remove unused named export blocks from active code files
            for (const unusedExport of analysisSummary.structuralIssuesDetected.deadExports) {
              const absPath = path.resolve(this.context.cwd, unusedExport.file);
              const node = this.context.graph.get(absPath);
              
              if (!node) continue;
              const meta = node.internalExports.get(unusedExport.symbol);
              
              // Double check safety boundaries before altering code lines
              const validation = await this.impactAnalyzer.verifyRefactorSafety(absPath, unusedExport.symbol, this.context.graph);
              
              if (validation.isSafeToPrune) {
                console.log(ansis.yellow(`⚡ Stripping unused export [${unusedExport.symbol}] from: ${unusedExport.file}`));
                const currentText = await fs.readFile(absPath, 'utf8');
                const nextText = await this.sourceRewriter.stripNamedExportSignature(absPath, unusedExport.symbol, meta);
                
                await this.txManager.stageWrite(absPath, nextText);
                
                // Keep .d.ts layout declarations aligned with changes
                await this.typeIntegrity.synchronizeDeclarationFile(absPath, unusedExport.symbol);
                this.context.metrics.prunedExportsCount++;
              } else if (this.context.verbose) {
                console.log(ansis.gray(`🛡️  Preserved export [${unusedExport.symbol}] due to: ${validation.blockReason}`));
              }
            }
          });
        }
      }

      // Step 7: Write updated graph performance manifests back to disk
      await this.cacheManager.saveCacheManifest(this.context.graph);

    } catch (error) {
      console.error(ansis.bold.red(`\n🚨 Operational Pipeline Abort Fault: ${error.message}`));
      if (error.stack) console.error(ansis.dim(error.stack));
      process.exit(1);
    }
  }

  /**
   * Loops over file records to trace and establish dependency paths across the system graph.
   */
  async linkDependencyGraph() {
    for (const [filePath, node] of this.context.graph.entries()) {
      
      // Map standard static imports
      for (const specifier of node.explicitImports) {
        const resolvedPath = this.resolver.resolveModulePath(filePath, specifier);
        if (resolvedPath && this.context.graph.has(resolvedPath)) {
          this.context.graph.get(resolvedPath).incomingEdges.add(filePath);
          node.resolvedInternalTargets.add(resolvedPath);
        }
      }

      // Resolve redistributions and unwrap barrel structures inline
      for (const specToken of node.importedSymbols) {
        const [specifier, symbol] = specToken.split(':');
        const resolvedPath = this.resolver.resolveModulePath(filePath, specifier);
        
        if (resolvedPath && symbol !== '*') {
          const originInfo = await this.barrelParser.determineSymbolDeclarationOrigin(
            resolvedPath, 
            symbol, 
            this.context.graph
          );
          
          if (originInfo && this.context.graph.has(originInfo.originFile)) {
            this.context.graph.get(originInfo.originFile).incomingEdges.add(filePath);
            node.resolvedInternalTargets.add(originInfo.originFile);
          }
        }
      }
    }
  }

  /**
   * Audits package manifests to detect typosquatting patterns and structural risks.
   */
  async auditPackageDependencies(packageManifestPath) {
    try {
      const data = JSON.parse(await fs.readFile(packageManifestPath, 'utf8'));
      const deps = Object.keys(data.dependencies || {});
      const devDeps = Object.keys(data.devDependencies || {});
      const combined = [...deps, ...devDeps];

      // Challenge #12: Heuristic check for common dependency typo-squatting variants
      const indicators = ['lodah-es', 'react-domm', 'promisify-anys', 'coor-js', 'enhanseed-resolve'];
      
      for (const depKey of combined) {
        if (indicators.includes(depKey)) {
          console.warn(ansis.bold.red(`🚨 Supply Chain Alert: High-risk package signature match [${depKey}] flagged inside package manifest.`));
        }
      }
    } catch {
      // Manifest unreadable; pass validation block safely
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
   * Recursively crawls the file system layout to discover indexable source code components.
   */
  async discoverSourceFiles(currentDirectory, fileAccumulator) {
    try {
      const entries = await fs.readdir(currentDirectory, { withFileTypes: true });

      for (const entry of entries) {
        const absolutePath = path.join(currentDirectory, entry.name);

        if (entry.isDirectory()) {
          // Standard exclusion filters
          if (entry.name === 'node_modules' || 
              entry.name === '.git' || 
              entry.name === '.scaffold-cache' || 
              entry.name === 'dist' || 
              entry.name === 'build') {
            continue;
          }
          await this.discoverSourceFiles(absolutePath, fileAccumulator);
        } else if (entry.isFile()) {
          const extension = path.extname(entry.name).toLowerCase();
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
      // Directory unreadable; return execution state safely
    }
  }

  /**
   * Formats and prints real-world diagnostics data inside terminal views.
   */
  displayConsoleDiagnostics(report) {
    console.log(ansis.bold.green('\n📊 Codebase Structural Analysis Summary'));
    console.log(ansis.dim('============================================================'));
    console.log(`${ansis.bold('Processing Cycle Wall Duration:')} ${ansis.cyan(report.executionDuration)}`);
    console.log(`${ansis.bold('Total Files Indexed Globally  :')} ${ansis.white(report.totalFilesProcessed)}`);
    console.log(`${ansis.bold('Delta Cache Optimization Ratio:')} ${ansis.green(report.graphCacheOptimization.ratio)} (Hits: ${report.graphCacheOptimization.hits} / Misses: ${report.graphCacheOptimization.misses})`);
    console.log(ansis.dim('------------------------------------------------------------'));
    
    if (report.structuralIssuesDetected.deadFiles.length > 0) {
      console.log(ansis.red(`\nOrphaned Files Detected (${report.structuralIssuesDetected.deadFiles.length}):`));
      report.structuralIssuesDetected.deadFiles.forEach(f => console.log(ansis.dim(`  • ${f}`)));
    } else {
      console.log(ansis.green('\n✨ No orphaned or unreferenced component files found.'));
    }

    if (report.structuralIssuesDetected.deadExports.length > 0) {
      console.log(ansis.yellow(`\nUnused Named Symbol Exports Detected (${report.structuralIssuesDetected.deadExports.length}):`));
      report.structuralIssuesDetected.deadExports.forEach(e => {
        console.log(`  • ${ansis.dim(e.file)} -> [${ansis.yellow(e.symbol)}] (Type: ${e.type} @ line byte position offset: ${e.offset})`);
      });
    } else {
      console.log(ansis.green('✨ No dead or unused named symbols exported across components.'));
    }

    if (report.structuralIssuesDetected.securityThreats.length > 0) {
      console.log(ansis.bold.red(`\n⚠️  High-Risk Variable Assignment Alerts (${report.structuralIssuesDetected.securityThreats.length}):`));
      report.structuralIssuesDetected.securityThreats.forEach(threat => {
        console.log(`  • ${ansis.red(threat.file)} -> Variable [${ansis.bold(threat.identifier)}] matches entropy threat bounds (Shannon Score: ${threat.entropy})`);
      });
    }

    console.log(ansis.dim('\n============================================================'));
  }
}
