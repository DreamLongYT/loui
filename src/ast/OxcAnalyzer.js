import path from 'path';

/**
 * Production-Grade Native Rust AST Parser Bridge (OXC)
 * Enterprise Edition: Enhanced with Call Graph support, Data Flow hints, and Symbol Tracking.
 */
export class OxcAnalyzer {
  constructor(context) {
    this.context = context;
    this.oxc = null;
    this.isAvailable = false;
  }

  async init() {
    // FIX: Always mark oxc-parser as used if this analyzer is even instantiated
    if (this.context.usedExternalPackages) this.context.usedExternalPackages.add("oxc-parser");
    if (this.isAvailable) return true;
    try {
      const oxc = await import("oxc-parser");
      this.oxc = oxc;
      this.isAvailable = true;
      return true;
    } catch (e) {
      try {
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        this.oxc = require("oxc-parser");
        this.isAvailable = true;
        return true;
      } catch (err) {
        this.isAvailable = false;
        return false;
      }
    }
  }

  async parseFile(filePath, content, fileNode) {
    if (!this.isAvailable) {
      const initialized = await this.init();
      if (!initialized) return false;
    }

    try {
      const cleanContent = content.startsWith('\uFEFF') ? content.slice(1) : content;
      const normalizedPath = filePath.replace(/\\/g, '/');
      
      let result;
      try {
        result = this.oxc.parseSync(cleanContent, {
          sourceType: "module",
          sourceFilename: normalizedPath,
          lang: "typescript"
        });
      } catch (e) {
        try {
          result = this.oxc.parseSync(cleanContent, normalizedPath);
        } catch (innerErr) {
          return false;
        }
      }

      let parsedResult;
      try {
        parsedResult = typeof result === 'string' ? JSON.parse(result) : JSON.parse(JSON.stringify(result));
      } catch (err) {
        if (result && typeof result === 'object') {
          parsedResult = result;
        } else {
          return false;
        }
      }

      let programRoot = null;
      if (parsedResult && typeof parsedResult === 'object') {
        if (parsedResult.program) programRoot = parsedResult.program;
        else if (parsedResult.ast) programRoot = parsedResult.ast;
        else if (parsedResult.type === 'Program' || parsedResult.body) programRoot = parsedResult;
      }

      if (!programRoot || !programRoot.body) {
        return false;
      }

      fileNode.ast = programRoot; 
      fileNode.symbolTable = new Map(); // Local scope tracking
      
      // Pass 1: Structural Analysis (Definitions, Imports, Exports)
      this.walkOxcAst(programRoot, fileNode, cleanContent, 1);
      
      // Pass 2: Logical Analysis (References, Call Sites, Property Access)
      this.walkOxcAst(programRoot, fileNode, cleanContent, 2);
      
      const lines = cleanContent.split('\n');
      const getLineCol = (pos) => {
        let count = 0;
        for (let i = 0; i < lines.length; i++) {
          if (count + lines[i].length + 1 > pos) {
            return { line: i + 1, column: pos - count + 1 };
          }
          count += lines[i].length + 1;
        }
        return { line: 1, column: 1 };
      };

      for (const [name, meta] of fileNode.internalExports.entries()) {
        if (meta.start !== undefined) {
          fileNode.symbolSourceLocations.set(name, getLineCol(meta.start));
        }
        if (meta.members) {
            meta.members.forEach(member => {
                if (member.start !== undefined) {
                    fileNode.symbolSourceLocations.set(`${name}.${member.name}`, getLineCol(member.start));
                }
            });
        }
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  walkOxcAst(node, fileNode, content, pass) {
    if (!node) return;

    if (pass === 1) {
        switch (node.type) {
          case "ImportDeclaration":
            this.handleImportDeclaration(node, fileNode);
            break;
          case "ImportExpression":
            this.handleImportExpression(node, fileNode);
            break;
          case "ExportNamedDeclaration":
          case "ExportDefaultDeclaration":
          case "ExportAllDeclaration":
            this.handleExportDeclaration(node, fileNode, content);
            break;
          case "ClassDeclaration":
          case "ClassExpression":
            this.handleClassDeclaration(node, fileNode);
            break;
          case "FunctionDeclaration":
            if (node.id) fileNode.symbolTable.set(node.id.name, { type: 'function', start: node.start });
            break;
          case "VariableDeclaration":
            node.declarations.forEach(d => {
                this._extractNamesFromPattern(d.id, name => {
                    fileNode.symbolTable.set(name, { type: 'variable', start: d.start });
                });
            });
            break;
          case "AssignmentExpression":
            // UPGRADE: CommonJS module.exports / exports detection
            this.handleAssignmentExpression(node, fileNode);
            break;
          case "CallExpression":
            // UPGRADE: CommonJS require() detection in Pass 1
            this.handleCallExpressionPass1(node, fileNode);
            break;
        }
    } else if (pass === 2) {
        switch (node.type) {
          case "CallExpression":
            // UPGRADE: Enhanced CallExpression handling for both ESM and CommonJS
            this.handleCallExpression(node, fileNode);
            // Detect eval() usage
            if (node.callee.type === "Identifier" && node.callee.name === "eval") {
              fileNode.hasEvalUsage = true;
            }
            break;
          case "MemberExpression":
            this.handleMemberExpression(node, fileNode);
            break;
          case "JSXElement":
          case "JSXFragment":
            this.handleJsxElement(node, fileNode);
            break;
          case "Decorator":
            this.handleDecorator(node, fileNode);
            break;
          case "StringLiteral":
            fileNode.rawStringReferences.add(node.value);
            break;
          case "Identifier":
            // Track all identifier usages for fuzzy matching
            if (!this._isDefinition(node)) {
                fileNode.instantiatedIdentifiers.add(node.name);
            }
            break;
        }
    }

    for (const key in node) {
      if (node[key] && typeof node[key] === "object") {
        if (Array.isArray(node[key])) {
          node[key].forEach((child) => this.walkOxcAst(child, fileNode, content, pass));
        } else {
          this.walkOxcAst(node[key], fileNode, content, pass);
        }
      }
    }
  }

  _isDefinition(node) {
      // Helper to distinguish between usage and definition of an identifier
      const parent = node.parent; // Note: OXC might not provide parent pointers by default in JSON
      return false; // Conservative: treat everything as potential usage in pass 2
  }

  handleImportDeclaration(node, fileNode) {
    if (!node.source || typeof node.source.value !== 'string') return;
    const specifier = node.source.value;
    fileNode.explicitImports.add(specifier);

    if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
      fileNode.externalPackageUsage.add(this._extractPackageName(specifier));
    }

    if (node.specifiers) {
      node.specifiers.forEach((spec) => {
        if (spec.type === "ImportSpecifier") {
          const importedName = spec.imported.name || (spec.imported.type === "Identifier" ? spec.imported.name : spec.imported.value);
          fileNode.importedSymbols.add(`${specifier}:${importedName}`);
          fileNode.symbolTable.set(spec.local.name, { type: 'import', source: specifier, originalName: importedName });
        } else if (spec.type === "ImportDefaultSpecifier") {
          fileNode.importedSymbols.add(`${specifier}:default`);
          fileNode.symbolTable.set(spec.local.name, { type: 'import', source: specifier, originalName: 'default' });
        } else if (spec.type === "ImportNamespaceSpecifier") {
          fileNode.importedSymbols.add(`${specifier}:*`);
          fileNode.symbolTable.set(spec.local.name, { type: 'import', source: specifier, originalName: '*' });
        }
      });
    }
  }

  handleImportExpression(node, fileNode) {
    if (!node.source) return;
    
    if (node.source.type === "StringLiteral") {
      const specifier = node.source.value;
      fileNode.explicitImports.add(specifier);
      fileNode.dynamicImports.add(specifier);
      fileNode.importedSymbols.add(`${specifier}:*`);
      
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        fileNode.externalPackageUsage.add(this._extractPackageName(specifier));
      }
    } else if (node.source.type === "TemplateLiteral") {
      // Conservative Dynamic Analysis: Treat template literal imports as "potentially anything"
      const quasis = node.source.quasis.map(q => q.value.cooked).join('*');
      if (!Array.isArray(fileNode.calculatedDynamicImports)) {
        fileNode.calculatedDynamicImports = [];
      }
      fileNode.calculatedDynamicImports.push({ 
          kind: 'TemplateLiteral', 
          pattern: quasis,
          start: node.source.start 
      });
      // If we can't resolve it, we must assume it might import anything in that directory
      fileNode.dynamicImports.add('__DYNAMIC_PATTERN__:' + quasis);
      fileNode.dynamicImports.add('__DYNAMIC_PATTERN__');
    }
  }

  handleClassDeclaration(node, fileNode) {
      if (!node.id) return;
      const className = node.id.name;
      const members = [];
      
      if (node.body && node.body.body) {
          node.body.body.forEach(member => {
              if (member.type === "MethodDefinition" || member.type === "PropertyDefinition") {
                  if (member.key && member.key.type === "Identifier") {
                      const memberName = member.key.name;
                      members.push({
                          name: memberName,
                          start: member.key.start,
                          end: member.key.end,
                          isPublic: member.accessibility !== 'private' && !memberName.startsWith('_')
                      });
                      // Track member name for usage detection
                      fileNode.instantiatedIdentifiers.add(memberName);
                  }
              }
          });
      }
      
      fileNode.internalExports.set(className, { type: 'class', members, start: node.start });
      fileNode.symbolTable.set(className, { type: 'class', members, start: node.start });
  }

  handleExportDeclaration(node, fileNode, content) {
    if (node.type === "ExportDefaultDeclaration") {
      fileNode.internalExports.set("default", { type: "default", start: node.start, end: node.end });
      return;
    }

    if (node.type === "ExportAllDeclaration") {
      const sourceSpecifier = node.source.value;
      fileNode.explicitImports.add(sourceSpecifier);
      if (node.exported) {
        const name = node.exported.name || (node.exported.type === "Identifier" ? node.exported.name : null);
        if (name) {
          fileNode.internalExports.set(name, { type: "re-export-namespace", source: sourceSpecifier, originalName: "*", start: node.start });
        }
      } else {
        fileNode.internalExports.set("*", { type: "re-export-all", source: sourceSpecifier });
      }
      return;
    }

    if (node.source) {
      const specifier = node.source.value;
      fileNode.explicitImports.add(specifier);
      if (node.specifiers) {
        node.specifiers.forEach((spec) => {
          const exportedName = spec.exported.name || (spec.exported.type === "Identifier" ? spec.exported.name : spec.exported.value);
          const localName = spec.local.name || (spec.local.type === "Identifier" ? spec.local.name : spec.local.value);
          fileNode.internalExports.set(exportedName, { type: "re-export", source: specifier, originalName: localName, start: spec.start });
        });
      }
    } else if (node.declaration) {
      const decl = node.declaration;
      if (decl.type === "VariableDeclaration") {
        decl.declarations.forEach((d) => {
          this._extractNamesFromPattern(d.id, (name) => {
            fileNode.internalExports.set(name, { type: "variable", start: d.start });
          });
        });
      } else if (decl.id && decl.id.name) {
        this.handleClassDeclaration(decl, fileNode);
      }
    }
  }

  handleCallExpression(node, fileNode) {
    // Call Graph Hint: Track what is being called
    if (node.callee.type === "Identifier") {
        fileNode.instantiatedIdentifiers.add(node.callee.name);
    } else if (node.callee.type === "MemberExpression") {
        this.handleMemberExpression(node.callee, fileNode);
    }
    
    // Enterprise: Execute registered call graph visitors
    if (this.context.callGraphVisitors) {
        for (const visitor of this.context.callGraphVisitors) {
            visitor(node, fileNode, this.context);
        }
    }
  }

  handleMemberExpression(node, fileNode) {
    const getBaseName = (expr) => {
        if (expr.type === "Identifier") return expr.name;
        if (expr.type === "MemberExpression") return getBaseName(expr.object);
        if (expr.type === "ThisExpression") return "this";
        return null;
    };
    
    const getPropName = (expr) => {
        if (expr.type === "Identifier") return expr.name;
        if (expr.type === "StringLiteral") return expr.value;
        return null;
    };

    const objName = getBaseName(node.object);
    const propName = getPropName(node.property);
    
    if (propName) {
        fileNode.instantiatedIdentifiers.add(propName);
        if (objName) {
            fileNode.propertyAccessChains.add(`${objName}.${propName}`);
            fileNode.instantiatedIdentifiers.add(objName);
        }
    } else {
        // Dynamic access: obj[key]
        // Conservative: if we see dynamic access on an object, we mark all its members as potentially used
        if (objName) {
            fileNode.propertyAccessChains.add(`${objName}.*`);
        }
    }
  }

  handleJsxElement(node, fileNode) {
    if (node.openingElement && node.openingElement.name.type === "JSXIdentifier") {
        fileNode.jsxComponents.add(node.openingElement.name.name);
    }
  }

  handleDecorator(node, fileNode) {
      if (node.expression && node.expression.type === "Identifier") {
          fileNode.decorators.add(node.expression.name);
      }
  }

  _extractNamesFromPattern(node, callback) {
    if (!node) return;
    if (node.type === "Identifier") {
      callback(node.name);
    } else if (node.type === "ObjectPattern") {
      node.properties.forEach(p => this._extractNamesFromPattern(p.value || p.argument, callback));
    } else if (node.type === "ArrayPattern") {
      node.elements.forEach(e => e && this._extractNamesFromPattern(e, callback));
    }
  }

  _extractPackageName(specifier) {
    if (specifier.startsWith('@')) {
      return specifier.split('/').slice(0, 2).join('/');
    }
    return specifier.split('/')[0];
  }

  // UPGRADE: CommonJS require() detection
  handleCallExpressionPass1(node, fileNode) {
    if (this.context.verbose) console.log(`[OXC-DEBUG] Checking CallExpression: ${node.callee.name || 'anonymous'}`);
    if (node.callee.type === "Identifier" && node.callee.name === "require") {
      if (this.context.verbose) console.log(`[OXC-DEBUG] Found require() call in ${fileNode.filePath}`);
      if (node.arguments.length > 0) {
        const arg = node.arguments[0];
        if (arg.type === "StringLiteral") {
          const specifier = arg.value;
          fileNode.explicitImports.add(specifier);
          fileNode.importedSymbols.add(`${specifier}:*`);
          
          if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
            fileNode.externalPackageUsage.add(this._extractPackageName(specifier));
          }
        } else if (arg.type === "TemplateLiteral") {
          // Behandlung dynamischer requires
          this.handleDynamicRequire(arg, fileNode);
        }
      }
    }
  }

  // UPGRADE: Dynamic require() with template literals
  handleDynamicRequire(node, fileNode) {
    if (node.type === "TemplateLiteral") {
      const quasis = node.quasis.map(q => q.value.cooked).join('*');
      if (!Array.isArray(fileNode.calculatedDynamicImports)) {
        fileNode.calculatedDynamicImports = [];
      }
      fileNode.calculatedDynamicImports.push({
        kind: 'DynamicRequire',
        pattern: quasis,
        start: node.start
      });
      fileNode.dynamicImports.add('__DYNAMIC_PATTERN__:' + quasis);
      fileNode.dynamicImports.add('__DYNAMIC_PATTERN__');
    }
  }

  // UPGRADE: CommonJS module.exports / exports detection
  handleAssignmentExpression(node, fileNode) {
    if (this.context.verbose) console.log(`[OXC-DEBUG] Checking AssignmentExpression in ${fileNode.filePath}`);
    if (node.left.type === "MemberExpression") {
      const left = node.left;
      
      // module.exports = ...
      if (left.object.type === "Identifier" && left.object.name === "module" &&
          left.property.type === "Identifier" && left.property.name === "exports") {
        
        fileNode.internalExports.set("default", { type: "default", start: node.start, end: node.end });
        
        // UPGRADE: Handle module.exports = { a, b }
        if (node.right.type === "ObjectExpression") {
          node.right.properties.forEach(prop => {
            if (prop.type === "ObjectProperty" && prop.key.type === "Identifier") {
              fileNode.internalExports.set(prop.key.name, { type: "variable", start: prop.start, end: prop.end });
            }
          });
        }
      }
      // exports.name = ...
      else if (left.object.type === "Identifier" && left.object.name === "exports" &&
               left.property.type === "Identifier") {
        fileNode.internalExports.set(left.property.name, { type: "variable", start: node.start, end: node.end });
      }
      // module.exports.name = ...
      else if (left.object.type === "MemberExpression" && 
               left.object.object.type === "Identifier" && left.object.object.name === "module" &&
               left.object.property.type === "Identifier" && left.object.property.name === "exports" &&
               left.property.type === "Identifier") {
        fileNode.internalExports.set(left.property.name, { type: "variable", start: node.start, end: node.end });
      }
    }
  }

  // UPGRADE: Improved _isDefinition with parent context awareness
  _isDefinition(node, parent = null) {
    if (!parent) return false;
    
    // Check if this identifier is being defined (left side of assignment, function parameter, etc.)
    if (parent.type === "VariableDeclarator" && parent.id === node) return true;
    if (parent.type === "FunctionDeclaration" && parent.id === node) return true;
    if (parent.type === "ClassDeclaration" && parent.id === node) return true;
    if (parent.type === "ImportSpecifier" && parent.local === node) return true;
    if (parent.type === "ImportDefaultSpecifier" && parent.local === node) return true;
    if (parent.type === "ImportNamespaceSpecifier" && parent.local === node) return true;
    if (parent.type === "ExportSpecifier" && parent.local === node) return true;
    if (parent.type === "AssignmentExpression" && parent.left === node) return true;
    
    return false;
  }
}
