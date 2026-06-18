import path from 'path';

export class OxcAnalyzer {
  constructor(context) {
    this.context = context;
    this.oxc = null;
    this.isAvailable = false;
  }

  async init() {
    if (this.isAvailable) return true;
    try {
      this.oxc = await import("oxc-parser");
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
        if (this.context.verbose) {
          console.warn("[OxcAnalyzer] oxc-parser not found or failed to load.");
        }
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
      // Fix: Remove BOM if present (confuses some Rust parsers)
      const cleanContent = content.startsWith('\uFEFF') ? content.slice(1) : content;
      
      // Fix: Use absolute path with forward slashes for OXC (most stable for Rust on Windows)
      const normalizedPath = filePath.replace(/\\/g, '/');
      // FIX: The previous regex was too aggressive and matched patterns that are NOT regex literals
      // (like paths in strings or comments), causing it to strip characters and create invalid regex flags
      // for OXC. We now only target what looks like a regex literal at the end of a line or statement.
      const normalizedContent = cleanContent.replace(/\/([gimuy]*)([nh]+)([gimuy]*)(?=\s|[;,\)]|$)/g, (match, p1, p2, p3) => {
        // Only normalize if it's likely a regex (flags p1/p3 are valid JS flags)
        const validJSFlags = /^[gimuy]*$/;
        if (validJSFlags.test(p1) && validJSFlags.test(p3)) {
          if (this.context.verbose) console.log(`[OXC] Normalizing regex flag: ${p2} at ${filePath}`);
          return `/${p1}${p3}`;
        }
        return match;
      });
      let result;
      try {
        // ONLY USE FLAT SIGNATURE: parseSync(sourceText, sourceFilename)
        // This avoids the "rust type String" conversion error seen with configuration objects.
        result = this.oxc.parseSync(normalizedContent, normalizedPath);
      } catch (e) {
        // Silent fallback to TS Compiler if OXC fails
        return false;
      }

      if (this.context.verbose) {
        console.log(`[OXC] Parsed ${filePath} using flat signature`);
      }

      // Fix: Handle cases where OXC returns a JSON string instead of an object
      // Stabilize result through JSON round-trip to fix N-API conversion issues on Windows
let parsedResult;
      try {
        parsedResult = typeof result === 'string' ? JSON.parse(result) : JSON.parse(JSON.stringify(result));
      } catch (err) {
        parsedResult = result;
      }
      // REPORT OXC ERRORS: If the parser found syntax errors, show them in verbose mode
      if (this.context.verbose && parsedResult.errors && parsedResult.errors.length > 0) {
        console.log(`[OXC] ❌ Parser reported ${parsedResult.errors.length} errors for ${normalizedPath}:`);
        parsedResult.errors.forEach(err => console.log(`  - ${err.message || err}`));
      }

      let ast = (parsedResult && parsedResult.program) ? parsedResult : { program: parsedResult };
      fileNode.ast = ast.program;
      fileNode.jsxComponents = new Set();
      fileNode.jsxProps = new Set();
      fileNode.decorators = new Set();
      if (parsedResult && typeof parsedResult === 'object') {
        if (parsedResult.program) {
          ast = parsedResult;
        } else if (parsedResult.ast) {
          ast = { program: parsedResult.ast };
        } else if (parsedResult.body || parsedResult.type === 'Program') {
          ast = { program: parsedResult };
        } else {
          ast = { program: parsedResult };
        }
      } else {
        throw new Error("OXC returned an invalid AST format");
      }

      fileNode.ast = ast.program; // Store the AST for advanced analysis
      fileNode.jsxComponents = new Set();
      fileNode.jsxProps = new Set();
      fileNode.decorators = new Set();

      if (this.context.verbose) {
        console.log(`[OXC] Analyzing ${filePath}`);
      }
      this.walkOxcAst(ast.program, fileNode, content);
      
      // 7. Success confirmation
      if (this.context.verbose) {
        console.log(`[OXC] Successfully parsed and analyzed ${filePath}`);
      }
      // Fallback: If OXC found 0 imports but the file has content that looks like it has imports, 
      // return false to trigger the TS Compiler API fallback. This is a safety anchor.
      if (fileNode.explicitImports.size === 0 && (content.includes('import') || content.includes('export')) && content.length > 50) {
        if (this.context.verbose) {
          console.log(`[OXC] ⚠️ Parser yielded 0 imports/exports for ${filePath}. Engaging TS Compiler fallback for accuracy.`);
          
          // DEEP DIAGNOSTICS: Inspect the first few nodes of the AST to see what OXC is actually producing
          if (ast.program && ast.program.body && ast.program.body.length > 0) {
            console.log(`[OXC-DEBUG] AST Program Body Length: ${ast.program.body.length}`);
            const firstNodes = ast.program.body.slice(0, 3).map(n => ({
              type: n.type,
              hasSource: !!n.source,
              hasDeclaration: !!n.declaration,
              specifiersCount: n.specifiers ? n.specifiers.length : 0
            }));
            console.log(`[OXC-DEBUG] First 3 Nodes structure: ${JSON.stringify(firstNodes, null, 2)}`);
          } else {
            console.log(`[OXC-DEBUG] AST Program Body is EMPTY or UNDEFINED.`);
          }
        }
        return false;
      }

      if (this.context.verbose) {
        console.log(`[OXC] Found ${fileNode.explicitImports.size} imports in ${filePath}`);
        if (fileNode.explicitImports.size > 0) {
          console.log(`[OXC] Imports for ${filePath}: ${Array.from(fileNode.explicitImports).join(', ')}`);
        }
      }
      
      const lines = content.split('\n');
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
      }

      return true;
    } catch (e) {
      if (this.context.verbose) {
        console.warn(`[OXC] Failed to parse ${filePath}. Error: ${e.message}`);
        if (e.stack) console.debug(e.stack);
        console.info(`[OXC] Switching back to TypeScript Compiler API for ${filePath}`);
      }
      return false;
    }
  }

  walkOxcAst(node, fileNode, content) {
    if (!node) return;

    switch (node.type) {
      case "ImportDeclaration":
        this.handleImportDeclaration(node, fileNode);
        break;
      case "ExportNamedDeclaration":
      case "ExportDefaultDeclaration":
      case "ExportAllDeclaration":
        this.handleExportDeclaration(node, fileNode, content);
        break;
      case "CallExpression":
        this.handleCallExpression(node, fileNode);
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
    }

    for (const key in node) {
      if (node[key] && typeof node[key] === "object") {
        if (Array.isArray(node[key])) {
          node[key].forEach((child) => this.walkOxcAst(child, fileNode, content));
        } else {
          this.walkOxcAst(node[key], fileNode, content);
        }
      }
    }
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
          // In OXC, imported name can be in .imported.name or .imported.value
          const importedName = spec.imported.name || spec.imported.value || (spec.imported.type === "Identifier" ? spec.imported.name : null);
          if (importedName) {
            fileNode.importedSymbols.add(`${specifier}:${importedName}`);
          }
        } else if (spec.type === "ImportDefaultSpecifier") {
          fileNode.importedSymbols.add(`${specifier}:default`);
        } else if (spec.type === "ImportNamespaceSpecifier") {
          fileNode.importedSymbols.add(`${specifier}:*`);
        }
      });
    }
  }

  handleExportDeclaration(node, fileNode, content) {
    // 1. Default Exports
    if (node.type === "ExportDefaultDeclaration") {
      fileNode.internalExports.set("default", { 
        type: "default", 
        start: node.start, 
        end: node.end 
      });
      return;
    }

    // 2. Re-export All: export * from 'mod' or export * as ns from 'mod'
    if (node.type === "ExportAllDeclaration") {
      const sourceSpecifier = node.source.value;
      fileNode.explicitImports.add(sourceSpecifier);
      if (!sourceSpecifier.startsWith('.') && !sourceSpecifier.startsWith('/')) {
        fileNode.externalPackageUsage.add(this._extractPackageName(sourceSpecifier));
      }

      if (node.exported) {
        // export * as ns from 'mod'
        const name = node.exported.name || (node.exported.type === "Identifier" ? node.exported.name : null);
        if (name) {
          fileNode.internalExports.set(name, { 
            type: "re-export-namespace", 
            source: sourceSpecifier, 
            originalName: "*", 
            start: node.start, 
            end: node.end 
          });
          fileNode.importedSymbols.add(`${sourceSpecifier}:*`);
        }
      } else {
        // export * from 'mod'
        fileNode.internalExports.set("*", { 
          type: "re-export-all", 
          source: sourceSpecifier 
        });
        fileNode.importedSymbols.add(`${sourceSpecifier}:*`);
      }
      return;
    }

    // 3. Named Exports & Re-exports with specifiers
    if (node.source) {
      // Re-export: export { x } from 'mod'
      const specifier = node.source.value;
      fileNode.explicitImports.add(specifier);
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        fileNode.externalPackageUsage.add(this._extractPackageName(specifier));
      }

      if (node.specifiers) {
        node.specifiers.forEach((spec) => {
          const exportedName = spec.exported.name || (spec.exported.type === "Identifier" ? spec.exported.name : spec.exported.value);
          const localName = spec.local.name || (spec.local.type === "Identifier" ? spec.local.name : spec.local.value);
          fileNode.internalExports.set(exportedName, {
            type: "re-export",
            source: specifier,
            originalName: localName,
            start: spec.start,
            end: spec.end,
          });
          fileNode.importedSymbols.add(`${specifier}:${localName}`);
        });
      }
    } else if (node.declaration) {
      // Direct declaration export: export const x = 1, export function f() {}
      const decl = node.declaration;
      if (decl.type === "VariableDeclaration") {
        decl.declarations.forEach((d) => {
          this._extractNamesFromPattern(d.id, (name) => {
            fileNode.internalExports.set(name, { 
              type: "variable", 
              start: d.start, 
              end: d.end 
            });
          });
        });
      } else if (decl.id && decl.id.name) {
        let type = "unknown";
        if (decl.type === "FunctionDeclaration") type = "function";
        else if (decl.type === "ClassDeclaration") type = "class";
        else if (decl.type === "TSEnumDeclaration") type = "enum";
        else if (decl.type === "TSInterfaceDeclaration") type = "interface";
        else if (decl.type === "TSTypeAliasDeclaration") type = "type";
        else if (decl.type === "TSModuleDeclaration") type = "namespace";

        fileNode.internalExports.set(decl.id.name, { 
          type, 
          start: decl.start, 
          end: decl.end 
        });
      }
    } else if (node.specifiers) {
      // Export existing locals: export { x, y as z }
      node.specifiers.forEach((spec) => {
        const exportedName = spec.exported.name || (spec.exported.type === "Identifier" ? spec.exported.name : spec.exported.value);
        const localName = spec.local.name || (spec.local.type === "Identifier" ? spec.local.name : spec.local.value);
        fileNode.internalExports.set(exportedName, {
          type: "export",
          originalName: localName,
          start: spec.start,
          end: spec.end,
        });
      });
    }
  }

  _extractNamesFromPattern(node, callback) {
    if (!node) return;
    if (node.type === "Identifier") {
      callback(node.name);
    } else if (node.type === "ObjectPattern") {
      node.properties.forEach(p => {
        if (p.type === "Property") {
          this._extractNamesFromPattern(p.value, callback);
        } else if (p.type === "RestElement") {
          this._extractNamesFromPattern(p.argument, callback);
        }
      });
    } else if (node.type === "ArrayPattern") {
      node.elements.forEach(e => {
        if (e) this._extractNamesFromPattern(e, callback);
      });
    } else if (node.type === "AssignmentPattern") {
      this._extractNamesFromPattern(node.left, callback);
    } else if (node.type === "RestElement") {
      this._extractNamesFromPattern(node.argument, callback);
    }
  }

  handleCallExpression(node, fileNode) {
    // Dynamic import(): import('./module')
    if (node.callee.type === "Import" && node.arguments.length > 0) {
      const arg = node.arguments[0];
      if (arg.type === "StringLiteral") {
        const specifier = arg.value;
        fileNode.explicitImports.add(specifier);
        fileNode.dynamicImports.add(specifier);
        fileNode.importedSymbols.add(`${specifier}:*`); // Dynamic import usually consumes the whole namespace
        if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
          fileNode.externalPackageUsage.add(this._extractPackageName(specifier));
        }
      } else {
        if (fileNode.calculatedDynamicImports) {
          fileNode.calculatedDynamicImports.push({ kind: arg.type, start: arg.start });
        }
      }
    } else if (node.callee.type === "Identifier" && node.callee.name === "require" && node.arguments.length > 0 && node.arguments[0].type === "StringLiteral") {
      const specifier = node.arguments[0].value;
      fileNode.explicitImports.add(specifier);
      fileNode.importedSymbols.add(`${specifier}:*`);
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        fileNode.externalPackageUsage.add(this._extractPackageName(specifier));
      }
    }
  }

  handleJsxElement(node, fileNode) {
    const getElementName = (nameNode) => {
      if (nameNode.type === "JSXIdentifier") return nameNode.name;
      if (nameNode.type === "JSXMemberExpression") return `${getElementName(nameNode.object)}.${nameNode.property.name}`;
      if (nameNode.type === "JSXNamespacedName") return `${nameNode.namespace.name}:${nameNode.name.name}`;
      return "unknown";
    };

    if (node.openingElement) {
      const tagName = getElementName(node.openingElement.name);
      fileNode.jsxComponents.add(tagName);

      if (node.openingElement.attributes) {
        node.openingElement.attributes.forEach(attr => {
          if (attr.type === "JSXAttribute" && attr.name.type === "JSXIdentifier") {
            fileNode.jsxProps.add(`${tagName}:${attr.name.name}`);
          }
        });
      }
    }
  }

  handleDecorator(node, fileNode) {
    const getDecoratorName = (expr) => {
      if (expr.type === "Identifier") return expr.name;
      if (expr.type === "CallExpression") return getDecoratorName(expr.callee);
      if (expr.type === "MemberExpression") {
        const prop = expr.property.name || expr.property.value;
        return prop || "unknown";
      }
      return "unknown";
    };

    const decoratorName = getDecoratorName(node.expression);
    if (decoratorName !== "unknown") {
      fileNode.decorators.add(decoratorName);
    }
  }

  _extractPackageName(specifier) {
    if (specifier.startsWith('@')) {
      const parts = specifier.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
    }
    return specifier.split('/')[0];
  }
}