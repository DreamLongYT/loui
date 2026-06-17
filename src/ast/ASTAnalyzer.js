import ts from 'typescript';
import path from 'path';
import fs from 'fs';
import ansis from 'ansis';

export class ASTAnalyzer {
  constructor(context) {
    this.context = context;
    this.scopeStack = [];
  }

  /**
   * Returns the TypeScript ScriptKind for a given file path.
   * Exposed as a public method so WorkerTaskRunner can call it directly.
   */
  getScriptKind(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) return ts.ScriptKind.TSX;
    if (filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) return ts.ScriptKind.JS;
    return ts.ScriptKind.TS;
  }

  parseFile(filePath, content, fileNode) {
    if (this.context.verbose) {
      console.log(`[AST] Parsing: ${filePath}`);
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      this.getScriptKind(filePath)
    );

    this.currentScope = { symbols: new Map(), parent: null };
    this.scopeStack.push(this.currentScope);

    this.extractTopLevelJSDocSuppreessions(sourceFile, fileNode);
    this.walkAST(sourceFile, fileNode, sourceFile);

    this.scopeStack.pop(); // Pop the global scope
    this.currentScope = null;
  }

  /**
   * Alias for walkAST used by WorkerTaskRunner (legacy API compatibility).
   */
  walkNode(node, sourceFile, fileNode) {
    return this.walkAST(node, fileNode, sourceFile);
  }

  pushScope() {
    const newScope = { symbols: new Map(), parent: this.currentScope };
    this.scopeStack.push(newScope);
    this.currentScope = newScope;
  }

  popScope() {
    if (this.scopeStack.length > 1) {
      this.scopeStack.pop();
      this.currentScope = this.scopeStack[this.scopeStack.length - 1];
    }
  }

  addDeclaredSymbol(name, node, sourceFile) {
    if (this.currentScope) {
      const loc = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      this.currentScope.symbols.set(name, { node, line: loc.line + 1, column: loc.character + 1 });
    }
  }

  resolveSymbol(name) {
    for (let i = this.scopeStack.length - 1; i >= 0; i--) {
      const scope = this.scopeStack[i];
      if (scope.symbols.has(name)) {
        return scope.symbols.get(name);
      }
    }
    return null;
  }

  walkAST(node, fileNode, sourceFile) {
    // Handle scope entry for blocks, functions, classes, etc.
    const isScopeNode = ts.isBlock(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isModuleDeclaration(node);
    if (isScopeNode) {
      this.pushScope();
    }

    switch (node.kind) {
      case ts.SyntaxKind.ImportDeclaration:
        this.handleImportDeclaration(node, fileNode, sourceFile);
        break;
      case ts.SyntaxKind.ExportDeclaration:
        this.handleExportDeclaration(node, fileNode, sourceFile);
        break;
      case ts.SyntaxKind.ExportAssignment:
        fileNode.internalExports.set('default', { type: 'default', start: node.getStart(sourceFile), end: node.getEnd() });
        break;
      case ts.SyntaxKind.VariableStatement:
        this.handleVariableStatement(node, fileNode, sourceFile);
        break;
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.InterfaceDeclaration:
      case ts.SyntaxKind.TypeAliasDeclaration:
      case ts.SyntaxKind.EnumDeclaration:
      case ts.SyntaxKind.ModuleDeclaration:
        this.handleNamedDeclaration(node, fileNode, sourceFile);
        break;
      case ts.SyntaxKind.Identifier:
        fileNode.instantiatedIdentifiers.add(node.text);
        break;
      case ts.SyntaxKind.StringLiteral:
      case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
        fileNode.rawStringReferences.add(node.text);
        break;
      case ts.SyntaxKind.PropertyAccessExpression:
        fileNode.propertyAccessChains.add(node.getText(sourceFile));
        break;
      case ts.SyntaxKind.CallExpression:
        this.handleCallExpression(node, fileNode, sourceFile);
        break;
      case ts.SyntaxKind.JsxElement:
      case ts.SyntaxKind.JsxSelfClosingElement:
        this.handleJsxElement(node, fileNode, sourceFile);
        break;
      case ts.SyntaxKind.Decorator:
        this.handleDecorator(node, fileNode, sourceFile);
        break;
    }

    ts.forEachChild(node, child => this.walkAST(child, fileNode, sourceFile));

    if (isScopeNode) {
      this.popScope();
    }
  }

  handleImportDeclaration(node, fileNode, sourceFile) {
    if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      fileNode.explicitImports.add(specifier);
      
      // Track external package usage for dependency analysis
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        fileNode.externalPackageUsage.add(this._extractPackageName(specifier));
      }

      // 🚨 TARGET BUG 1 & 2: Audit package requirements for unlisted or root dependencies
      if (this.context.workspaceGraph && typeof this.context.workspaceGraph.auditImportSpecifier === 'function') {
        this.context.workspaceGraph.auditImportSpecifier(specifier, sourceFile.fileName);
      }

      if (node.importClause) {
        // Initialize global tracking structures on the engine context if missing
        if (!this.context.importUsageRegistry) this.context.importUsageRegistry = new Set();

        // Cross-file import resolver function
        const resolveAbsoluteTargetFile = (spec) => {
          // If importing a local workspace monorepo module (e.g. '@monorepo/shared')
          if (this.context.workspaceGraph && typeof this.context.workspaceGraph.isLocalWorkspaceSpecifier === 'function') {
            if (this.context.workspaceGraph.isLocalWorkspaceSpecifier(spec)) {
              const match = this.context.workspaceGraph.getWorkspacePackageMatch(spec);
              // Grab the first entry point file calculated from its local tsconfig/package.json
              if (match && match.entryPoints && match.entryPoints.length > 0) {
                return match.entryPoints[0];
              }
            }
          }
          // Fallback to relative file layout calculations
          if (spec.startsWith('.')) {
            let resolved = path.resolve(path.dirname(sourceFile.fileName), spec);
            // Append standard extensions if missing from import string
            if (!path.extname(resolved)) {
              if (fs.existsSync(resolved + '.ts')) resolved += '.ts';
              else if (fs.existsSync(resolved + '.tsx')) resolved += '.tsx';
              else if (fs.existsSync(resolved + '.js')) resolved += '.js';
            }
            return resolved;
          }
          return null;
        };

        if (node.importClause.name) {
          fileNode.importedSymbols.add(`${specifier}:default`);
          
          // Trace default consumption targets
          const targetFile = resolveAbsoluteTargetFile(specifier);
          if (targetFile) {
            this.context.importUsageRegistry.add(`${targetFile}:default`);
          }
        }

        if (node.importClause.namedBindings) {
          if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            fileNode.importedSymbols.add(`${specifier}:*`);
            
            const targetFile = resolveAbsoluteTargetFile(specifier);
            if (targetFile) {
              this.context.importUsageRegistry.add(`${targetFile}:*`);
            }
          } else if (ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(element => {
              const importedName = element.propertyName ? element.propertyName.text : element.name.text;
              fileNode.importedSymbols.add(`${specifier}:${importedName}`);

              // 🚨 TARGET BUG 3: Map the unique file:symbol consumption token
              const targetFile = resolveAbsoluteTargetFile(specifier);
              if (targetFile) {
                this.context.importUsageRegistry.add(`${targetFile}:${importedName}`);
              }
            });
          }
        }
      }
    }
  }

  handleExportDeclaration(node, fileNode, sourceFile) {
    const specifier = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : null;
    
    if (specifier) {
      // Re-export from source: export * from './module' or export { x } from './module'
      fileNode.explicitImports.add(specifier);
      
      // Track external package usage from re-exports
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        fileNode.externalPackageUsage.add(this._extractPackageName(specifier));
      }

      if (!node.exportClause) {
        // export * from './module'
        fileNode.internalExports.set('*', { type: 're-export-all', source: specifier });
        fileNode.importedSymbols.add(`${specifier}:*`);
      } else if (ts.isNamespaceExport(node.exportClause)) {
        // export * as name from './module'
        const name = node.exportClause.name.text;
        fileNode.internalExports.set(name, { type: 're-export-namespace', source: specifier, originalName: '*', start: node.getStart(sourceFile), end: node.getEnd() });
        fileNode.importedSymbols.add(`${specifier}:*`);
      } else if (ts.isNamedExports(node.exportClause)) {
        // export { x, y as z } from './module'
        node.exportClause.elements.forEach(element => {
          const originalName = element.propertyName ? element.propertyName.text : element.name.text;
          const exportedName = element.name.text;
          fileNode.internalExports.set(exportedName, { type: 're-export', source: specifier, originalName, start: element.getStart(sourceFile), end: element.getEnd() });
          fileNode.importedSymbols.add(`${specifier}:${originalName}`);
        });
      }
    } else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      // Local named exports: export { x, y as z }
      node.exportClause.elements.forEach(element => {
        const localName = element.propertyName ? element.propertyName.text : element.name.text;
        const exportedName = element.name.text;
        fileNode.internalExports.set(exportedName, { type: 'export', originalName: localName, start: element.getStart(sourceFile), end: element.getEnd() });
      });
    }
  }

  handleNamedDeclaration(node, fileNode, sourceFile) {
    if (this.hasExportModifier(node)) {
      const isDefault = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
      const name = isDefault ? 'default' : (node.name?.text || 'anonymous');
      
      // 🚨 TARGET BUG 3 (Part B): Extract exported symbol tokens into your global context map
      if (!this.context.exportRegistry) this.context.exportRegistry = new Map();
      const currentFile = sourceFile.fileName;
      if (!this.context.exportRegistry.has(currentFile)) {
        this.context.exportRegistry.set(currentFile, new Set());
      }
      if (name !== 'anonymous') {
        this.context.exportRegistry.get(currentFile).add(name);
      }

      const exportInfo = {
        type: ts.SyntaxKind[node.kind].toLowerCase().replace('declaration', ''),
        start: node.getStart(sourceFile),
        end: node.getEnd()
      };
      
      fileNode.internalExports.set(name, exportInfo);

      if (ts.isEnumDeclaration(node)) {
        exportInfo.members = node.members.map(m => ({
          name: m.name.getText(sourceFile),
          type: 'enumMember',
          start: m.getStart(sourceFile),
          end: m.getEnd()
        }));
      } else if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        exportInfo.members = node.members
          .filter(m => m.name)
          .map(m => ({
            name: m.name.getText(sourceFile),
            type: ts.SyntaxKind[m.kind].toLowerCase(),
            start: m.getStart(sourceFile),
            end: m.getEnd()
          }));
      } else if (ts.isModuleDeclaration(node)) {
        const members = [];
        if (node.body && ts.isModuleBlock(node.body)) {
          node.body.statements.forEach(stmt => {
            if (this.hasExportModifier(stmt) && (ts.isVariableStatement(stmt) || ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt))) {
              if (ts.isVariableStatement(stmt)) {
                stmt.declarationList.declarations.forEach(d => members.push({
                  name: d.name.getText(sourceFile),
                  type: 'variable',
                  start: d.getStart(sourceFile),
                  end: d.getEnd()
                }));
              } else if (stmt.name) {
                members.push({
                  name: stmt.name.getText(sourceFile),
                  type: ts.SyntaxKind[stmt.kind].toLowerCase().replace('declaration', ''),
                  start: stmt.getStart(sourceFile),
                  end: stmt.getEnd()
                });
              }
            }
          });
        }
        exportInfo.members = members;
      }
      
      const loc = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      fileNode.symbolSourceLocations.set(name, { line: loc.line + 1, column: loc.character + 1 });
      this.addDeclaredSymbol(name, node, sourceFile);
    } else if (node.name && ts.isIdentifier(node.name)) {
      this.addDeclaredSymbol(node.name.text, node, sourceFile);
    }
  }

  handleVariableStatement(node, fileNode, sourceFile) {
    if (this.hasExportModifier(node)) {
      node.declarationList.declarations.forEach(decl => {
        if (decl.name && ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          fileNode.internalExports.set(name, { 
            type: 'variable', 
            start: node.getStart(sourceFile), 
            end: node.getEnd() 
          });
          const loc = sourceFile.getLineAndCharacterOfPosition(decl.getStart(sourceFile));
          fileNode.symbolSourceLocations.set(name, { line: loc.line + 1, column: loc.character + 1 });
          this.addDeclaredSymbol(name, decl, sourceFile);
        } else if (decl.name && ts.isObjectBindingPattern(decl.name)) {
           decl.name.elements.forEach(element => {
               if(element.name && ts.isIdentifier(element.name)) {
                   const name = element.name.text;
                   fileNode.internalExports.set(name, {
                       type: 'variable',
                       start: node.getStart(sourceFile),
                       end: node.getEnd()
                   });
                   const loc = sourceFile.getLineAndCharacterOfPosition(element.getStart(sourceFile));
                   fileNode.symbolSourceLocations.set(name, { line: loc.line + 1, column: loc.character + 1 });
                   this.addDeclaredSymbol(name, element, sourceFile);
               }
           });
        } else if (decl.name && ts.isArrayBindingPattern(decl.name)) {
            decl.name.elements.forEach(element => {
               if(ts.isBindingElement(element) && element.name && ts.isIdentifier(element.name)) {
                   const name = element.name.text;
                   fileNode.internalExports.set(name, {
                       type: 'variable',
                       start: node.getStart(sourceFile),
                       end: node.getEnd()
                   });
                   const loc = sourceFile.getLineAndCharacterOfPosition(element.getStart(sourceFile));
                   fileNode.symbolSourceLocations.set(name, { line: loc.line + 1, column: loc.character + 1 });
                   this.addDeclaredSymbol(name, element, sourceFile);
               }
           });
        }
      });
    } else {
      // Non-exported variable declarations also need to be added to scope
      node.declarationList.declarations.forEach(decl => {
        if (decl.name && ts.isIdentifier(decl.name)) {
          this.addDeclaredSymbol(decl.name.text, decl, sourceFile);
        } else if (decl.name && ts.isObjectBindingPattern(decl.name)) {
          decl.name.elements.forEach(element => {
            if (element.name && ts.isIdentifier(element.name)) {
              this.addDeclaredSymbol(element.name.text, element, sourceFile);
            }
          });
        } else if (decl.name && ts.isArrayBindingPattern(decl.name)) {
          decl.name.elements.forEach(element => {
            if (ts.isBindingElement(element) && element.name && ts.isIdentifier(element.name)) {
              this.addDeclaredSymbol(element.name.text, element, sourceFile);
            }
          });
        }
      });
    }
  }

  handleCallExpression(node, fileNode, sourceFile) {
    // Dynamic import(): import('./module').then(...)
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0];
      if (arg) {
        if (!fileNode.calculatedDynamicImports) fileNode.calculatedDynamicImports = [];
        fileNode.calculatedDynamicImports.push({ kind: ts.SyntaxKind[arg.kind], start: arg.getStart(sourceFile) });
        
        // Ensure the argument text is also in rawStringReferences if it's a literal
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
           fileNode.rawStringReferences.add(arg.text);
        }

        if (ts.isStringLiteral(arg)) {
          fileNode.explicitImports.add(arg.text);
          fileNode.dynamicImports.add(arg.text);
          // Track external package usage from dynamic imports
          if (!arg.text.startsWith('.') && !arg.text.startsWith('/')) {
            fileNode.externalPackageUsage.add(this._extractPackageName(arg.text));
          }
        }
      }
    } else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        fileNode.explicitImports.add(arg.text);
        // Track external package usage from require() calls
        if (!arg.text.startsWith('.') && !arg.text.startsWith('/')) {
          fileNode.externalPackageUsage.add(this._extractPackageName(arg.text));
        }
      }
    }
  }

  handleJsxElement(node, fileNode, sourceFile) {
    const getElementName = (name) => {
      if (ts.isIdentifier(name)) return name.text;
      if (ts.isPropertyAccessExpression(name)) return name.name.text;
      return 'unknown';
    };

    const tagName = getElementName(node.openingElement.tagName);
    fileNode.jsxComponents.add(tagName);

    node.openingElement.attributes.properties.forEach(attr => {
      if (ts.isJsxAttribute(attr) && ts.isIdentifier(attr.name)) {
        fileNode.jsxProps.add(`${tagName}:${attr.name.text}`);
      }
    });
  }

  handleDecorator(node, fileNode, sourceFile) {
    const getDecoratorName = (expr) => {
      if (ts.isIdentifier(expr)) return expr.text;
      if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) return expr.expression.text;
      if (ts.isCallExpression(expr) && ts.isPropertyAccessExpression(expr.expression)) return expr.expression.name.text;
      return 'unknown';
    };

    const decoratorName = getDecoratorName(node.expression);
    fileNode.decorators.add(decoratorName);

    // Optionally, extract decorator arguments
    if (ts.isCallExpression(node.expression)) {
      node.expression.arguments.forEach(arg => {
        // Further analysis of arguments can be done here if needed
      });
    }
  }

  hasExportModifier(node) {
    return node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
  }

  extractTopLevelJSDocSuppreessions(sourceFile, fileNode) {
    const fullText = sourceFile.text;
    const commentRegex = /\/\*\*?[\s\S]*?\*\/|\/\/.*/g;
    let match;
    while ((match = commentRegex.exec(fullText)) !== null) {
      const suppressMatches = match[0].match(/@scaffold-suppress\s+([a-zA-Z0-9_\-*:]+)/g);
      if (suppressMatches) {
        suppressMatches.forEach(m => fileNode.localSuppressedRules.add(m.replace('@scaffold-suppress', '').trim()));
      }
    }
  }

  /**
   * Extracts the root npm package name from an import specifier.
   * Handles scoped packages (@scope/pkg) and subpath imports (pkg/utils, @scope/pkg/utils).
   */
  _extractPackageName(specifier) {
    if (specifier.startsWith('@')) {
      // Scoped package: @scope/name or @scope/name/subpath
      const parts = specifier.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
    }
    // Regular package: name or name/subpath
    return specifier.split('/')[0];
  }
}
