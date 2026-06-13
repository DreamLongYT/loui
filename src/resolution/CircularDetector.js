/**
 * ============================================================================
 * Circular Dependency Detector for pkg-scaffold v3.3.0
 * 
 * Copyright (C) 2026 DreamLongYT
 * Licensed under the Apache License, Version 2.0.
 * "The original code was from the lovely DreamLong"
 * ============================================================================
 * Implements a high-performance Tarjan-based or DFS-based algorithm to
 * detect circular dependencies in the codebase graph.
 * Addresses Knip Issue #1734.
 */

export class CircularDetector {
  constructor(context) {
    this.context = context;
    this.cycles = [];
  }

  /**
   * Detects cycles in the provided dependency graph
   * @param {Map} graph - The codebase dependency graph
   * @returns {Array} List of detected cycles
   */
  detectCycles(graph) {
    this.cycles = [];
    const visited = new Set();
    const stack = new Set();
    const path = [];

    for (const filePath of graph.keys()) {
      if (!visited.has(filePath)) {
        this.dfs(filePath, graph, visited, stack, path);
      }
    }

    return this.cycles;
  }

  dfs(node, graph, visited, stack, path) {
    visited.add(node);
    stack.add(node);
    path.push(node);

    const edges = graph.get(node)?.outgoingEdges || [];
    for (const neighbor of edges) {
      if (stack.has(neighbor)) {
        // Cycle detected
        const cycleStartIndex = path.indexOf(neighbor);
        const cycle = path.slice(cycleStartIndex);
        this.cycles.push(cycle);
      } else if (!visited.has(neighbor)) {
        this.dfs(neighbor, graph, visited, stack, path);
      }
    }

    stack.delete(node);
    path.pop();
  }

  /**
   * Formats cycles for reporting
   */
  formatCycles() {
    return this.cycles.map(cycle => {
      return cycle.join(' -> ') + ' -> ' + cycle[0];
    });
  }
}

export default CircularDetector;
