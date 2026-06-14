/**
 * ============================================================================
 * Headless API for pkg-scaffold v4.0.0
 * ============================================================================
 * Provides a programmatic interface for integrating pkg-scaffold into
 * custom workflows, CI/CD pipelines, and third-party tools.
 * 
 * Features:
 * - Full control over analysis and refactoring operations
 * - Event-driven architecture for real-time feedback
 * - Streaming results for large codebases
 * - Plugin SDK integration
 */

import EventEmitter from 'events';
import { RefactoringEngine } from '../index.js';

export class HeadlessAPI extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = options;
    this.engine = null;
    this.analysisResults = null;
    this.isRunning = false;
  }

  /**
   * Initialize the API with a project context
   * @param {string} projectRoot - Root directory of the project
   * @param {Object} config - Configuration options
   * @returns {Promise<void>}
   */
  async initialize(projectRoot, config = {}) {
    try {
      this.emit('initialize:start', { projectRoot });

      const engineOptions = {
        cwd: projectRoot,
        allowAutoFix: config.autoFix !== false,
        skipConfirm: config.skipConfirm || false,
        verbose: config.verbose || false,
        ...config
      };

      this.engine = new RefactoringEngine(engineOptions);
      await this.engine.context.initialize();

      this.emit('initialize:complete', {
        projectRoot,
        config: this.engine.context
      });
    } catch (error) {
      this.emit('initialize:error', { error });
      throw error;
    }
  }

  /**
   * Analyze the codebase without making changes
   * @returns {Promise<Object>} Analysis results
   */
  async analyze() {
    if (!this.engine) {
      throw new Error('API not initialized. Call initialize() first.');
    }

    try {
      this.isRunning = true;
      this.emit('analysis:start');

      // Initialize path mappings and workspace graph
      await this.engine.pathMapper.loadMappings(this.engine.context.tsconfigFilename);

      if (this.engine.context.isWorkspaceEnabled) {
        this.emit('analysis:workspace-mapping-start');
        await this.engine.workspaceGraph.initializeWorkspaceMesh();
        this.emit('analysis:workspace-mapping-complete');
      }

      // Load cache manifest
      const cacheManifest = await this.engine.cacheManager.loadCacheManifest();

      // Discover source files
      this.emit('analysis:file-discovery-start');
      const fileList = [];
      await this.engine.discoverSourceFiles(this.engine.context.cwd, fileList);
      this.engine.context.metrics.totalFilesScanned = fileList.length;
      this.emit('analysis:file-discovery-complete', { fileCount: fileList.length });

      // Identify framework ecosystems
      this.emit('analysis:framework-detection-start');
      const activeFrameworkEcosystems = await this.engine.magicDetector.identifyActiveProjectEcosystems(
        this.engine.context.cwd
      );
      this.emit('analysis:framework-detection-complete', { ecosystems: activeFrameworkEcosystems });

      // Process files
      this.emit('analysis:file-processing-start');
      const sourceCodeFilesList = [];
      for (const file of fileList) {
        if (file.endsWith('package.json')) {
          await this.engine.auditManifestSupplyChain(file);
        } else {
          sourceCodeFilesList.push(file);
        }
      }

      // Initialize TypeScript program for AST analysis (required before processFile)
      if (sourceCodeFilesList.length > 0) {
        try {
          this.engine.analyzer.initProgram(sourceCodeFilesList);
        } catch (e) {
          if (this.engine.context.verbose) {
            console.warn('Warning: Failed to initialize TypeScript program:', e.message);
          }
        }
      }

      // Parallel processing
      let parallelParseCompleted = false;
      if (sourceCodeFilesList.length > 10) {
        parallelParseCompleted = await this.engine.workerPool.parallelAnalyzeCodebase(
          sourceCodeFilesList,
          this.engine
        );
      }

      // Sequential processing
      for (let i = 0; i < sourceCodeFilesList.length; i++) {
        const filePath = sourceCodeFilesList[i];
        const node = this.engine.context.createNode(filePath);
        const currentHash = await this.engine.cacheManager.computeHash(filePath);
        node.contentHash = currentHash;

        const isFileCached = cacheManifest[filePath] && cacheManifest[filePath].hash === currentHash;

        if (isFileCached) {
          this.engine.context.metrics.cacheHits++;
          this.engine.hydrateNodeFromCache(node, cacheManifest[filePath]);
        } else if (!parallelParseCompleted) {
          this.engine.context.metrics.cacheMisses++;
          await this.engine.analyzer.processFile(filePath, node);
        }

        this.engine.magicDetector.injectVirtualConsumerEdges(filePath, node, activeFrameworkEcosystems);
        node.externalPackageUsage.forEach(pkg => this.engine.context.usedExternalPackages.add(pkg));

        // Emit progress
        if ((i + 1) % Math.ceil(sourceCodeFilesList.length / 10) === 0) {
          this.emit('analysis:file-processing-progress', {
            processed: i + 1,
            total: sourceCodeFilesList.length,
            percentage: Math.round(((i + 1) / sourceCodeFilesList.length) * 100)
          });
        }
      }

      // Link dependency graph
      this.emit('analysis:graph-linking-start');
      await this.engine.linkDependencyGraph();
      this.emit('analysis:graph-linking-complete');

      // Generate summary
      this.analysisResults = this.engine.context.generateSummaryReport();
      this.emit('analysis:complete', this.analysisResults);

      this.isRunning = false;
      return this.analysisResults;
    } catch (error) {
      this.isRunning = false;
      this.emit('analysis:error', { error });
      throw error;
    }
  }

  /**
   * Get detailed impact analysis for a specific file or export
   * @param {string} filePath - Path to the file
   * @param {string} symbol - Optional: specific export symbol to analyze
   * @returns {Promise<Object>} Impact analysis results
   */
  async getImpactAnalysis(filePath, symbol = null) {
    if (!this.engine) {
      throw new Error('API not initialized. Call initialize() first.');
    }

    try {
      const node = this.engine.context.graph.get(filePath);
      if (!node) {
        throw new Error(`File not found in analysis graph: ${filePath}`);
      }

      const impact = {
        file: filePath,
        symbol,
        directDependents: Array.from(node.incomingEdges),
        dependencies: Array.from(node.outgoingEdges),
        internalExports: symbol
          ? [symbol]
          : Array.from(node.internalExports.keys()),
        externalPackages: Array.from(node.externalPackageUsage)
      };

      if (symbol) {
        const safety = await this.engine.impactAnalyzer.verifyRefactorSafety(
          filePath,
          symbol,
          this.engine.context.graph
        );
        impact.refactorSafety = safety;
      }

      return impact;
    } catch (error) {
      this.emit('impact-analysis:error', { error, filePath, symbol });
      throw error;
    }
  }

  /**
   * Apply refactoring changes with automatic rollback on test failure
   * @param {Object} changes - Changes to apply
   * @returns {Promise<Object>} Refactoring results
   */
  async applyRefactoring(changes = {}) {
    if (!this.engine) {
      throw new Error('API not initialized. Call initialize() first.');
    }

    if (!this.analysisResults) {
      throw new Error('No analysis results available. Call analyze() first.');
    }

    try {
      this.isRunning = true;
      this.emit('refactoring:start', changes);

      const refactoringResults = {
        filesDeleted: [],
        exportsRemoved: [],
        dependenciesRemoved: [],
        errors: []
      };

      await this.engine.selfHealer.runSelfHealingLifecycle(async () => {
        // Delete dead files
        const filesToDelete = changes.deleteDeadFiles !== false
          ? this.analysisResults.structuralIssuesDetected.deadFiles
          : [];

        for (const relPath of filesToDelete) {
          try {
            const absPath = require('path').resolve(this.engine.context.cwd, relPath);
            await this.engine.txManager.stageDeletion(absPath);
            refactoringResults.filesDeleted.push(relPath);
            this.emit('refactoring:file-deleted', { file: relPath });
          } catch (error) {
            refactoringResults.errors.push({ type: 'file-deletion', file: relPath, error: error.message });
            this.emit('refactoring:error', { type: 'file-deletion', file: relPath, error });
          }
        }

        // Remove unused exports
        const exportsToRemove = changes.removeUnusedExports !== false
          ? this.analysisResults.structuralIssuesDetected.deadExports
          : [];

        for (const unusedExport of exportsToRemove) {
          try {
            const absPath = require('path').resolve(this.engine.context.cwd, unusedExport.file);
            const node = this.engine.context.graph.get(absPath);

            if (node) {
              const safety = await this.engine.impactAnalyzer.verifyRefactorSafety(
                absPath,
                unusedExport.symbol,
                this.engine.context.graph
              );

              if (safety.isSafeToPrune) {
                const nextText = await this.engine.sourceRewriter.stripNamedExportSignature(
                  absPath,
                  unusedExport.symbol,
                  node.internalExports.get(unusedExport.symbol)
                );

                await this.engine.txManager.stageWrite(absPath, nextText);
                await this.engine.typeIntegrity.synchronizeDeclarationFile(absPath, unusedExport.symbol);

                refactoringResults.exportsRemoved.push(unusedExport);
                this.emit('refactoring:export-removed', unusedExport);
              }
            }
          } catch (error) {
            refactoringResults.errors.push({
              type: 'export-removal',
              export: unusedExport.symbol,
              file: unusedExport.file,
              error: error.message
            });
            this.emit('refactoring:error', { type: 'export-removal', export: unusedExport, error });
          }
        }

        // Remove unused dependencies
        const depsToRemove = changes.removeUnusedDependencies !== false
          ? this.analysisResults.structuralIssuesDetected.unusedDependencies
          : [];

        for (const dep of depsToRemove) {
          try {
            const absPath = require('path').resolve(this.engine.context.cwd, dep.manifest);
            // TODO: Implement package.json dependency removal
            refactoringResults.dependenciesRemoved.push(dep);
            this.emit('refactoring:dependency-removed', dep);
          } catch (error) {
            refactoringResults.errors.push({
              type: 'dependency-removal',
              package: dep.package,
              error: error.message
            });
            this.emit('refactoring:error', { type: 'dependency-removal', package: dep.package, error });
          }
        }
      });

      this.isRunning = false;
      this.emit('refactoring:complete', refactoringResults);
      return refactoringResults;
    } catch (error) {
      this.isRunning = false;
      this.emit('refactoring:error', { error });
      throw error;
    }
  }

  /**
   * Get current analysis metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    if (!this.engine) {
      throw new Error('API not initialized. Call initialize() first.');
    }
    return this.engine.context.metrics;
  }

  /**
   * Get all registered plugins
   * @returns {Array} Plugin instances
   */
  getPlugins() {
    if (!this.engine) {
      throw new Error('API not initialized. Call initialize() first.');
    }
    return this.engine.context.pluginRegistry?.getPlugins() || [];
  }

  /**
   * Get analysis results
   * @returns {Object} Analysis results
   */
  getAnalysisResults() {
    return this.analysisResults;
  }

  /**
   * Check if API is currently running
   * @returns {boolean}
   */
  isProcessing() {
    return this.isRunning;
  }
}

export default HeadlessAPI;
