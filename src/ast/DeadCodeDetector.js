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
      // NIGHTMARE FIX: node.isEntry must be respected, and also check for library entries
      if (node.isEntry || node.isLibraryEntry || node.isNextJsRoute || node.isSvelteComponent || node.isAstroPage) {
        entryPoints.add(filePath);
      }
    }

    // UPGRADE 5: Cycle-tolerant Graph Traversal.
    // We use a robust recursive traversal with a visited set to handle cycles.
    const usedFiles = new Set();
    const visited = new Set();

    const traverse = (filePath) => {
      if (visited.has(filePath)) return;
      visited.add(filePath);
      usedFiles.add(filePath);

      const node = graph.get(filePath);
      if (node && node.outgoingEdges) {
        for (const edge of node.outgoingEdges) {
          traverse(edge);
        }
      }
    };

    for (const entry of entryPoints) {
      traverse(entry);
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
      // NIGHTMARE FIX: Even in entry points, we might want to find unused exports if they are not re-exported
      if (node.isEntry && !node.isLibraryEntry) {
          // If it's a main entry but not a library, its exports are usually unused 
          // unless it's a barrel file. Let's proceed to check usage.
      } else if (node.isLibraryEntry) {
          continue;
      }

      for (const [exportName, exportInfo] of node.internalExports.entries()) {
        if (exportName === '*' || exportName === 'default') continue; // Skip wildcards for now
        
        let isUsed = false;
        // Check ALL nodes in the graph for usage of this symbol, not just those with edges
        // (Handles cases where edges might be missing or complex)
        for (const [otherPath, otherNode] of graph.entries()) {
            if (otherNode.importedSymbols.has(`${filePath}:${exportName}`) || 
                otherNode.importedSymbols.has(`${filePath}:*`)) {
              isUsed = true;
              break;
            }
        }

        // Additional check for library entries or index files
        // NIGHTMARE FIX: Don't blindly protect 'index' files if they are not real entries
        if (!isUsed && (node.isLibraryEntry)) {
          isUsed = true;
        }

        if (!isUsed) {
          deadExports.push({ file: filePath, symbol: exportName, line: exportInfo.start });
        }
      }
    }

    return { deadFiles, deadExports };
  }
}
