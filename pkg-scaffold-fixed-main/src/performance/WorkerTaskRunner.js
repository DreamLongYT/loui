import { parentPort, workerData } from 'worker_threads';
import { ASTAnalyzer } from '../ast/ASTAnalyzer.js';
import ts from 'typescript';
import fs from 'fs';

/**
 * Isolated Worker Thread Target Pipeline Task Loop Execution Instance
 */
async function processThreadChunks() {
  const { files, contextOptions } = workerData;
  const partialGraphPayloadResults = [];
  
  // Construct a lightweight standalone instance of our analyzer core inside the worker
  const standaloneAnalyzer = new ASTAnalyzer({ verbose: contextOptions.verbose });

  for (const file of files) {
    if (file.endsWith('package.json')) continue;

    try {
      const text = fs.readFileSync(file, 'utf8');
      
      // Build a minimal virtual reference mapping node to capture features
      const mockNode = {
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
        calculatedDynamicImports: [],
        jsxComponents: new Set(),
        jsxProps: new Set(),
        decorators: new Set()
      };

      // Use the public getScriptKind() method added to ASTAnalyzer
      const scriptKind = standaloneAnalyzer.getScriptKind(file);

      const sourceFile = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
        scriptKind
      );

      standaloneAnalyzer.extractTopLevelJSDocSuppreessions(sourceFile, mockNode);
      // Use the walkNode() alias that maps to walkAST() with the correct argument order
      standaloneAnalyzer.walkNode(sourceFile, sourceFile, mockNode);

      partialGraphPayloadResults.push({
        filePath: file,
        explicitImports: Array.from(mockNode.explicitImports),
        dynamicImports: Array.from(mockNode.dynamicImports),
        importedSymbols: Array.from(mockNode.importedSymbols),
        rawStringReferences: Array.from(mockNode.rawStringReferences),
        instantiatedIdentifiers: Array.from(mockNode.instantiatedIdentifiers),
        propertyAccessChains: Array.from(mockNode.propertyAccessChains),
        internalExports: Object.fromEntries(mockNode.internalExports),
        securityThreats: mockNode.securityThreats,
        localSuppressedRules: Array.from(mockNode.localSuppressedRules),
        externalPackageUsage: Array.from(mockNode.externalPackageUsage),
        symbolSourceLocations: Object.fromEntries(mockNode.symbolSourceLocations),
        calculatedDynamicImports: mockNode.calculatedDynamicImports
      });
    } catch (err) {
      // Log parse errors in verbose mode so they are not silently swallowed
      if (contextOptions.verbose) {
        console.warn(`[Worker] Failed to parse ${file}: ${err.message}`);
      }
    }
  }

  // Stream compiled metadata structures directly back to the primary supervisor pool thread channel
  parentPort.postMessage(partialGraphPayloadResults);
}

processThreadChunks();
