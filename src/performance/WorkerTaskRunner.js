import { parentPort, workerData } from 'worker_threads';
import fs from 'fs/promises';
import { ASTAnalyzer } from '../ast/ASTAnalyzer.js';
import { OxcAnalyzer } from '../analyzers/OxcAnalyzer.js';

/**
 * Worker Thread Execution Script
 * Handles parallel AST parsing for a chunk of files and returns serialized results.
 */
async function runTask() {
  const { files, contextOptions } = workerData;
  const results = [];

  // Create a minimal context for analyzers
  const mockContext = {
    verbose: contextOptions.verbose,
    projectGraph: new Map(),
    getOrCreateNode: (path) => ({
      filePath: path,
      explicitImports: new Set(),
      dynamicImports: new Set(),
      importedSymbols: new Set(),
      rawStringReferences: new Set(),
      instantiatedIdentifiers: new Set(),
      propertyAccessChains: new Set(),
      internalExports: new Map(),
      securityThreats: [],
      localSuppressedRules: new Set(),
      externalPackageUsage: new Set(),
      symbolSourceLocations: new Map(),
      jsxComponents: new Set(),
      jsxProps: new Set(),
      decorators: new Set(),
      isFrameworkContract: false
    })
  };

  const astAnalyzer = new ASTAnalyzer(mockContext);
  const oxcAnalyzer = new OxcAnalyzer(mockContext);
  await oxcAnalyzer.init();

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const node = mockContext.getOrCreateNode(filePath);

      // Use OXC if available, fallback to TS AST
      let success = false;
      if (oxcAnalyzer.isAvailable) {
        success = await oxcAnalyzer.parseFile(filePath, content, node);
      }
      
      if (!success) {
        await astAnalyzer.parseFile(filePath, content, node);
      }

      // Serialize the node data for transfer back to main thread
      results.push({
        filePath: node.filePath,
        explicitImports: Array.from(node.explicitImports),
        dynamicImports: Array.from(node.dynamicImports),
        importedSymbols: Array.from(node.importedSymbols),
        rawStringReferences: Array.from(node.rawStringReferences),
        instantiatedIdentifiers: Array.from(node.instantiatedIdentifiers),
        propertyAccessChains: Array.from(node.propertyAccessChains),
        internalExports: Object.fromEntries(node.internalExports),
        securityThreats: node.securityThreats,
        localSuppressedRules: Array.from(node.localSuppressedRules),
        externalPackageUsage: Array.from(node.externalPackageUsage),
        symbolSourceLocations: Object.fromEntries(node.symbolSourceLocations),
        jsxComponents: Array.from(node.jsxComponents),
        jsxProps: Array.from(node.jsxProps),
        decorators: Array.from(node.decorators),
        isFrameworkContract: node.isFrameworkContract
      });
    } catch (err) {
      if (contextOptions.verbose) {
        console.error(`[Worker] Failed to parse ${filePath}: ${err.message}`);
      }
      results.push(null);
    }
  }

  parentPort.postMessage(results);
}

runTask().catch(err => {
  console.error(`[Worker Critical Fault] ${err.stack}`);
  process.exit(1);
});
