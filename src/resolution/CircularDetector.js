import path from 'path';

export class CircularDetector {
  constructor(context) {
    this.context = context;
    this.cycles = [];
  }

  detectCycles(projectGraph, context) {
    const visited = new Set();
    const stack = new Set();
    const cycles = [];

    const traverse = (filePath, currentPath) => {
      visited.add(filePath);
      stack.add(filePath);
      currentPath.push(filePath);

      const node = projectGraph.get(filePath);
      if (node && node.outgoingEdges) {
        for (const neighbor of node.outgoingEdges) {
          if (stack.has(neighbor)) {
            const cycleStartIndex = currentPath.indexOf(neighbor);
            const cycle = currentPath.slice(cycleStartIndex);
            cycle.push(neighbor);
            cycles.push(cycle);
          } else if (!visited.has(neighbor)) {
            traverse(neighbor, currentPath);
          }
        }
      }

      stack.delete(filePath);
      currentPath.pop();
    };

    for (const filePath of projectGraph.keys()) {
      if (!visited.has(filePath)) {
        traverse(filePath, []);
      }
    }

    this.cycles = cycles;
    return cycles;
  }

  formatCycles() {
    return this.cycles.map(cycle => {
      return cycle.map(p => path.relative(this.context.cwd, p).replace(/\\/g, '/')).join(' -> ');
    });
  }
}
