export class DeadCodeDetector {
  constructor(context) {
    this.context = context;
  }

  detectDeadCode(graph) {
    const deadFiles = [];
    const deadExports = [];
    
    // Find all entry points
    const entryPoints = new Set();
    for (const [filePath, node] of graph.entries()) {
      if (node.isEntry || node.isNextJsRoute || node.isSvelteComponent || node.isAstroPage) {
        entryPoints.add(filePath);
      }
    }

    // Traverse from entry points to find used files
    const usedFiles = new Set();
    const queue = Array.from(entryPoints);
    
    while (queue.length > 0) {
      const current = queue.shift();
      if (!usedFiles.has(current)) {
        usedFiles.add(current);
        const node = graph.get(current);
        if (node && node.outgoingEdges) {
          for (const edge of node.outgoingEdges) {
            queue.push(edge);
          }
        }
      }
    }

    // Identify dead files
    for (const filePath of graph.keys()) {
      if (!usedFiles.has(filePath)) {
        deadFiles.push(filePath);
      }
    }

    // Identify dead exports in used files
    for (const filePath of usedFiles) {
      const node = graph.get(filePath);
      if (!node) continue;
      
      // If it's an entry point, we consider its exports used (unless strictly configured otherwise)
      if (node.isEntry) continue;

      for (const [exportName, exportInfo] of node.internalExports.entries()) {
        if (exportName === '*' || exportName === 'default') continue; // Skip wildcards for now
        
        let isUsed = false;
        // Check incoming edges if they import this specific symbol
        for (const [otherPath, otherNode] of graph.entries()) {
          if (otherNode.outgoingEdges.has(filePath)) {
            if (otherNode.importedSymbols.has(`${filePath}:${exportName}`) || 
                otherNode.importedSymbols.has(`${filePath}:*`)) {
              isUsed = true;
              break;
            }
          }
        }

        if (!isUsed) {
          deadExports.push({ file: filePath, symbol: exportName, line: exportInfo.start });
        }
      }
    }

    return { deadFiles, deadExports };
  }
}
