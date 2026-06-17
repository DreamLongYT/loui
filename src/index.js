import { DeadCodeDetector } from "./ast/DeadCodeDetector.js";
import { OxcAnalyzer } from "./ast/OxcAnalyzer.js";
import { SecretScanner } from './ast/SecretScanner.js';
/**
 * ============================================================================
 * 📦 entkapp v4.2.0: Unified Architectural Refactoring Orchestrator
 * ============================================================================
 * Main execution bridge managing multi-pass compilation cycles, semantic cross-linking,
 * supply-chain validation audits, and automated structural healing rollbacks.
 */

import fs from 'fs/promises';
import { existsSync, readFileSync } from 'fs'; 
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
    this.context = new EngineContext(options.cwd || process.cwd());
    this.context.options = options;
    this.context.autoFix = options.autoFix;
    this.context.tsconfigFilename = options.tsconfig;
    this.context.testCommand = options.testCommand;
    this.context.workspace = options.workspace;
    this.context.verbose = options.verbose;
    this.context.skipConfirm = options.skipConfirm;
    this.context.debug = options.debug;
    this.context.entryPoints = options.entryPoints || [];
    this.context.exclude = options.exclude || [];
    this.context.rules = options.rules || {};
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
    // Stage 6: Secret / hardcoded credential scanner
    this.secretScanner = new SecretScanner();
  }

  /**
   * Main Operational Loop executing multi-stage analysis passes across files.
   */
  async run() {
    try {
      console.log(ansis.bold.green('🎯 Starting entkapp Operational Optimization Cycle...'));
      
      if (!this.context.importUsageRegistry) this.context.importUsageRegistry = new Set();

      let rl;
      if (!this.context.skipConfirm) {
        rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
      }
      
      // Pass 1: Boot environment contexts and load alias configuration maps
      
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
        const node = this.context.getOrCreateNode(filePath);
        if (!this.context.importUsageRegistry) this.context.importUsageRegistry = new Set();
        const currentHash = await this.cacheManager.computeHash(filePath);
        node.contentHash = currentHash;

        const isFileCached = cacheManifest[filePath] && cacheManifest[filePath].hash === currentHash;

        if (isFileCached) {
          this.context.metrics.cacheHits++;
          this.hydrateNodeFromCache(node, cacheManifest[filePath]);
          // Re-run secret scan even on cached files (secrets may change without AST change)
          try {
            const cachedContent = await fs.readFile(filePath, 'utf8');
            const secretFindings = this.secretScanner.scanFileContent(filePath, cachedContent);
            if (secretFindings.length > 0) {
              node.securityThreats = (node.securityThreats || []).concat(secretFindings);
              secretFindings.forEach(f => this.context.allSecretFindings.push(f));
            }
          } catch { /* unreadable file – skip */ }
        } else if (!parallelParseCompleted) {
          this.context.metrics.cacheMisses++;
          const fileContent = await fs.readFile(filePath, 'utf8'); // Read file content here
          if (this.oxcAnalyzer.isAvailable) {
            await this.oxcAnalyzer.parseFile(filePath, fileContent, node);
          } else {
            await this.analyzer.parseFile(filePath, fileContent, node);
          }
          // Secret scan on freshly parsed content
          const secretFindings = this.secretScanner.scanFileContent(filePath, fileContent);
          if (secretFindings.length > 0) {
            node.securityThreats = (node.securityThreats || []).concat(secretFindings);
            secretFindings.forEach(f => this.context.allSecretFindings.push(f));
          }
        }

        await this.magicDetector.injectVirtualConsumerEdges(filePath, node, activeFrameworkEcosystems);
        
        // Fix: Explicitly protect entry points defined in local configuration
        if (this.context.entryPoints && this.context.entryPoints.some(ep => {
          const absEp = path.resolve(this.context.cwd, ep);
          return absEp === filePath || absEp === filePath.replace(/\.[^/.]+$/, "");
        })) {
          node.isLibraryEntry = true;
        }
        // node.externalPackageUsage.forEach(pkg => this.context.usedExternalPackages.add(pkg));
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
      
      // Update entry points and seeds based on link analysis
      for (const [filePath, node] of this.context.projectGraph.entries()) {
          if (node.isEntry || node.isLibraryEntry) {
              if (!this.context.importUsageRegistry) this.context.importUsageRegistry = new Set();
              this.context.importUsageRegistry.add(`${filePath}:*`);
              
              // Also protect all symbols in library entries
              if (node.internalExports) {
                  for (const symbol of node.internalExports.keys()) {
                      this.context.importUsageRegistry.add(`${filePath}:${symbol}`);
                  }
              }
          }
      }

      // NEW: Circular Dependency Detection
      console.log(ansis.dim('🔄 Detecting circular dependencies...'));
      const cycles = this.circularDetector.detectCycles(this.context.projectGraph, this.context);
      if (cycles.length > 0) {
        console.warn(ansis.bold.yellow(`\n⚠️  Detected ${cycles.length} circular dependencies:`));
        this.circularDetector.formatCycles().forEach(c => console.log(ansis.dim(`    • ${c}`)));
      }

      // Pass 4b: Report hardcoded secrets
      console.log(ansis.dim('🔐 Scanning for hardcoded secrets...'));
      const allSecrets = this.context.allSecretFindings || [];
      if (allSecrets.length > 0) {
        const criticalSecrets = allSecrets.filter(s => s.severity === 'CRITICAL');
        const otherSecrets = allSecrets.filter(s => s.severity !== 'CRITICAL');
        console.log(ansis.bold.red(`\n🔐 Hardcoded Secrets Detected (${allSecrets.length}):`) );
        if (criticalSecrets.length > 0) {
          console.log(ansis.red(`  CRITICAL (${criticalSecrets.length}):`));
          criticalSecrets.forEach(s => {
            const relPath = path.relative(this.context.cwd, s.file);
            const varInfo = s.variableName ? ` [${s.label}]` : ` [${s.label}]`;
            console.log(ansis.dim(`    • ${s.variableName || '<literal>'} in ${relPath}:${s.line}${varInfo}`));
          });
        }
        if (otherSecrets.length > 0) {
          console.log(ansis.yellow(`  HIGH/MEDIUM (${otherSecrets.length}):`));
          otherSecrets.forEach(s => {
            const relPath = path.relative(this.context.cwd, s.file);
            console.log(ansis.dim(`    • ${s.variableName || '<literal>'} in ${relPath}:${s.line} [${s.label}]`));
          });
        }
      }

      // Pass 5: Compile metrics summary and print diagnostics report
      
      // =========================================================================
      // 🛡️ UNIFORM SLASH GRAPH EDGE RECONCILIATION LAYER (FINAL STABLE PRODUCTION)
      // =========================================================================
      if (!this.context.exportRegistry) this.context.exportRegistry = new Map();
      if (!this.context.importUsageRegistry) this.context.importUsageRegistry = new Set();
      if (!this.context.consumedRootPackages) this.context.consumedRootPackages = new Set();
      if (!this.context.consumedWorkspacePackages) this.context.consumedWorkspacePackages = new Set();
      if (!this.context.unlistedDependencies) this.context.unlistedDependencies = [];

      // Simple internal helper to guarantee matching forward slash strings across all platforms
      const slashify = (p) => {
        if (!p) return p;
        if (Array.isArray(p)) p = p[0];
        return path.resolve(this.context.cwd, p).replace(/\\/g, '/');
      };

      if (this.context.projectGraph && typeof this.context.projectGraph.entries === 'function') {
        for (const [filePath, fileNode] of this.context.projectGraph.entries()) {
          if (!fileNode) continue;
          
          const cleanFilePath = slashify(filePath);

          // 🚀 ROOT DEPS HARVESTER SHADOW TRACKING:
          if (fileNode.externalPackageUsage) {
            fileNode.externalPackageUsage.forEach(pkg => {
              const relativeToRoot = path.relative(this.context.cwd, filePath).replace(/\\/g, '/');
              if (relativeToRoot.startsWith('packages/')) {
                this.context.consumedWorkspacePackages.add(pkg);
              } else {
                this.context.consumedRootPackages.add(pkg);
              }
            });
          }

          // 1. Gather all file exports using unified slashes
          if (fileNode.internalExports) {
            const exportKeys = typeof fileNode.internalExports.keys === 'function'
              ? Array.from(fileNode.internalExports.keys())
              : Object.keys(fileNode.internalExports);

            if (exportKeys.length > 0) {
              if (!this.context.exportRegistry.has(cleanFilePath)) {
                this.context.exportRegistry.set(cleanFilePath, new Set());
              }
              exportKeys.forEach(key => {
                if (key !== '*') { // Don't track wildcard as a dead export symbol
                  this.context.exportRegistry.get(cleanFilePath).add(key);
                }
              });
            }
          }

          // 2. Gather cross-file usage tokens using unified slashes
          if (fileNode.importedSymbols) {
            for (const symbolToken of fileNode.importedSymbols) {
              if (typeof symbolToken !== 'string') continue;

              const splitIndex = symbolToken.indexOf(':');
              if (splitIndex === -1) continue;
              
              const specifier = symbolToken.slice(0, splitIndex);
              const symbolName = symbolToken.slice(splitIndex + 1);

              let targetFile = null;
              // If specifier is already an absolute path (resolved during linkDependencyGraph)
              if (path.isAbsolute(specifier)) {
                targetFile = specifier;
              } else if (this.workspaceGraph && this.workspaceGraph.isLocalWorkspaceSpecifier(specifier)) {
                const match = this.workspaceGraph.getWorkspacePackageMatch(specifier);
                if (match && match.entryPoints && match.entryPoints.length > 0) {
                  targetFile = match.entryPoints[0];
                }
              } else if (specifier.startsWith('.')) {
                targetFile = this.resolver.resolveModulePath(filePath, specifier);
              }

              if (targetFile) {
                const cleanTargetFile = slashify(targetFile);
                this.context.importUsageRegistry.add(`${cleanTargetFile}:${symbolName}`);
              }
            }
          }
        }
      }

      // 🚀 UNLISTED AUDITOR FALLBACK REMAPPING LAYER
      if (this.workspaceGraph && this.workspaceGraph.packageManifests) {
        for (const [_, metadata] of this.workspaceGraph.packageManifests.entries()) {
          if (this.context.projectGraph) {
            for (const [filePath, fileNode] of this.context.projectGraph.entries()) {
              
              const cleanRelative = path.relative(metadata.rootDirectory, filePath).replace(/\\/g, '/');
              
              if (!cleanRelative.startsWith('..') && !cleanRelative.startsWith('/') && fileNode.explicitImports) {
                try {
                  // Switched to native sync token
                  const localManifest = JSON.parse(readFileSync(metadata.manifestPath, 'utf8'));
                  const localDeps = new Set([
                    ...Object.keys(localManifest.dependencies || {}),
                    ...Object.keys(localManifest.devDependencies || {}),
                    ...Object.keys(localManifest.peerDependencies || {})
                  ]);

                  fileNode.explicitImports.forEach(specifier => {
                    if (specifier.startsWith('.') || specifier.startsWith('/')) return;
                    const basePkg = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
                    
                    // Ensure lookups scan local package configurations only
                    if (!localDeps.has(basePkg)) {
                      const alreadyFlagged = this.context.unlistedDependencies.some(u => u.package === basePkg && u.file === filePath);
                      if (!alreadyFlagged) {
                        this.context.unlistedDependencies.push({
                          package: basePkg,
                          file: path.relative(this.context.cwd, filePath),
                          manifest: path.relative(this.context.cwd, metadata.manifestPath)
                        });
                      }
                    }
                  });
                } catch (error) {
                  // Dev logging fallback just in case JSON.parse hits bad layout characters
                  if (this.context.options.verbose) {
                    console.error(ansis.red(`      ❌ Manifest Parsing Exception: ${error.message}`));
                  }
                }
              }
            }
          }
        }
      }

      // =========================================================================
      // 🛡️ ROOT GRAPH EDGE RECONCILIATION: Filter entry points directly inside context
      // =========================================================================
      if (this.workspaceGraph && this.workspaceGraph.packageManifests && this.context.orphanedFiles) {
        const verifiedSeeds = new Set();

        for (const [_, metadata] of this.workspaceGraph.packageManifests.entries()) {
          if (metadata.entryPoints) {
            metadata.entryPoints.forEach(absolutePath => {
              verifiedSeeds.add(slashify(absolutePath));
            });
          }
        }

        this.context.orphanedFiles = this.context.orphanedFiles.filter(flaggedFile => {
          const absoluteFlaggedPath = slashify(flaggedFile);
          const isAGraphSeed = verifiedSeeds.has(absoluteFlaggedPath);
          return !isAGraphSeed;
        });
      }

      // =========================================================================
      // 🚀 PERMANENT COMPREHENSIVE ENGINE TELEMETRY DEBUG SENSOR
      // =========================================================================
      if (this.context?.options?.debug || this.context?.options?.verbose) {
        console.log('\n🔍 [DEBUG METRICS] Evaluating Analyzer State Matrix:');
        console.log(`  • OXC Analyzer available & active: ${!!this.oxcAnalyzer?.isAvailable}`);
        console.log(`  • Fast Mode execution flag state: ${!!this.context?.options?.fastMode}`);
        console.log(`  • Total files logged in exportRegistry: ${this.context?.exportRegistry ? this.context.exportRegistry.size : 0}`);
        console.log(`  • Total tracking tokens inside importUsageRegistry: ${this.context?.importUsageRegistry ? this.context.importUsageRegistry.size : 0}`);
        console.log(`  • Total unlisted dependencies intercepted: ${this.context?.unlistedDependencies ? this.context.unlistedDependencies.length : 0}`);
        console.log(`  • Consumed root external package names: [${Array.from(this.context?.consumedRootPackages || []).join(', ')}]`);
        console.log(`  • Consumed workspace package names: [${Array.from(this.context?.consumedWorkspacePackages || []).join(', ')}]`);
        console.log('------------------------------------------------------------\n');
      }

      const analysisSummary = await this.context.generateSummaryReport();
      analysisSummary.hardcodedSecrets = allSecrets;

      // 🚨 TARGET BUG 1: Detect Shadowed / Unused Root Dependencies
      try {
        const rootPkgPath = path.join(this.context.cwd, 'package.json');
        const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
        const rootDeps = Object.keys(rootPkg.dependencies || {});
        
        for (const dep of rootDeps) {
          // Fix: Evaluate both root and workspace tracking sets to find shadowed root dependencies
          const usedInRoot = this.context.consumedRootPackages?.has(dep);
          const usedInWorkspaces = this.context.consumedWorkspacePackages?.has(dep);
          
          if (!usedInRoot && usedInWorkspaces) {
            const structuralViolation = {
              package: dep,
              type: 'dependency',
              manifest: 'package.json'
            };
              
            if (!analysisSummary.unusedDependencies) analysisSummary.unusedDependencies = [];
            const alreadyLogged = analysisSummary.unusedDependencies.some(d => d.package === dep);
            if (!alreadyLogged) {
              analysisSummary.unusedDependencies.push(structuralViolation);
            }
          }
        }
      } catch (e) {}

      // 🚨 TARGET BUG 3: Calculate and Append Unused Named Exports
      analysisSummary.deadExports = [];
      if (this.context.exportRegistry && this.workspaceGraph) {
        for (const [exportedFile, exportsSet] of this.context.exportRegistry.entries()) {
          const cleanExportedFile = slashify(exportedFile);
          const relativeExportedFile = path.relative(this.context.cwd, cleanExportedFile);

          if (analysisSummary.orphanedFiles.includes(relativeExportedFile)) {
            continue;
          }
          
          let isPackageEntryPoint = false;
          for (const [_, metadata] of this.workspaceGraph.packageManifests.entries()) {
            if (metadata.entryPoints.map(p => slashify(p)).includes(cleanExportedFile)) {
              isPackageEntryPoint = true;
              break;
            }
          }
          if (isPackageEntryPoint) continue;

          const originalNode = this.context.projectGraph.get(cleanExportedFile);
          if (originalNode && originalNode.isLibraryEntry) continue;
          
          const unusedExportsInThisFile = [];
          
          for (const symbol of exportsSet) {
            const consumptionToken = `${cleanExportedFile}:${symbol}`;
            if (!this.context.importUsageRegistry?.has(consumptionToken)) {
              // Retrieve the real source location if available
              const loc = (originalNode && originalNode.symbolSourceLocations) ? originalNode.symbolSourceLocations.get(symbol) || { line: 0 } : { line: 0 };
              unusedExportsInThisFile.push({
                symbol: symbol,
                file: relativeExportedFile,
                line: loc.line
              });
            }
          }

          // --- NEW: Orphaned File Detection based on Export Coverage ---
          // If every single export in this file is unused, and it's not an entry point,
          // we suggest deleting the entire file instead of pruning individual exports.
          if (unusedExportsInThisFile.length > 0 && unusedExportsInThisFile.length === exportsSet.size) {
            if (!analysisSummary.orphanedFiles.includes(relativeExportedFile)) {
              analysisSummary.orphanedFiles.push(relativeExportedFile);
            }
          } else {
            // Otherwise, just append the individual dead exports as usual
            analysisSummary.deadExports.push(...unusedExportsInThisFile);
          }
        }
      }
      analysisSummary.unlistedDependencies = this.context.unlistedDependencies || [];
      
      const structuralModificationsStaged = 
          analysisSummary.orphanedFiles.length > 0 || 
          analysisSummary.deadExports.length > 0 ||
          analysisSummary.unusedDependencies.length > 0 ||
          analysisSummary.unlistedDependencies.length > 0;

      // Pass 6: Display Optimization Plan and Run Automated Structural Healing
      if (structuralModificationsStaged) {
        console.log(ansis.bold.yellow('\n📋 Proposed Optimization Plan:'));
        console.log(ansis.dim('------------------------------------------------------------'));
        
        if (analysisSummary.orphanedFiles.length > 0) {
          console.log(ansis.bold(`  🗑️  Delete ${analysisSummary.orphanedFiles.length} orphaned files:`));
          analysisSummary.orphanedFiles.forEach(f => console.log(ansis.dim(`    • ${f}`)));
        }
        
        if (analysisSummary.deadExports.length > 0) {
          console.log(ansis.bold(`  ✂️  Prune ${analysisSummary.deadExports.length} unused named exports:`));
          analysisSummary.deadExports.forEach(e => console.log(ansis.dim(`    • ${e.symbol} in ${e.file}:${e.line}`)));
        }

        if (analysisSummary.unusedDependencies && analysisSummary.unusedDependencies.length > 0) {
          console.log(ansis.bold(`  📦 Remove ${analysisSummary.unusedDependencies.length} unused dependencies:`));
          analysisSummary.unusedDependencies.forEach(d => {
            console.log(ansis.dim(`    • ${d.package} (${d.type} in ${d.manifest})`));
          });
        }

        // 🚨 TARGET BUG 2: Print Alert layout warning for your unlisted package detections!
        if (analysisSummary.unlistedDependencies && analysisSummary.unlistedDependencies.length > 0) {
          console.log(ansis.bold.red(`  ⚠️  Missing Declarations (Unlisted Packages Detected):`));
          analysisSummary.unlistedDependencies.forEach(u => {
            console.log(ansis.dim(`    • ${u.package} is imported in ${u.file} but missing from ${u.manifest}`));
          });
        }

        console.log(ansis.dim('------------------------------------------------------------'));

        if (this.context.options.fix) {
          let proceed = this.context.options.skipConfirm;
          if (!proceed) {
            const answer = await rl.question(ansis.bold.cyan('\n❓ Apply these structural modifications? (y/N): '));
            proceed = answer.toLowerCase() === 'y';
          }

          if (proceed) {
            // Execute healing lifecycle (git-state-capture -> apply -> verify -> commit/rollback)
            await this.selfHealer.runSelfHealingLifecycle(async () => {
              for (const relPath of analysisSummary.orphanedFiles) {
                const absPath = path.resolve(this.context.cwd, relPath);
                console.log(ansis.red(`✂️  Removing unreferenced file: ${relPath}`));
                await this.txManager.stageDeletion(absPath);
              }

              for (const unusedExport of analysisSummary.deadExports) {
                const absPath = path.resolve(this.context.cwd, unusedExport.file);
                const node = this.context.projectGraph.get(absPath);
                if (!node) continue;
                const meta = node.internalExports.get(unusedExport.symbol);

                const safetyVerdict = await this.impactAnalyzer.verifyRefactorSafety(absPath, unusedExport.symbol, this.context.projectGraph);
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

      await this.cacheManager.saveCacheManifest(this.context.projectGraph);
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
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.entkapp-cache') continue;
        if (this.context.verbose) console.log(ansis.dim(`📂 Scanning deep folder: ${res}`));
        await this.discoverSourceFiles(res, fileList);
      } else {
        const ext = path.extname(entry.name);
        if (['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'].includes(ext) || entry.name === 'package.json') {
          fileList.push(res);
          // Auto-detect entry points: files named index.js/ts/jsx/tsx in the root are entry points
          if (dir === this.context.cwd && /^index\.(js|ts|jsx|tsx)$/.test(entry.name)) {
            if (!this.context.entryPoints.includes(res)) {
              this.context.entryPoints.push(res);
            }
            const node = this.context.getOrCreateNode(res);
            node.isEntry = true;
          }
        }
      }
    }
  }

  async linkDependencyGraph() {
    // Pass 1: Global Entry-Point Protection (Seeds)
    // Mark all package entry points and explicit config entry points as library entries first.
    const seeds = new Set();
    
    // Add workspace entry points
    if (this.workspaceGraph && this.workspaceGraph.packageManifests) {
      for (const pkg of this.workspaceGraph.packageManifests.values()) {
        if (pkg.entryPoints) {
          pkg.entryPoints.forEach(ep => seeds.add(path.resolve(ep)));
        }
      }
    }

    // Add explicit config entry points
    if (this.context.entryPoints) {
      this.context.entryPoints.forEach(ep => seeds.add(path.resolve(this.context.cwd, ep)));
    }

    for (const seedPath of seeds) {
      if (this.context.projectGraph.has(seedPath)) {
        const node = this.context.projectGraph.get(seedPath);
        node.isLibraryEntry = true;
        node.isEntry = true;
      }
    }

    // Pass 2: Edge Linking
    for (const [filePath, node] of this.context.projectGraph.entries()) {
      // A. Explicit Imports (Files)
      for (const specifier of node.explicitImports) {
        const resolvedPath = this.resolver.resolveModulePath(filePath, specifier);
        if (resolvedPath && this.context.projectGraph.has(resolvedPath)) {
          const targetNode = this.context.projectGraph.get(resolvedPath);
          targetNode.incomingEdges.add(filePath);
          node.outgoingEdges.add(resolvedPath);
          
          // Re-export protection: If this file re-exports everything from another file, 
          // the target file should be treated as an entry point for its own exports.
          const isReExportAll = Array.from(node.internalExports.values()).some(exp => 
            (exp.type === "re-export-all" || exp.type === "re-export-namespace") && exp.source === specifier
          );
          if (isReExportAll) {
            targetNode.isLibraryEntry = true; 
          }
        }
      }

      // B. Symbol-level Linking (Tracing through barrels)
      for (const specToken of node.importedSymbols) {
        const delimiterIndex = specToken.indexOf(':');
        if (delimiterIndex === -1) continue;
        const specifier = specToken.slice(0, delimiterIndex);
        const symbol = specToken.slice(delimiterIndex + 1);
        const resolvedPath = this.resolver.resolveModulePath(filePath, specifier);

        if (!resolvedPath) continue;

        if (symbol === '*') {
          if (this.context.projectGraph.has(resolvedPath)) {
            this.context.projectGraph.get(resolvedPath).incomingEdges.add(filePath);
            node.outgoingEdges.add(resolvedPath);
          }
        } else {
          const traceResolution = await this.barrelParser.determineSymbolDeclarationOrigin(resolvedPath, symbol, this.context.projectGraph);
          if (traceResolution && this.context.projectGraph.has(traceResolution.originFile)) {
            const originNode = this.context.projectGraph.get(traceResolution.originFile);
            originNode.incomingEdges.add(filePath);
            node.outgoingEdges.add(traceResolution.originFile);
            // Register the actual resolved symbol for dead export detection
            node.importedSymbols.add(`${traceResolution.originFile}:${traceResolution.originSymbol}`);
          }
        }
      }

      // C. Dynamic Import Heuristics (Fix for non-literal dynamic imports)
      // If a file has calculated dynamic imports (e.g. import(variable)), 
      // we check all raw strings in that file as potential targets.
      if (node.calculatedDynamicImports && node.calculatedDynamicImports.length > 0) {
        for (const candidate of node.rawStringReferences) {
          // Rule 1: Try resolving it directly
          const resolvedPath = this.resolver.resolveModulePath(filePath, candidate);
          if (resolvedPath && this.context.projectGraph.has(resolvedPath)) {
            const targetNode = this.context.projectGraph.get(resolvedPath);
            targetNode.incomingEdges.add(filePath);
            node.outgoingEdges.add(resolvedPath);
            targetNode.isLibraryEntry = true;
            if (this.context.verbose) console.log(ansis.dim(`🔗 Dynamic Heuristic (Resolved): Linked ${candidate} from ${filePath}`));
            continue;
          }

          // Rule 2: Check all possible internal files for partial matches
          if (candidate.length > 3) { // Avoid very short strings
            for (const [targetPath, targetNode] of this.context.projectGraph.entries()) {
               const relToCwd = path.relative(this.context.cwd, targetPath).replace(/\\/g, '/');
               const relNoExt = relToCwd.replace(/\.[^/.]+$/, "");
               
               // Check for exact relative path matches or partial matches that look intentional
               if (candidate === relToCwd || candidate === relNoExt || 
                   candidate === `./${relToCwd}` || candidate === `./${relNoExt}` ||
                   (candidate.includes('/') && targetPath.endsWith(candidate.startsWith('/') ? candidate : `/${candidate}`))) {
                  
                  targetNode.incomingEdges.add(filePath);
                  node.outgoingEdges.add(targetPath);
                  targetNode.isLibraryEntry = true;
                  if (this.context.verbose) console.log(ansis.dim(`🔗 Dynamic Heuristic (Partial): Linked ${candidate} to ${relToCwd} from ${filePath}`));
               }
            }
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
    const secretCount = (summary.structuralIssuesDetected.hardcodedSecrets || []).length;
    if (summary.structuralIssuesDetected.deadFiles.length === 0 && 
        summary.structuralIssuesDetected.deadExports.length === 0 &&
        summary.structuralIssuesDetected.unusedDependencies.length === 0 &&
        secretCount === 0) {
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
      if (secretCount > 0) {
        console.log(ansis.red(`  🔐 Found ${secretCount} hardcoded secret(s) / credential(s).`));
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
    if (cachedRecord.externalPackageUsage) cachedRecord.externalPackageUsage.forEach(p => node.externalPackageUsage.add(p));
    if (cachedRecord.rawStringReferences) cachedRecord.rawStringReferences.forEach(r => node.rawStringReferences.add(r));
    if (cachedRecord.instantiatedIdentifiers) cachedRecord.instantiatedIdentifiers.forEach(id => node.instantiatedIdentifiers.add(id));
    if (cachedRecord.propertyAccessChains) cachedRecord.propertyAccessChains.forEach(c => node.propertyAccessChains.add(c));
    if (cachedRecord.localSuppressedRules) cachedRecord.localSuppressedRules.forEach(r => node.localSuppressedRules.add(r));
    if (cachedRecord.calculatedDynamicImports) node.calculatedDynamicImports = cachedRecord.calculatedDynamicImports;
    if (cachedRecord.isLibraryEntry !== undefined) node.isLibraryEntry = cachedRecord.isLibraryEntry;
  }
}