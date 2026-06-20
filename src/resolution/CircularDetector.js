import path from 'path';

export class CircularDetector {
  constructor(context) {
    this.context = context;
    this.cycles = [];
  }

  detectCycles(projectGraph) {
    const stack = [];
    const onStack = new Set();
    const indices = new Map();
    const lowlink = new Map();
    const sccs = [];
    let index = 0;

    const strongConnect = (v) => {
      indices.set(v, index);
      lowlink.set(v, index);
      index++;
      stack.push(v);
      onStack.add(v);

      const node = projectGraph.get(v);
      if (node && node.outgoingEdges) {
        // Ensure outgoingEdges is treated as an array-like structure
        const edges = Array.isArray(node.outgoingEdges) ? node.outgoingEdges : Array.from(node.outgoingEdges);
        
        for (let i = 0; i < edges.length; i++) {
          const w = edges[i];
          if (!indices.has(w)) {
            strongConnect(w);
            lowlink.set(v, Math.min(lowlink.get(v), lowlink.get(w)));
          } else if (onStack.has(w)) {
            lowlink.set(v, Math.min(lowlink.get(v), indices.get(w)));
          }
        }
      }

      if (lowlink.get(v) === indices.get(v)) {
        const scc = [];
        let w;
        do {
          w = stack.pop();
          onStack.delete(w);
          scc.push(w);
        } while (w !== v);

        if (scc.length > 1) {
          const cycle = scc.slice().reverse();
          cycle.push(cycle[0]);
          sccs.push(cycle);
        } else if (scc.length === 1) {
          const singleNode = projectGraph.get(scc[0]);
          if (singleNode && singleNode.outgoingEdges) {
            const edges = Array.isArray(singleNode.outgoingEdges) ? singleNode.outgoingEdges : Array.from(singleNode.outgoingEdges);
            let hasSelfLoop = false;
            for (let i = 0; i < edges.length; i++) {
              if (edges[i] === scc[0]) {
                hasSelfLoop = true;
                break;
              }
            }
            if (hasSelfLoop) {
              sccs.push([scc[0], scc[0]]);
            }
          }
        }
      }
    };

    const keys = Array.from(projectGraph.keys());
    for (let i = 0; i < keys.length; i++) {
      if (!indices.has(keys[i])) {
        strongConnect(keys[i]);
      }
    }

    this.cycles = sccs;
    return sccs;
  }

  formatCycles() {
    return this.cycles.map(cycle => {
      return cycle.map(p => {
        const relativePath = path.relative(this.context.cwd, p);
        return relativePath.replace(/\\/g, '/');
      }).join(' -> ');
    });
  }
}
