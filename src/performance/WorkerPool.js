import { Worker } from 'worker_threads';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Host CPU Thread-Distribution Pipeline Supervisor
 * Parallelizes compiler parsing logic without triggering filesystem write collisions.
 */
export class WorkerPool {
  constructor(context, maximumConcurrencyLimit = null) {
    this.context = context;
    // Dynamically query host specs; default down to 1 if threading channels are choked
    this.hardwareConcurrencyCoreCount = maximumConcurrencyLimit || os.availableParallelism?.() || os.cpus().length || 2;
    // Resolve worker script path relative to this module
    const __dir = path.dirname(fileURLToPath(import.meta.url));
    this.workerScriptPath = path.resolve(__dir, 'WorkerTaskRunner.js');
  }

  /**
   * Distributes a collection of target filenames across concurrent thread pools.
   * @param {Array<string>} totalFilePathsCollection - Absolute filesystem target pointers array
   * @param {Object} masterEngineInstanceReference - Main RefactoringEngine context loop channel
   */
  async parallelAnalyzeCodebase(totalFilePathsCollection, masterEngineInstanceReference) {
    if (totalFilePathsCollection.length < 12) {
      // Optimization: Do not waste overhead spin-up cycles on small layout codebases
      return false; 
    }

    console.log(`⚡ Spawning native compiler thread pools across [${this.hardwareConcurrencyCoreCount}] CPU cores concurrently...`);

    // Chunk the workload array evenly across the generated worker targets
    const analyticalWorkloadChunks = Array.from(
      { length: this.hardwareConcurrencyCoreCount }, 
      () => []
    );
    
    totalFilePathsCollection.forEach((filePath, fileIndex) => {
      analyticalWorkloadChunks[fileIndex % this.hardwareConcurrencyCoreCount].push(filePath);
    });

    const threadTaskExecutionsList = analyticalWorkloadChunks.map(chunk => {
      if (chunk.length === 0) return Promise.resolve([]);
      return this.executeChunkInsideThread(chunk);
    });

    try {
      const analyticalResultsSubsets = await Promise.all(threadTaskExecutionsList);
      
      // Merge thread structural subsets back into the primary context graph nodes
      analyticalResultsSubsets.flat().forEach(result => {
        if (!result) return;
        // UPGRADE: Normalize filePath before merging to prevent duplicate nodes in the graph
        const normalizedPath = path.resolve(this.context.cwd, result.filePath).replace(/\\/g, '/');
        const node = masterEngineInstanceReference.context.getOrCreateNode(normalizedPath);
        
        result.explicitImports.forEach(i => node.explicitImports.add(i));
        result.dynamicImports.forEach(i => node.dynamicImports.add(i));
        result.importedSymbols.forEach(s => node.importedSymbols.add(s));
        result.rawStringReferences.forEach(r => node.rawStringReferences.add(r));
        result.instantiatedIdentifiers.forEach(i => node.instantiatedIdentifiers.add(i));
        result.propertyAccessChains.forEach(c => node.propertyAccessChains.add(c));
        
        Object.entries(result.internalExports).forEach(([k, v]) => {
          node.internalExports.set(k, v);
        });

        node.securityThreats = result.securityThreats || [];
        if (result.localSuppressedRules) {
          result.localSuppressedRules.forEach(r => node.localSuppressedRules.add(r));
        }
        if (result.externalPackageUsage) {
          result.externalPackageUsage.forEach(p => node.externalPackageUsage.add(p));
        }
        if (result.symbolSourceLocations) {
          Object.entries(result.symbolSourceLocations).forEach(([k, v]) => {
            node.symbolSourceLocations.set(k, v);
          });
        }

        // Fix: Restore missing framework/syntax signals to prevent false positives in large projects
        if (result.jsxComponents) result.jsxComponents.forEach(c => node.jsxComponents.add(c));
        if (result.jsxProps) result.jsxProps.forEach(p => node.jsxProps.add(p));
        if (result.decorators) result.decorators.forEach(d => node.decorators.add(d));
        if (result.isFrameworkContract) node.isFrameworkContract = true;
        if (result.isEntry) node.isEntry = true;
        if (result.isLibraryEntry) node.isLibraryEntry = true;
        if (result.isFrameworkComponent) node.isFrameworkComponent = true;
        if (result.calculatedDynamicImports) {
          if (!node.calculatedDynamicImports) node.calculatedDynamicImports = [];
          result.calculatedDynamicImports.forEach(i => node.calculatedDynamicImports.push(i));
        }
        if (result.globImports) {
          if (!node.globImports) node.globImports = [];
          result.globImports.forEach(i => node.globImports.push(i));
        }
      });

      return true;
    } catch (poolThreadFault) {
      if (this.context.verbose) {
        console.warn(`⚠️  ThreadPool runtime fault: ${poolThreadFault.message}. Falling back to main-thread processing.`);
      }
      return false; // Safely fall back to single-thread synchronous recovery processing
    }
  }

  executeChunkInsideThread(fileChunkSubset) {
    return new Promise((resolve, reject) => {
      const workerInstance = new Worker(this.workerScriptPath, { type: 'module',
        workerData: { 
          files: fileChunkSubset, 
          contextOptions: { 
            verbose: this.context.verbose,
            cwd: this.context.cwd
          } 
        }
      });

      workerInstance.on('message', (payload) => resolve(payload));
      workerInstance.on('error', (err) => reject(err));
      workerInstance.on('exit', (exitCode) => {
        if (exitCode !== 0) reject(new Error(`Worker thread collapsed unexpectedly with code: ${exitCode}`));
      });
    });
  }
}
