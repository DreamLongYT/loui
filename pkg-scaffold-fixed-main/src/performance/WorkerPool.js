import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import os from 'os';
import path from 'path';

/**
 * Host CPU Thread-Distribution Pipeline Supervisor
 * Parallelizes compiler parsing logic without triggering filesystem write collisions.
 */
export class WorkerPool {
  constructor(context, maximumConcurrencyLimit = null) {
    this.context = context;
    // Dynamically query host specs; default down to 1 if threading channels are choked
    this.hardwareConcurrencyCoreCount = maximumConcurrencyLimit || os.availableParallelism?.() || os.cpus().length || 2;
    this.workerScriptPath = path.resolve(path.dirname(import.meta.url.replace('file://', '')), 'WorkerTaskRunner.js');
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
        const node = masterEngineInstanceReference.context.createNode(result.filePath);
        
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
      const workerInstance = new Worker(this.workerScriptPath, {
        workerData: { files: fileChunkSubset, contextOptions: { verbose: this.context.verbose } }
      });

      workerInstance.on('message', (payload) => resolve(payload));
      workerInstance.on('error', (err) => reject(err));
      workerInstance.on('exit', (exitCode) => {
        if (exitCode !== 0) reject(new Error(`Worker thread collapsed unexpectedly with code: ${exitCode}`));
      });
    });
  }
}
