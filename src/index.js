import { OxcAnalyzer } from "./ast/OxcAnalyzer.js";
import { SecretScanner } from './ast/SecretScanner.js';
import { AdvancedAnalysis } from './ast/AdvancedAnalysis.js';
import { WorkspaceDiagnostic } from './resolution/WorkspaceDiagnostic.js';
import { DeadCodeDetector } from './ast/DeadCodeDetector.js';
import { CodeSmellAnalyzer } from './analyzers/CodeSmellAnalyzer.js';

/**
 * ============================================================================
 * 📦 entkapp v5.3.0: Unified Architectural Refactoring Orchestrator
 * ============================================================================
 * Main execution bridge managing multi-pass compilation cycles, semantic cross-linking,
 * supply-chain validation audits, and automated structural healing rollbacks.
 * Production-ready linear orchestration engine.
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
    
    // Lazy import DependencyProfiler
    import('./resolution/DependencyProfiler.js').then(({ DependencyProfiler }) => {
      this.dependencyProfiler = new DependencyProfiler(this.context);
    }).catch(() => {});
    
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
    this.advancedAnalysis = new AdvancedAnalysis(this.context);
    this.workspaceDiagnostic = new WorkspaceDiagnostic(this.context);
    this.deadCodeDetector = new DeadCodeDetector(this.context);
    this.codeSmellAnalyzer = new CodeSmellAnalyzer(this.context);
  }

  /**
   * Main Operational Loop executing multi-stage analysis passes across files.
   */
  async run() {
    try {
      console.log(ansis.bold.green('🎯 Starting entkapp Operational Optimization Cycle...'));
      
      let rl;
      if (!this.context.skipConfirm) {
        rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
      }
      
      // Pass 1: Boot environment contexts and load alias configuration maps
      await this.oxcAnalyzer.init();
      await this.pathMapper.loadMappings(this.context.tsconfigFilename);
      
      // Always attempt workspace mesh initialization
      console.log(ansis.dim('🌐 Probing for monorepo workspace configuration...'));
      await this.workspaceGraph.initializeWorkspaceMesh();
      if (this.context.isWorkspaceEnabled) {
        console.log(ansis.dim('🌐 Monorepo workspace detected – mapping package mesh layers...'));
        // Expose workspaceGraph on context for WorkspaceDiagnostic and other components
        this.context.workspaceGraph = this.workspaceGraph;
        // Reload PathMapper aliases now that workspace roots are known
        await this.pathMapper.loadMappings(this.context.tsconfigFilename);
        if (this.context.verbose) {
          console.log(`[Workspace] Found ${this.workspaceGraph.packageManifests.size} workspace packages:`);
          for (const [dir, manifest] of this.workspaceGraph.packageManifests.entries()) {
            console.log(ansis.dim(`  • ${manifest.name || dir}`));
          }
        }
      }

      // UPGRADE: Always clear cache for fresh analysis run
      await this.cacheManager.clearCache();
      
      // Load asset fingerprints from disk cache to maximize cold-start performance
      const cacheManifest = await this.cacheManager.loadCacheManifest();

      // Pass 2: Recursively crawl directories to compile target codebase files list
      const rawFileList = [];
      await this.discoverSourceFiles(this.context.cwd, rawFileList);
      
      // UPGRADE: De-duplicate and normalize file list to prevent massive count inflation
      const slashifyInternal = (p) => {
        let abs = path.resolve(this.context.cwd, p).replace(/\\/g, '/');
        if (/^[a-z]:\//i.test(abs)) {
          abs = abs.charAt(0).toUpperCase() + abs.slice(1);
        }
        return abs;
      };
      const uniqueFiles = new Set(rawFileList.map(f => slashifyInternal(f)));
      const fileList = Array.from(uniqueFiles);
      
      this.context.metrics.totalFilesScanned = fileList.length;

      // Identify meta-framework setups (Next.js, Remix, Nuxt, etc.)
      if (this.dependencyProfiler) {
        const usedDeps = await this.dependencyProfiler.traceImplicitInvocations(this.context.cwd);
        for (const dep of usedDeps) {
          this.context.usedExternalPackages.add(dep);
        }
      }
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
      if (sourceCodeFilesList.length > 1) {
        parallelParseCompleted = await this.workerPool.parallelAnalyzeCodebase(sourceCodeFilesList, this);
      }

      // =========================================================================
      // 💎 GESETZ 1: EXKLUSIVE WURZEL-GARANTIE AUS MANIFEST EXTRAHIEREN
      // =========================================================================
      let localManifestMainEntryPoint = null;
      try {
        const pkgPath = path.join(this.context.cwd, 'package.json');
        if (existsSync(pkgPath)) {
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
          if (pkg.main) {
            localManifestMainEntryPoint = path.resolve(this.context.cwd, pkg.main).replace(/\\/g, '/');
          }
        }
      } catch (e) {}

      // =========================================================================
      // 🔄 PRIMARY FILE-PARSING LIFECYCLE LOOP
      // =========================================================================
      for (const filePath of sourceCodeFilesList) {
        const absFilePath = slashifyInternal(filePath);
        const node = this.context.getOrCreateNode(absFilePath);
        const currentHash = await this.cacheManager.computeHash(absFilePath);
        node.contentHash = currentHash;

        // --- MANIFEST ENTRY ABSOLUTE IMMUNITÄT ---
        if (localManifestMainEntryPoint && absFilePath === localManifestMainEntryPoint) {
          node.isEntry = true;
          if (this.context.verbose) {
            console.log(ansis.bold.green(`[WURZEL-GARANTIE] ${filePath} sofort als unantastbarer Entry Point verankert.`));
          }
        }

        const isFileCached = cacheManifest[filePath] && cacheManifest[filePath].hash === currentHash;

        if (isFileCached) {
          this.context.metrics.cacheHits++;
          this.hydrateNodeFromCache(node, cacheManifest[filePath]);
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
          const fileContent = await fs.readFile(filePath, 'utf8');
          
          let success = false;
          if (this.oxcAnalyzer.isAvailable) {
            success = await this.oxcAnalyzer.parseFile(filePath, fileContent, node);
          }
          
          // --- DEEP STATIC ANALYSIS ---
          this.codeSmellAnalyzer.analyze(node);
          
          // UPGRADE: Improved fallback logic for CommonJS files
          const hasImportExportKeywords = fileContent.includes('import') || fileContent.includes('export');
          const hasCommonJSKeywords = fileContent.includes('require') || fileContent.includes('module.exports') || fileContent.includes('exports.');
          const oxcFailedToFindDependencies = node.explicitImports.size === 0 && node.internalExports.size === 0;
          
          // Fallback to TS parser if:
          // 1. OXC failed completely, OR
          // 2. OXC found no dependencies but file has import/export keywords, OR
          // 3. OXC found no dependencies but file has CommonJS keywords
          if (!success || (oxcFailedToFindDependencies && (hasImportExportKeywords || hasCommonJSKeywords))) {
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
        const slashifyLocal = (p) => path.resolve(this.context.cwd, p).replace(/\\/g, '/');
        if (this.context.entryPoints && this.context.entryPoints.some(ep => {
          const absEp = slashifyLocal(ep);
          const cleanAbsEp = absEp.replace(/\.[^/.]+$/, "");
          const cleanFilePath = slashifyLocal(filePath).replace(/\.[^/.]+$/, "");
          return absEp === slashifyLocal(filePath) || cleanAbsEp === cleanFilePath;
        })) {
          node.isEntry = true;
        }
      } // 💎 HIER SCHLIESST DIE DATEI-SCHLEIFE JETZT SAUBER UND KORREKT!

      // Fix: Automatically mark active ecosystem packages as used.
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
        'astro': 'astro',
        'express': 'express',
        'fastify': 'fastify',
        'nestjs': '@nestjs/core',
        'prisma': '@prisma/client',
        'hono': 'hono',
        'koa': 'koa',
        'strapi': '@strapi/strapi',
        'adonisjs': '@adonisjs/core',
        'trpc': '@trpc/server',
        'typeorm': 'typeorm',
        'sequelize': 'sequelize',
        'mongoose': 'mongoose',
        'drizzle': 'drizzle-orm',
        'redux': 'redux',
        'mobx': 'mobx',
        'tanstack-query': '@tanstack/react-query',
        'zustand': 'zustand',
        'jotai': 'jotai',
        'recoil': 'recoil',
        'xstate': 'xstate',
        'pinia': 'pinia',
        'framer-motion': 'framer-motion',
        'gsap': 'gsap',
        'threejs': 'three',
        'web3': 'web3',
        'ethers': 'ethers',
        'clerk': '@clerk/nextjs',
        'supabase': '@supabase/supabase-js',
        'firebase': 'firebase',
        'graphql': 'graphql',
        'socketio': 'socket.io',
        'antd': 'antd',
        'mui': '@mui/material',
        'chakra': '@chakra-ui/react',
        'mantine': '@mantine/core',
        'preact': 'preact',
        'swiper': 'swiper',
        'quill': 'quill'
      };

      activeFrameworkEcosystems.forEach(ecosystem => {
        if (ecosystem !== 'universal-tooling-vectors') {
          const pkgName = pluginToPackageMap[ecosystem] || ecosystem;
          this.context.usedExternalPackages.add(pkgName);
        }
      });

      // =========================================================================
      // 🚀 ZWEITER DEBUG SENSOR: Immunitäts-Verifikation nach dem Parsen
      // =========================================================================
      console.log(ansis.bold.magenta('\n🔍 [DEBUG] Zustand der Entry-Points nach dem Parsen:'));
      let entryCount = 0;
      for (const [filePath, node] of this.context.projectGraph.entries()) {
        if (node.isEntry) {
          entryCount++;
          const rel = path.relative(this.context.cwd, filePath).replace(/\\/g, '/');
          console.log(ansis.green(`  • 💎 ERKANNT ALS ENTRY: ${rel}`));
        }
      }
      if (entryCount === 0) {
        console.log(ansis.bold.red('  🚨 ALARM: Keine einzige Datei wurde als Entry Point markiert!'));
      }

      // Mark workspace packages as used to block false alarms in the manifest auditor
      if (this.context.isWorkspaceEnabled) {
        this.workspaceGraph.markWorkspacePackagesAsUsed();
      }

      // Pass 4: Berechne Graph-Kanten und verknüpfe Import-Verbindungen
      console.log(ansis.dim('🔗 Linking graph edges and checking structural usage paths...'));
      if (this.context.verbose) {
        console.log(`[Linker] Starting dependency graph linkage for ${this.context.projectGraph.size} nodes.`);
      }
      
      await this.linkDependencyGraph(); // 💎 Wird jetzt exakt ein einziges Mal gestartet!

      if (this.context.verbose) {
        const totalEdges = Array.from(this.context.projectGraph.values()).reduce((sum, node) => sum + node.outgoingEdges.size, 0);
        console.log(`[Linker] Completed linkage. Total edges created: ${totalEdges}`);
      }

      if (this.context.options.visualize) {
        await this._generateVisualization(this.context.projectGraph);
      }

      // NEW: Circular Dependency Detection
      console.log(ansis.dim('🔄 Detecting circular dependencies...'));
      const cyclesResult = this.circularDetector.detectCycles(this.context.projectGraph, this.context);
      if (cyclesResult.length > 0) {
        console.warn(ansis.bold.yellow(`\n⚠️  Detected ${cyclesResult.length} circular dependencies:`));
        this.circularDetector.formatCycles().forEach(c => console.log(ansis.dim(`    • ${c}`)));
      }
    
      // Pass 4b: Report hardcoded secrets
      console.log(ansis.dim("🔐 Scanning for hardcoded secrets..."));
      const allSecrets = this.context.allSecretFindings || [];
      
      if (this.context.allSecretFindings) {
        const uniqueSecrets = new Map();
        this.context.allSecretFindings.forEach(s => {
          const key = `${s.file}:${s.line}:${s.type}`;
          if (!uniqueSecrets.has(key)) uniqueSecrets.set(key, s);
        });
        this.context.allSecretFindings = Array.from(uniqueSecrets.values());
      }

      // NEW: Advanced Program Analysis (CFG, Data Flow, Taint Tracking)
      console.log(ansis.dim("🧠 Performing advanced program analysis..."));
      for (const [filePath, fileNode] of this.context.projectGraph.entries()) {
        const ast = fileNode.ast || {}; 
        this.advancedAnalysis.buildCFG(filePath, ast);
      }

      // NEW: Workspace Diagnostic & Architecture Enforcement
      console.log(ansis.dim("🏛️ Analyzing workspace architecture..."));
      const workspaceHealthFindings = await this.workspaceDiagnostic.checkWorkspaceHealth();
      if (workspaceHealthFindings.length > 0) {
        console.warn(ansis.bold.yellow(`\n⚠️  Workspace health issues detected:`));
        workspaceHealthFindings.forEach(f => console.log(ansis.dim(`    • ${f.message}`)));
      }

      for (const [filePath, fileNode] of this.context.projectGraph.entries()) {
        const boundaryViolations = this.workspaceDiagnostic.enforceBoundaries(filePath, Array.from(fileNode.explicitImports));
        if (boundaryViolations.length > 0) {
          console.warn(ansis.bold.yellow(`\n⚠️  Architectural boundary violations in ${path.relative(this.context.cwd, filePath)}:`));
          boundaryViolations.forEach(v => console.log(ansis.dim(`    • ${v.message}`)));
        }
      }

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
      if (!this.context.exportRegistry) this.context.exportRegistry = new Map();
      if (!this.context.importUsageRegistry) this.context.importUsageRegistry = new Set();
      if (!this.context.consumedRootPackages) this.context.consumedRootPackages = new Set();
      if (!this.context.consumedWorkspacePackages) this.context.consumedWorkspacePackages = new Set();
      if (!this.context.unlistedDependencies) this.context.unlistedDependencies = [];

      const slashify = (p) => path.resolve(this.context.cwd, p).replace(/\\/g, '/');

      if (this.context.projectGraph && typeof this.context.projectGraph.entries === 'function') {
        for (const [filePath, fileNode] of this.context.projectGraph.entries()) {
          if (!fileNode) continue;
          
          const cleanFilePath = slashify(filePath);

          if (fileNode.externalPackageUsage) {
            fileNode.externalPackageUsage.forEach(pkg => {
              const relativeToRoot = path.relative(this.context.cwd, filePath);
              if (relativeToRoot.startsWith('packages' + path.sep) || relativeToRoot.startsWith('packages/')) {
                this.context.consumedWorkspacePackages.add(pkg);
              } else {
                this.context.consumedRootPackages.add(pkg);
              }
            });
          }

          if (fileNode.internalExports) {
            const exportKeys = typeof fileNode.internalExports.keys === 'function'
              ? Array.from(fileNode.internalExports.keys())
              : Object.keys(fileNode.internalExports);

            if (exportKeys.length > 0) {
              if (!this.context.exportRegistry.has(cleanFilePath)) {
                this.context.exportRegistry.set(cleanFilePath, new Set());
              }
              exportKeys.forEach(key => this.context.exportRegistry.get(cleanFilePath).add(key));
            }
          }

          if (fileNode.explicitImports && fileNode.importedSymbols) {
            const symbolsArray = typeof fileNode.importedSymbols.forEach === 'function'
              ? Array.from(fileNode.importedSymbols)
              : (Array.isArray(fileNode.importedSymbols) ? fileNode.importedSymbols : []);

            for (const symbolToken of symbolsArray) {
              if (typeof symbolToken !== 'string') continue;

              let splitIndex = symbolToken.lastIndexOf(':');
              if (splitIndex === -1) continue;
              
              const specifier = symbolToken.slice(0, splitIndex);
              const symbolName = symbolToken.slice(splitIndex + 1);

              let targetFile = null;
              if (this.workspaceGraph && typeof this.workspaceGraph.isLocalWorkspaceSpecifier === 'function' && this.workspaceGraph.isLocalWorkspaceSpecifier(specifier)) {
                const match = this.workspaceGraph.getWorkspacePackageMatch(specifier);
                if (match && match.entryPoints && match.entryPoints.length > 0) {
                  targetFile = Array.isArray(match.entryPoints) ? match.entryPoints : match.entryPoints;
                }
              } else if (specifier.startsWith('.')) {
                targetFile = path.resolve(path.dirname(filePath), specifier);
                
                if (targetFile.endsWith('.js')) {
                  targetFile = targetFile.slice(0, -3);
                }

                if (!path.extname(targetFile)) {
                  if (existsSync(targetFile + '.ts')) targetFile += '.ts';
                  else if (existsSync(targetFile + '.tsx')) targetFile += '.tsx';
                  else if (existsSync(targetFile + '.js')) targetFile += '.js';
                }
              }

              if (targetFile) {
                const cleanTargetFile = Array.isArray(targetFile) ? slashify(targetFile[0]) : slashify(targetFile);
                this.context.importUsageRegistry.add(`${cleanTargetFile}:${symbolName}`);
              }
            }
          }
        }
      }

      // UPGRADE: Unlisted Dependency Audit (Unified Root & Workspace)
      const auditManifests = [];
      // 1. Collect Root Manifest
      const rootPkgPath = path.join(this.context.cwd, 'package.json');
      if (existsSync(rootPkgPath)) {
        auditManifests.push({
          rootDirectory: this.context.cwd,
          manifestPath: rootPkgPath
        });
      }
      // 2. Collect Workspace Manifests
      if (this.workspaceGraph && this.workspaceGraph.packageManifests) {
        for (const [_, metadata] of this.workspaceGraph.packageManifests.entries()) {
          auditManifests.push(metadata);
        }
      }

      for (const metadata of auditManifests) {
        if (this.context.projectGraph) {
          for (const [filePath, fileNode] of this.context.projectGraph.entries()) {
            const cleanRelative = path.relative(metadata.rootDirectory, filePath).replace(/\\/g, '/');
            
            // Check if file belongs to this manifest's directory scope
            if (!cleanRelative.startsWith('..') && !cleanRelative.startsWith('/') && fileNode.explicitImports) {
              try {
                const localManifest = JSON.parse(readFileSync(metadata.manifestPath, 'utf8'));
                const localDeps = new Set([
                  ...Object.keys(localManifest.dependencies || {}),
                  ...Object.keys(localManifest.devDependencies || {}),
                  ...Object.keys(localManifest.peerDependencies || {}),
                  ...Object.keys(localManifest.optionalDependencies || {})
                ]);

                fileNode.explicitImports.forEach(specifier => {
                  if (specifier.startsWith('.') || specifier.startsWith('/')) return;
                  
                  // Extract base package name (handle scoped packages)
                  const basePkg = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
                  
                  // Ignore Node.js built-ins
                  const nodeBuiltins = ['assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'http2', 'https', 'inspector', 'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode', 'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'timers', 'tls', 'trace_events', 'tty', 'url', 'util', 'v8', 'vm', 'worker_threads', 'zlib'];
                  if (nodeBuiltins.includes(basePkg) || nodeBuiltins.includes(basePkg.replace('node:', ''))) return;

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
                if (this.context.options.verbose) {
                  console.error(ansis.red(`      ❌ Manifest Parsing Exception: ${error.message}`));
                }
              }
            }
          }
        }
      }

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
          return !verifiedSeeds.has(absoluteFlaggedPath);
        });
      }

      if (this.context?.options?.debug || this.context?.options?.verbose) {
        console.log('\n🔍 [DEBUG METRICS] Evaluating Analyzer State Matrix:');
        console.log(`  • OXC Analyzer available & active: ${!!this.oxcAnalyzer?.isAvailable}`);
        console.log(`  • Fast Mode execution flag state: ${!!this.context?.options?.fastMode}`);
        console.log(`  • Total files logged in exportRegistry: ${this.context?.exportRegistry ? this.context.exportRegistry.size : 0}`);
        console.log(`  • Total tracking tokens inside importUsageRegistry: ${this.context?.importUsageRegistry ? this.context.importUsageRegistry.size : 0}`);
        console.log(`  • Total unlisted dependencies intercepted: ${this.context?.unlistedDependencies ? this.context.unlistedDependencies.length : 0}`);
        console.log('------------------------------------------------------------\n');
      }

      const analysisSummary = await this.context.generateSummaryReport();
      analysisSummary.hardcodedSecrets = allSecrets;

      // const reachabilityResults = this.deadCodeDetector.detectDeadCode(this.context.projectGraph);
      // analysisSummary.orphanedFiles = reachabilityResults.deadFiles.map(f => path.relative(this.context.cwd, f));
      
      /* if (reachabilityResults.deadExports.length > 0) {
        analysisSummary.deadExports = analysisSummary.deadExports.filter(de => {
            return !analysisSummary.orphanedFiles.includes(de.file);
        });
      }*/

      try {
        const rootPkgPath = path.join(this.context.cwd, 'package.json');
        const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'));
        const rootDeps = Object.keys(rootPkg.dependencies || {});
        
        for (const dep of rootDeps) {
          const usedInRoot = this.context.consumedRootPackages?.has(dep);
          const usedInWorkspaces = this.context.consumedWorkspacePackages?.has(dep);
          
          if (!usedInRoot && usedInWorkspaces) {
            const structuralViolation = { package: dep, type: 'dependency', manifest: 'package.json' };
            if (!analysisSummary.unusedDependencies) analysisSummary.unusedDependencies = [];
            const alreadyLogged = analysisSummary.unusedDependencies.some(d => d.package === dep);
            if (!alreadyLogged) analysisSummary.unusedDependencies.push(structuralViolation);
          }
        }
      } catch (e) {}

      const slashifyLocal = (p) => p ? path.resolve(this.context.cwd, p).replace(/\\/g, '/') : '';
      if (this.context.exportRegistry && this.workspaceGraph) {
        analysisSummary.deadExports = (analysisSummary.deadExports || []).filter(de => {
          if (!de || !de.file) return false;
          const absPath = path.resolve(this.context.cwd, de.file);
          const cleanAbsPath = slashifyLocal(absPath);
          const node = this.context.projectGraph.get(cleanAbsPath);
          
          if (node && (node.isLibraryEntry || node.isEntry)) return false;

          let isPackageEntryPoint = false;
          const manifests = this.workspaceGraph?.packageManifests;
          if (manifests) {
            for (const [_, metadata] of manifests.entries()) {
              if (metadata.entryPoints && metadata.entryPoints.map(p => slashifyLocal(p)).includes(cleanAbsPath)) {
                isPackageEntryPoint = true;
                break;
              }
            }
          }
          return !isPackageEntryPoint;
        });
      }
      analysisSummary.unlistedDependencies = this.context.unlistedDependencies || [];
      
      const advancedResults = this.advancedAnalysis.runAll(this.context.projectGraph, this.workspaceGraph?.packageManifests || new Map());
      const cycles = cyclesResult;
      
      const structuralModificationsStaged = 
          analysisSummary.orphanedFiles.length > 0 || 
          analysisSummary.deadExports.length > 0 ||
          analysisSummary.unusedDependencies.length > 0 ||
          analysisSummary.unlistedDependencies.length > 0 ||
          (cycles && cycles.length > 0);

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
          analysisSummary.unusedDependencies.forEach(d => console.log(ansis.dim(`    • ${d.package} (${d.type} in ${d.manifest})`)));
        }

        if (analysisSummary.missingDependencies && analysisSummary.missingDependencies.length > 0) {
          console.log(ansis.bold(`  📦 Add ${analysisSummary.missingDependencies.length} missing dependencies:`));
          analysisSummary.missingDependencies.forEach(dep => console.log(ansis.dim(`    • ${dep} (detected via source usage)`)));
        }

        if (analysisSummary.unlistedDependencies && analysisSummary.unlistedDependencies.length > 0) {
          console.log(ansis.bold.red(`  ⚠️  Missing Declarations (Unlisted Packages Detected):`));
          analysisSummary.unlistedDependencies.forEach(u => console.log(ansis.dim(`    • ${u.package} is imported in ${u.file} but missing from ${u.manifest}`)));
        }

        if (cycles.length > 0) {
          console.log(ansis.bold.magenta(`  🔄 Circular Dependencies Detected (${cycles.length}):`));
          cycles.forEach((cycle, idx) => {
            const relativeCycle = cycle.map(p => path.relative(this.context.cwd, p).replace(/\\/g, '/'));
            console.log(ansis.dim(`    • Cycle #${idx + 1}: ${relativeCycle.join(' -> ')}`));
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
                }
              }
            });
          } else {
            console.log(ansis.bold.yellow('\n⚠️  Optimization plan aborted by user. No changes applied.'));
          }
        }
      }

      // Final diagnostics report
      this.reportDiagnostics();

      await this.cacheManager.saveCacheManifest(this.context.projectGraph);
      if (rl) rl.close();
      console.log(ansis.bold.green('\n✨ Core optimization cycle completed smoothly. Codebase workspace is healthy.'));

    } catch (criticalFault) {
      console.error(ansis.bold.red(`\n🚨 Critical Operational Pipeline Failure: ${criticalFault.message}`));
      if (criticalFault.stack) console.error(ansis.dim(criticalFault.stack));
      process.exit(1);
    }
  }

  async _generateVisualization(graph) {
    console.log(ansis.bold.green('\n🌐 [VISUALIZER] Generating Interactive Execution Graph...'));
    const nodes = [];
    const edges = [];
    const fileToIndex = new Map();
    let idCounter = 1;

    for (const [file, node] of graph.entries()) {
      const relPath = path.relative(this.context.cwd, file);
      const id = idCounter++;
      fileToIndex.set(file, id);
      nodes.push({
        id,
        label: relPath,
        color: node.isLibraryEntry ? '#ff7675' : '#74b9ff',
        shape: node.isLibraryEntry ? 'diamond' : 'dot',
        size: node.isLibraryEntry ? 25 : 15
      });
    }

    for (const [file, node] of graph.entries()) {
      const fromId = fileToIndex.get(file);
      node.outgoingEdges.forEach(edgeFile => {
        const toId = fileToIndex.get(edgeFile);
        if (toId) edges.push({ from: fromId, to: toId, arrows: 'to' });
      });
    }

    const html = `<!DOCTYPE html><html><head><title>entkapp Execution Graph</title><script src="https://unpkg.com"></script><style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background-color:#2d3436;color:#dfe6e9;font-family:sans-serif;}#network{width:100%;height:100%;}#header{position:absolute;top:10px;left:10px;z-index:10;pointer-events:none;}h1{margin:0;font-size:1.5rem;color:#fab1a0;}.legend{margin-top:5px;font-size:0.9rem;}.legend-item{display:inline-block;margin-right:15px;}.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;}</style></head><body><div id="header"><h1>entkapp Execution Graph</h1><div class="legend"><div class="legend-item"><span class="dot" style="background-color:#ff7675;border-radius:0;transform:rotate(45deg);"></span> Entry Point</div><div class="legend-item"><span class="dot" style="background-color:#74b9ff;"></span> Module</div></div></div><div id="network"></div><script>const nodes=new vis.DataSet(${JSON.stringify(nodes)});const edges=new vis.DataSet(${JSON.stringify(edges)});const container=document.getElementById('network');const data={nodes,edges};const options={nodes:{font:{color:'#dfe6e9',size:14}},edges:{color:{color:'#636e72',highlight:#fab1a0},width:2},physics:{forceAtlas2Based:{gravitationalConstant:-50,centralGravity:0.01,springLength:100,springConstant:0.08},maxVelocity:50,solver:'forceAtlas2Based',timestep:0.35,stabilization:{iterations:150}}};new vis.Network(container,data,options);</script></body></html>`;

    const http = await import('http');
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });

    const port = 3000;
    server.listen(port, () => {
      console.log(ansis.bold.cyan(`\n🚀 Web Viewer active at: http://localhost:${port}`));
    });

    return new Promise((resolve) => {
      process.on('SIGINT', () => {
        server.close();
        resolve();
      });
    });
  }

  reportDiagnostics() {
    console.log(ansis.bold.cyan('\n🔍 Deep Static Analysis Report (Code Smells & Risks):'));
    let totalIssues = 0;
    for (const [filePath, node] of this.context.projectGraph.entries()) {
      if (node.diagnostics && node.diagnostics.length > 0) {
        const relPath = path.relative(this.context.cwd, filePath);
        console.log(ansis.yellow(`\n📄 ${relPath}:`));
        node.diagnostics.forEach(issue => {
          totalIssues++;
          console.log(ansis.red(`  [${issue.severity.toUpperCase()}] Line ${issue.line}: ${issue.message}`));
          console.log(ansis.dim(`  📖 Learn more: ${issue.link}`));
        });
      }
    }
    if (totalIssues === 0) {
      console.log(ansis.green('  ✅ No critical code smells or runtime risks detected.'));
    } else {
      console.log(ansis.bold.yellow(`\n⚠️  Found ${totalIssues} potential issues. Please review the links above.`));
    }
  }

  async discoverSourceFiles(dir, fileList) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const res = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.entkapp-cache') continue;
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
    const slashify = (p) => {
      let abs = path.resolve(this.context.cwd, p).replace(/\\/g, '/');
      if (/^[a-z]:\//i.test(abs)) {
        abs = abs.charAt(0).toUpperCase() + abs.slice(1);
      }
      return abs;
    };
    
    // =========================================================================
    // 🔄 PHASE 1: SAUBERE KANTEN-VERKNÜPFUNG (Zuerst das Netz spinnen!)
    // =========================================================================
    for (const [filePath, node] of this.context.projectGraph.entries()) {
      const cleanSrcPath = slashify(filePath);

      // Pass A: Link all explicit and dynamic imports safely
      const allDirectImports = new Set([...node.explicitImports, ...node.dynamicImports]);
      for (const specifier of allDirectImports) {
        if (specifier.startsWith('__DYNAMIC_PATTERN__:')) continue;
        if (this.context.verbose) console.log(`[Linker-DEBUG] Attempting to resolve ${specifier} from ${cleanSrcPath}`);
        try {
          const resolvedPath = this.resolver.resolveModulePath(cleanSrcPath, specifier);
          if (this.context.verbose) console.log(`[Linker-DEBUG] Resolved to: ${resolvedPath}`);
          if (resolvedPath && this.context.projectGraph.has(resolvedPath)) {
            const cleanTargetPath = slashify(resolvedPath);
            this.context.projectGraph.get(cleanTargetPath).incomingEdges.add(cleanSrcPath);
            node.outgoingEdges.add(cleanTargetPath);
          }
        } catch (e) {}
      }

      // Pass B: Link named-symbol imports through barrel/re-export chains safely
      for (const specToken of node.importedSymbols) {
        try {
          const delimiterIndex = specToken.lastIndexOf(':');
          if (delimiterIndex === -1) continue;
          const specifier = specToken.slice(0, delimiterIndex);
          const symbol = specToken.slice(delimiterIndex + 1);
          
          const resolvedPath = this.resolver.resolveModulePath(cleanSrcPath, specifier);
          if (!resolvedPath) continue;
          const cleanResolvedPath = slashify(resolvedPath);

          if (symbol === '*') {
            if (this.context.projectGraph.has(cleanResolvedPath)) {
              this.context.projectGraph.get(cleanResolvedPath).incomingEdges.add(cleanSrcPath);
              node.outgoingEdges.add(cleanResolvedPath);
              
              const targetNode = this.context.projectGraph.get(cleanResolvedPath);
              for (const [expName, expMeta] of targetNode.internalExports.entries()) {
                if (expMeta.type === 're-export-all' || expMeta.type === 're-export') {
                  const nestedPath = this.resolver.resolveModulePath(cleanResolvedPath, expMeta.source || expMeta.originalName);
                  if (nestedPath && this.context.projectGraph.has(slashify(nestedPath))) {
                    this.context.projectGraph.get(slashify(nestedPath)).incomingEdges.add(cleanResolvedPath);
                  }
                }
              }
            }
          } else {
            const traceResolution = await this.barrelParser.determineSymbolDeclarationOrigin(cleanResolvedPath, symbol, this.context.projectGraph);
            if (traceResolution && traceResolution.originFile) {
              const cleanOriginFile = slashify(traceResolution.originFile);
              if (this.context.projectGraph.has(cleanOriginFile)) {
                this.context.projectGraph.get(cleanOriginFile).incomingEdges.add(cleanSrcPath);
                node.outgoingEdges.add(cleanOriginFile);
                if (!this.context.importUsageRegistry) this.context.importUsageRegistry = new Set();
                this.context.importUsageRegistry.add(`${cleanOriginFile}:${traceResolution.originSymbol}`);
              }
            }
          }
        } catch (e) {}
      }
    }

    // =========================================================================
    // 🔄 PHASE 2: SELEKTIVE ENTRY POINT IMMUNITÄT (Erst jetzt Heuristik prüfen!)
    // =========================================================================
    const potentialEntryPoints = new Set();
    let hasManifestEntries = false;

    try {
      const pkgPath = path.join(this.context.cwd, 'package.json');
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        const packageEntries = this.workspaceGraph.calculatePackageExportsEntries(pkg, this.context.cwd);
        if (packageEntries.length > 0) {
          hasManifestEntries = true;
          for (const absEntry of packageEntries) {
            potentialEntryPoints.add(slashify(absEntry));
          }
        }
      }
    } catch (e) {}

    if (!hasManifestEntries && this.context.entryPoints.length === 0) {
      const rootIndexFiles = ['src/index.ts', 'src/index.js', 'src/index.tsx', 'src/index.jsx', 'index.ts', 'index.js', 'src/main.ts', 'src/main.js', 'main.ts', 'main.js'];
      for (const indexFile of rootIndexFiles) potentialEntryPoints.add(slashify(indexFile));
    }

    const protectedFiles = new Set();
    for (const [filePath] of this.context.projectGraph.entries()) {
      const fileName = path.basename(filePath);
      if (/\.(test|spec|e2e)\.(ts|js|tsx|jsx)$/.test(fileName) || filePath.includes('/__tests__/') || filePath.includes('/tests/') || /\.(config|rc)\.(ts|js|mjs|cjs)$/.test(fileName)) {
        protectedFiles.add(slashify(filePath));
      }
    }

    // JETZT haben die Kanten verlässliche incomingEdges-Größen!
    for (const [filePath, node] of this.context.projectGraph.entries()) {
      const absPath = slashify(filePath);
      const isProtected = protectedFiles.has(absPath);
      const isManifestEntry = potentialEntryPoints.has(absPath);
      
      const hasNoIncoming = node.incomingEdges.size === 0;
      const hasOutgoing = node.outgoingEdges.size > 0 || node.externalPackageUsage.size > 0 || node.dynamicImports.size > 0;

      let isExplicitlyDeclared = isManifestEntry;
      if (!isExplicitlyDeclared) {
        const cleanAbsPath = absPath.replace(/\.[^/.]+$/, "");
        for (const candidate of potentialEntryPoints) {
          if (candidate.replace(/\.[^/.]+$/, "") === cleanAbsPath) {
            isExplicitlyDeclared = true;
            break;
          }
        }
      }

      const usesItsImports = node.instantiatedIdentifiers && node.instantiatedIdentifiers.size > 0;
      const isLikelyBarrel = !isExplicitlyDeclared && (node.isPureBarrel || node.isBarrel || (!usesItsImports && hasOutgoing));
      
      let finalIsEntry = false;
      if (isProtected || isExplicitlyDeclared) {
        finalIsEntry = true;
      } else if (!hasManifestEntries && hasNoIncoming && hasOutgoing && !isLikelyBarrel) {
        // UPGRADE: Orphan files with imports are NOT entry points by default.
        // They must have side effects (detected in AST pass) to be entries.
        finalIsEntry = node.isEntry; 
      }

      node.isEntry = finalIsEntry;
      if (finalIsEntry && this.context.options.verbose) {
        console.log(`🎯 [ENTRY POINT CONFIRMED] Root secured: ${path.relative(this.context.cwd, absPath)}`);
      }
    }
  }

  async auditManifestSupplyChain(packageJsonPath) {
    try {
      const text = await fs.readFile(packageJsonPath, 'utf8');
      const data = JSON.parse(text);
      this.context.manifestDependencies.set(packageJsonPath, {
        dependencies: Object.keys(data.dependencies || {}),
        devDependencies: Object.keys(data.devDependencies || {}),
        peerDependencies: Object.keys(data.peerDependencies || {}),
        optionalDependencies: Object.keys(data.optionalDependencies || {})
      });
      
      // Also register workspace manifests if not already done
      if (this.context.isWorkspaceEnabled && this.workspaceGraph) {
        for (const [dir, manifest] of this.workspaceGraph.packageManifests.entries()) {
          if (!this.context.manifestDependencies.has(manifest.manifestPath)) {
            this.context.manifestDependencies.set(manifest.manifestPath, {
              dependencies: Object.keys(manifest.dependencies || {}),
              devDependencies: Object.keys(manifest.devDependencies || {}),
              peerDependencies: Object.keys(manifest.peerDependencies || {}),
              optionalDependencies: Object.keys(manifest.optionalDependencies || {})
            });
          }
        }
      }
    } catch (e) {}
  }

  displayConsoleDiagnostics(summary) {
    console.log(ansis.bold.cyan('\n📊 Codebase Optimization Summary Report'));
    console.log(ansis.dim('------------------------------------------------------------'));
    console.log(`⏱️  Analysis Duration: ${summary.executionDuration}`);
    console.log(`📂 Total Files Scanned: ${summary.totalFilesProcessed}`);
    console.log(`💾 Cache Optimization: ${summary.graphCacheOptimization.ratio} hits`);
    console.log(ansis.dim('\n------------------------------------------------------------\n'));
  }

  hydrateNodeFromCache(node, cachedRecord) {
    if (cachedRecord.explicitImports) cachedRecord.explicitImports.forEach(i => node.explicitImports.add(i));
    if (cachedRecord.dynamicImports) cachedRecord.dynamicImports.forEach(i => node.dynamicImports.add(i));
    if (cachedRecord.importedSymbols) cachedRecord.importedSymbols.forEach(s => node.importedSymbols.add(s));
    if (cachedRecord.internalExports) Object.entries(cachedRecord.internalExports).forEach(([k, v]) => node.internalExports.set(k, v));
    if (cachedRecord.symbolSourceLocations) Object.entries(cachedRecord.symbolSourceLocations).forEach(([k, v]) => node.symbolSourceLocations.set(k, v));
    if (cachedRecord.externalPackageUsage) cachedRecord.externalPackageUsage.forEach(p => node.externalPackageUsage.add(p));
    if (cachedRecord.rawStringReferences) cachedRecord.rawStringReferences.forEach(r => node.rawStringReferences.add(r));
    if (cachedRecord.instantiatedIdentifiers) cachedRecord.instantiatedIdentifiers.forEach(id => node.instantiatedIdentifiers.add(id));
    if (cachedRecord.propertyAccessChains) cachedRecord.propertyAccessChains.forEach(c => node.propertyAccessChains.add(c));
    if (cachedRecord.localSuppressedRules) cachedRecord.localSuppressedRules.forEach(r => node.localSuppressedRules.add(r));
    if (cachedRecord.isLibraryEntry !== undefined) node.isLibraryEntry = cachedRecord.isLibraryEntry;
    if (cachedRecord.isEntry !== undefined) node.isEntry = cachedRecord.isEntry;
    if (cachedRecord.calculatedDynamicImports) node.calculatedDynamicImports = cachedRecord.calculatedDynamicImports;
    if (cachedRecord.globImports) node.globImports = cachedRecord.globImports;
  }
}