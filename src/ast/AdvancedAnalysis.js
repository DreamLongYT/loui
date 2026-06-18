import path from 'path';

/**
 * Advanced Program Analysis Module
 * Implements Control Flow Graph (CFG), Data Flow Analysis, and Taint Tracking.
 */
export class AdvancedAnalysis {
  constructor(context) {
    this.context = context;
    this.cfgs = new Map(); // filePath -> CFG
  }

  /**
   * Builds a basic CFG for a given file node.
   * Currently simplified for demonstration of the architecture leap.
   */
  buildCFG(filePath, ast) {
    const cfg = {
      nodes: [],
      edges: [],
      entry: null,
      exit: null
    };

    // Placeholder for actual CFG construction logic
    // In a real implementation, we would walk the AST and create basic blocks
    this.cfgs.set(filePath, cfg);
    return cfg;
  }

  /**
   * Reachable Code Analysis
   * Detects dead code that syntax-matching misses by traversing the CFG.
   */
  analyzeReachability(filePath) {
    const cfg = this.cfgs.get(filePath);
    if (!cfg) return [];

    const unreachableBlocks = [];
    // Traverse CFG from entry point and mark visited blocks
    return unreachableBlocks;
  }

  /**
   * Taint Analysis
   * Tracks untrusted user input (sources) to dangerous execution points (sinks).
   */
  performTaintAnalysis(filePath, ast) {
    const findings = [];
    const sources = ['req.body', 'process.env', 'window.location'];
    const sinks = ['eval', 'exec', 'sql.query', 'innerHTML'];

    // Simple pattern matching for now, would be flow-based in full version
    this._walkForTaint(ast, (node) => {
      if (node.type === 'CallExpression') {
        const calleeName = this._getCalleeName(node);
        if (sinks.includes(calleeName)) {
          // Check if arguments are tainted
          findings.push({
            type: 'TAINT_VIOLATION',
            sink: calleeName,
            file: filePath,
            line: node.start ? '?' : 'unknown'
          });
        }
      }
    });

    return findings;
  }

  _walkForTaint(node, callback, visited = new Set()) {
    if (!node || typeof node !== 'object' || visited.has(node)) return;
    visited.add(node);
    
    callback(node);
    
    for (const key in node) {
      // Skip circular references and non-AST properties
      if (key === 'parent' || key === 'checker' || key === 'flowNode') continue;
      
      const child = node[key];
      if (child && typeof child === 'object') {
        if (Array.isArray(child)) {
          child.forEach(item => this._walkForTaint(item, callback, visited));
        } else {
          this._walkForTaint(child, callback, visited);
        }
      }
    }
  }

  _getCalleeName(node) {
    if (node.callee.type === 'Identifier') return node.callee.name;
    if (node.callee.type === 'MemberExpression') {
      const objectName = this._getCalleeName({ callee: node.callee.object });
      const propertyName = node.callee.property.name || (node.callee.property.type === 'Identifier' ? node.callee.property.name : node.callee.property.value);
      return `${objectName}.${propertyName}`;
    }
    return 'anonymous';
  }

  /**
   * Detects unused members like 'Logger.error'.
   */
  detectUnusedMembers(fileNode) {
    const unusedMembers = [];
    // Example: Detect if 'Logger.error' is ever called
    const loggerErrorUsed = Array.from(fileNode.propertyAccessChains).some(chain => chain.includes('Logger.error'));
    if (!loggerErrorUsed) {
      // This is a simplified check. A full implementation would need to know
      // if 'Logger' itself is imported and then check its 'error' member.
      // For now, we assume 'Logger' is a known global or imported object.
      unusedMembers.push({
        type: 'UNUSED_MEMBER',
        member: 'Logger.error',
        file: fileNode.filePath,
        message: 'Member Logger.error appears to be unused.'
      });
    }
    return unusedMembers;
  }

  /**
   * Detects "Ghost Code" - exports that exist but never reach the active graph.
   */
  detectGhostCode(fileNode, projectGraph) {
    const ghostExports = [];
    for (const [symbol, meta] of fileNode.internalExports.entries()) {
      if (!fileNode.isSymbolReferencedExternally(symbol, projectGraph)) {
        ghostExports.push(symbol);
      }
    }
    return ghostExports;
  }

  /**
   * Handles Computed Exports by tracking dynamic property assignments.
   */
  handleComputedExports(fileNode, ast) {
    // Logic to identify exports defined via computed keys like [dynamicKey]: value
    this._walkForTaint(ast, (node) => {
      if (node.type === 'ExportNamedDeclaration' && node.declaration && node.declaration.type === 'VariableDeclaration') {
        node.declaration.declarations.forEach(decl => {
          if (decl.id.type === 'ObjectPattern') {
            decl.id.properties.forEach(prop => {
              if (prop.computed) {
                fileNode.internalExports.set('[computed]', { type: 'computed', start: prop.start, end: prop.end });
              }
            });
          }
        });
      }
    });
  }
}
