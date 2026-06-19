import ts from 'typescript';
import path from 'path';
import fs from 'fs';

export class ASTAnalyzer {
  constructor(context) {
    this.context = context;
    this.scopeStack = [];
  }

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

    fileNode.ast = sourceFile;
    this.extractTopLevelJSDocSuppreessions(sourceFile, fileNode);

    // --- TWO-PASS ANALYSIS STRATEGY ---
    
    // Pass 1: Declaration Indexing
    this.currentScope = { symbols: new Map(), parent: null, children: [] };
    this.scopeStack = [this.currentScope];
    this.scopeCounter = 0;
    this.pass = 1;
    try {
      this.walkAST(sourceFile, fileNode, sourceFile);
    } catch (e) {
      if (this.context.verbose) console.error(`[AST] Pass 1 failed for ${filePath}: ${e.message}`);
    }

    // Pass 2: Reference Tracking
    if (this.scopeStack.length > 0) {
      this.currentScope = this.scopeStack[0];
      this.scopeCounter = 0;
      this.pass = 2;
      try {
        this.walkAST(sourceFile, fileNode, sourceFile);
      } catch (e) {
        if (this.context.verbose) console.error(`[AST] Pass 2 failed for ${filePath}: ${e.message}`);
      }
    }

    // Pass 3: Side-Effect Detection (Diamond Edition)
    this.detectSideEffects(sourceFile, fileNode);

    // Pass 4: Barrel Detection
    this.detectBarrelStatus(sourceFile, fileNode);
    
    // UPGRADE: Final check for "joke" imports or unused barrel re-exports
    if (fileNode.isBarrel && fileNode.instantiatedIdentifiers.size === 0) {
      fileNode.isPureBarrel = true;
    }

    this.scopeStack = [];
    this.currentScope = null;
  }

  detectBarrelStatus(sourceFile, fileNode) {
    let totalExportDeclarations = 0;
    let totalTopLevelStatements = sourceFile.statements.length;
    let usesInternalImport = false;

    if (totalTopLevelStatements === 0) return;

    // UPGRADE: Barrel Files that re-exports everything may get caught as "OH YOU ENTRY POINT"
    // but it never used the functions it imported.
    // In the entry point, it has to use at least 1 import that it imported, 
    // or else its barrel or files that arent importing it as a joke.

    sourceFile.statements.forEach(node => {
      if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        totalExportDeclarations++;
      } else if (ts.isImportDeclaration(node)) {
        // Imports are common in barrels, we don't count them against the ratio
        totalTopLevelStatements--;
      } else if (ts.isExportAssignment(node)) {
        totalExportDeclarations++;
      }
    });

    // Check if any imported symbol is actually used in the file (Pass 2 already does this via instantiatedIdentifiers)
    // However, for Barrel detection, we want to know if it's ONLY re-exporting.
    
    const barrelRatio = totalExportDeclarations / Math.max(1, totalTopLevelStatements);
    
    // If it's mostly exports and imports, it's likely a barrel.
    if (barrelRatio > 0.8) {
      fileNode.isBarrel = true;
    }
  }

  detectSideEffects(sourceFile, fileNode) {
    let hasSideEffects = false;

    const checkNode = (node) => {
      if (hasSideEffects) return;

      // 1. Top-level Call Expressions (excluding declarations)
      if (ts.isExpressionStatement(node)) {
        const expr = node.expression;
        if (ts.isCallExpression(expr) || ts.isAwaitExpression(expr)) {
          // Check for specific bootstrap patterns
          const callText = expr.getText(sourceFile);
          const bootstrapTriggers = [
            'app.listen', 'http.createServer', 'ReactDOM.render',
            'process.on', 'process.exit', 'console.log',
            'setInterval', 'setTimeout', 'new Vue', 'new App'
          ];
          
          if (bootstrapTriggers.some(trigger => callText.includes(trigger))) {
            hasSideEffects = true;
            return;
          }

          // Any top-level call that isn't just a simple utility might be an entry
          // We exclude common non-executing calls if necessary, but generally, 
          // a top-level call in a non-export-only file is a strong signal.
          hasSideEffects = true;
        }
      }

      // 2. Node.js direct execution check: if (require.main === module)
      if (ts.isIfStatement(node)) {
        const cond = node.expression.getText(sourceFile);
        if (cond.includes('require.main === module')) {
          hasSideEffects = true;
          return;
        }
      }

      // 3. IIFE (Immediately Invoked Function Expression)
      if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
          const func = node.expression.expression;
          if (ts.isParenthesizedExpression(func) || ts.isFunctionExpression(func) || ts.isArrowFunction(func)) {
              hasSideEffects = true;
              return;
          }
      }
    };

    ts.forEachChild(sourceFile, checkNode);
    fileNode.hasSideEffects = hasSideEffects;
  }

  pushScope() {
    if (this.pass === 1) {
        const newScope = { symbols: new Map(), parent: this.currentScope, children: [] };
        if (this.currentScope) {
          this.currentScope.children.push(newScope);
        }
        this.scopeStack.push(newScope);
        this.currentScope = newScope;
    } else {
        // In Pass 2, we follow the pre-built children
        if (this.currentScope && this.currentScope.children) {
          const nextScope = this.currentScope.children[this.scopeCounter++];
          if (nextScope) {
            this.scopeStack.push(nextScope);
            this.currentScope = nextScope;
          }
        }
    }
  }

  popScope() {
    this.scopeStack.pop();
    this.currentScope = this.scopeStack[this.scopeStack.length - 1];
  }

  addDeclaredSymbol(name, node, sourceFile) {
    if (this.currentScope) {
      const loc = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      this.currentScope.symbols.set(name, { node, line: loc.line + 1, column: loc.character + 1 });
    }
  }

  walkAST(node, fileNode, sourceFile) {
    const isScopeNode = ts.isBlock(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isModuleDeclaration(node) || ts.isArrowFunction(node);
    
    let previousCounter = 0;
    if (isScopeNode) {
      if (this.pass === 2) previousCounter = this.scopeCounter;
      this.scopeCounter = 0;
      this.pushScope();
    }

    if (this.pass === 1) {
        // --- PASS 1: DECLARATION INDEXING ---
        switch (node.kind) {
          case ts.SyntaxKind.ImportDeclaration:
            this.handleImportDeclaration(node, fileNode, sourceFile);
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
          case ts.SyntaxKind.ExpressionStatement:
            this.handleAssignmentExpressionPass1(node, fileNode, sourceFile);
            break;
        }
    } else {
        // --- PASS 2: REFERENCE TRACKING ---
        switch (node.kind) {
          case ts.SyntaxKind.Identifier:
            if (!this.isDeclarationName(node)) {
              // Scope-Aware Check: Only track if NOT shadowed by a local variable
              if (!this.isLocalShadowing(node.text)) {
                  fileNode.instantiatedIdentifiers.add(node.text);
              }
            }
            break;
          case ts.SyntaxKind.CallExpression:
            if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
              const arg = node.arguments[0];
              if (arg) {
                if (ts.isStringLiteral(arg)) {
                  const specifier = arg.text;
                  fileNode.dynamicImports.add(specifier);
                  fileNode.explicitImports.add(specifier);
                } else {
                  // UPGRADE: Handle Dynamic Imports with variables/expressions
                  // We mark the file as having "calculated" dynamic imports to be conservative
                  fileNode.hasCalculatedDynamicImports = true;
                  const exprText = arg.getText(sourceFile);
                  if (!fileNode.calculatedDynamicImports) fileNode.calculatedDynamicImports = new Set();
                  fileNode.calculatedDynamicImports.add(exprText);
                  
                  // Conservative approach: If we see `import(path)`, any file in the same or sub directory could be a target.
                  // This is a simplified version of what knip/entkapp does for plugins.
                  fileNode.dynamicImports.add('__DYNAMIC_PATTERN__');
                }
              }
            } else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
              // UPGRADE: CommonJS require() detection
              const arg = node.arguments[0];
              if (arg && ts.isStringLiteral(arg)) {
                const specifier = arg.text;
                fileNode.explicitImports.add(specifier);
                fileNode.importedSymbols.add(`${specifier}:*`);
                if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
                  fileNode.externalPackageUsage.add(this._extractPackageName(specifier));
                }
              } else if (arg && ts.isTemplateExpression(arg)) {
                // Dynamic require with template literal
                fileNode.hasCalculatedDynamicImports = true;
                const exprText = arg.getText(sourceFile);
                if (!fileNode.calculatedDynamicImports) fileNode.calculatedDynamicImports = [];
                fileNode.calculatedDynamicImports.push({ kind: 'DynamicRequire', expression: exprText, start: arg.getStart(sourceFile) });
                fileNode.dynamicImports.add('__DYNAMIC_PATTERN__');
              }
            }
            break;
          case ts.SyntaxKind.PropertyAccessExpression:
            {
              const chain = node.getText(sourceFile);
              fileNode.propertyAccessChains.add(chain);
              if (node.name && ts.isIdentifier(node.name)) {
                fileNode.instantiatedIdentifiers.add(node.name.text);
              }
            }
            break;
          case ts.SyntaxKind.CallExpression:
            this.handleCallExpression(node, fileNode, sourceFile);
            break;
          case ts.SyntaxKind.JsxElement:
          case ts.SyntaxKind.JsxSelfClosingElement:
            this.handleJsxElement(node, fileNode, sourceFile);
            break;
        }
    }

    ts.forEachChild(node, child => this.walkAST(child, fileNode, sourceFile));

    if (isScopeNode) {
      this.popScope();
      if (this.pass === 2) this.scopeCounter = previousCounter + 1;
    }
  }

  isLocalShadowing(name) {
      let scope = this.currentScope;
      // We check all scopes up to the root.
      // If the name is found in a scope that is NOT the root scope, it's definitely shadowing.
      // If it's found in the root scope, it's only shadowing if it's NOT an export.
      while (scope) {
          if (scope.symbols.has(name)) {
              // If we are in the root scope and found the symbol, it's the global declaration.
              // We only consider it shadowing if we are currently in a deeper scope.
              if (scope.parent === null) {
                  return this.currentScope !== scope; 
              }
              return true;
          }
          scope = scope.parent;
      }
      return false;
  }

  isDeclarationName(node) {
    const parent = node.parent;
    if (!parent) return false;
    if (ts.isVariableDeclaration(parent) && parent.name === node) return true;
    if (ts.isFunctionDeclaration(parent) && parent.name === node) return true;
    if (ts.isClassDeclaration(parent) && parent.name === node) return true;
    if (ts.isInterfaceDeclaration(parent) && parent.name === node) return true;
    if (ts.isEnumDeclaration(parent) && parent.name === node) return true;
    if (ts.isTypeAliasDeclaration(parent) && parent.name === node) return true;
    if (ts.isImportSpecifier(parent) && parent.name === node) return true;
    if (ts.isExportSpecifier(parent) && parent.name === node) return true;
    return false;
  }

  handleImportDeclaration(node, fileNode, sourceFile) {
    if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      fileNode.explicitImports.add(specifier);
      
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        fileNode.externalPackageUsage.add(this._extractPackageName(specifier));
      }

      if (this.context.workspaceGraph && typeof this.context.workspaceGraph.auditImportSpecifier === 'function') {
        this.context.workspaceGraph.auditImportSpecifier(specifier, sourceFile.fileName);
      }

      const targetFile = this.resolveAbsoluteTargetFile(specifier, sourceFile.fileName);

      if (node.importClause) {
        if (!this.context.importUsageRegistry) this.context.importUsageRegistry = new Set();

        if (node.importClause.name) {
          fileNode.importedSymbols.add(`${specifier}:default`);
          if (targetFile) this.context.importUsageRegistry.add(`${targetFile}:default`);
        }

        if (node.importClause.namedBindings) {
          if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            fileNode.importedSymbols.add(`${specifier}:*`);
            if (targetFile) this.context.importUsageRegistry.add(`${targetFile}:*`);
          } else if (ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(element => {
              const importedName = element.propertyName ? element.propertyName.text : element.name.text;
              fileNode.importedSymbols.add(`${specifier}:${importedName}`);
              if (targetFile) this.context.importUsageRegistry.add(`${targetFile}:${importedName}`);
            });
          }
        }
      } else {
        // Side-Effect Import (import '...')
        // FIX: Mark the target file as used even if no symbols are imported
        if (targetFile) {
          if (!this.context.importUsageRegistry) this.context.importUsageRegistry = new Set();
          this.context.importUsageRegistry.add(`${targetFile}:*`);
          fileNode.importedSymbols.add(`${specifier}:*`);
        }
      }
    }
  }

  resolveAbsoluteTargetFile(spec, sourceFilePath) {
    if (this.context.workspaceGraph && typeof this.context.workspaceGraph.isLocalWorkspaceSpecifier === 'function') {
      if (this.context.workspaceGraph.isLocalWorkspaceSpecifier(spec)) {
        const match = this.context.workspaceGraph.getWorkspacePackageMatch(spec);
        if (match && match.entryPoints && match.entryPoints.length > 0) return match.entryPoints[0];
      }
    }
    if (spec.startsWith('.')) {
      let resolved = path.resolve(path.dirname(sourceFilePath), spec);
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
      if (!path.extname(resolved)) {
        for (const ext of extensions) {
          if (fs.existsSync(resolved + ext)) return resolved + ext;
        }
        // Check index files
        for (const ext of extensions) {
          if (fs.existsSync(path.join(resolved, 'index' + ext))) return path.join(resolved, 'index' + ext);
        }
      }
      return resolved;
    }
    return null;
  }

  handleExportDeclaration(node, fileNode, sourceFile) {
    const specifier = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : null;
    
    if (specifier) {
      fileNode.explicitImports.add(specifier);
      if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
        fileNode.externalPackageUsage.add(this._extractPackageName(specifier));
      }

      if (!node.exportClause) {
        fileNode.internalExports.set('*', { type: 're-export-all', source: specifier });
        fileNode.importedSymbols.add(`${specifier}:*`);
      } else if (ts.isNamespaceExport(node.exportClause)) {
        const name = node.exportClause.name.text;
        fileNode.internalExports.set(name, { type: 're-export-namespace', source: specifier, originalName: '*', start: node.getStart(sourceFile), end: node.getEnd() });
        fileNode.importedSymbols.add(`${specifier}:*`);
      } else if (ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(element => {
          const originalName = element.propertyName ? element.propertyName.text : element.name.text;
          const exportedName = element.name.text;
          fileNode.internalExports.set(exportedName, { type: 're-export', source: specifier, originalName, start: element.getStart(sourceFile), end: element.getEnd() });
          fileNode.importedSymbols.add(`${specifier}:${originalName}`);
        });
      }
    } else if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      node.exportClause.elements.forEach(element => {
        const localName = element.propertyName ? element.propertyName.text : element.name.text;
        const exportedName = element.name.text;
        fileNode.internalExports.set(exportedName, { type: 'export', originalName: localName, start: element.getStart(sourceFile), end: element.getEnd() });
      });
    }
  }

  /**
   * UPGRADE 6: Constant Folding for Computed Keys.
   * Resolves the value of constants used as export keys.
   */
  resolveConstantValue(node, sourceFile) {
    if (ts.isIdentifier(node)) {
      // Look for the symbol in the current scope chain
      let scope = this.currentScope;
      while (scope) {
        if (scope.symbols.has(node.text)) {
          const sym = scope.symbols.get(node.text);
          if (sym.node && ts.isVariableDeclaration(sym.node) && sym.node.initializer) {
            if (ts.isStringLiteral(sym.node.initializer)) {
              return sym.node.initializer.text;
            }
          }
        }
        scope = scope.parent;
      }
    } else if (ts.isStringLiteral(node)) {
      return node.text;
    }
    return null;
  }

  handleNamedDeclaration(node, fileNode, sourceFile) {
    if (this.hasExportModifier(node)) {
      const isDefault = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
      const name = isDefault ? 'default' : (node.name?.text || 'anonymous');
      
      if (!this.context.exportRegistry) this.context.exportRegistry = new Map();
      const currentFile = sourceFile.fileName;
      if (!this.context.exportRegistry.has(currentFile)) this.context.exportRegistry.set(currentFile, new Set());
      if (name !== 'anonymous') this.context.exportRegistry.get(currentFile).add(name);

      const exportInfo = {
        type: ts.SyntaxKind[node.kind].toLowerCase().replace('declaration', ''),
        start: node.getStart(sourceFile),
        end: node.getEnd()
      };
      
      fileNode.internalExports.set(name, exportInfo);

      // Extract members from object literals in variable exports
      if (ts.isVariableDeclaration(node) && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
        exportInfo.members = node.initializer.properties
          .map(p => {
            let mName = null;
            if (p.name && ts.isIdentifier(p.name)) {
                mName = p.name.text;
            } else if (p.name && ts.isComputedPropertyName(p.name)) {
                // UPGRADE 6: Constant Folding for Computed Keys
                mName = this.resolveConstantValue(p.name.expression, sourceFile);
            }
            
            if (!mName) return null;

            const mLoc = sourceFile.getLineAndCharacterOfPosition(p.getStart(sourceFile));
            fileNode.symbolSourceLocations.set(`${name}.${mName}`, { line: mLoc.line + 1, column: mLoc.character + 1 });
            fileNode.instantiatedIdentifiers.add(mName);
            return {
                name: mName,
                type: 'property',
                isPublic: true, // Object properties are usually public
                start: p.getStart(sourceFile),
                end: p.getEnd()
            };
          })
          .filter(Boolean);
      }

      if (ts.isEnumDeclaration(node)) {
        exportInfo.members = node.members.map(m => ({
          name: m.name.getText(sourceFile),
          type: 'enumMember',
          start: m.getStart(sourceFile),
          end: m.getEnd()
        }));
      } else       if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
        exportInfo.members = node.members
          .filter(m => m.name)
          .map(m => {
            const mName = m.name.getText(sourceFile);
            const mLoc = sourceFile.getLineAndCharacterOfPosition(m.getStart(sourceFile));
            fileNode.symbolSourceLocations.set(`${name}.${mName}`, { line: mLoc.line + 1, column: mLoc.character + 1 });
            fileNode.instantiatedIdentifiers.add(mName);
            const isPrivate = m.modifiers?.some(mod => mod.kind === ts.SyntaxKind.PrivateKeyword);
            return {
              name: mName,
              type: ts.SyntaxKind[m.kind].toLowerCase(),
              isPublic: !isPrivate,
              start: m.getStart(sourceFile),
              end: m.getEnd()
            };
          });
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
          this.handleNamedDeclaration(decl, fileNode, sourceFile);
        } else if (decl.name && ts.isObjectBindingPattern(decl.name)) {
           decl.name.elements.forEach(element => {
               if(element.name && ts.isIdentifier(element.name)) {
                   const name = element.name.text;
                   fileNode.internalExports.set(name, { type: 'variable', start: node.getStart(sourceFile), end: node.getEnd() });
                   const loc = sourceFile.getLineAndCharacterOfPosition(element.getStart(sourceFile));
                   fileNode.symbolSourceLocations.set(name, { line: loc.line + 1, column: loc.character + 1 });
                   this.addDeclaredSymbol(name, element, sourceFile);
               }
           });
        }
      });
    }
  }

  handleCallExpression(node, fileNode, sourceFile) {
    if (this.context.verbose) console.log(`[AST-DEBUG] Checking CallExpression in ${fileNode.filePath}`);
    // Dynamic import(): import('./module')
    if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = node.arguments[0];
      if (arg) {
        if (ts.isStringLiteral(arg)) {
          const specifier = arg.text;
          fileNode.explicitImports.add(specifier);
          fileNode.dynamicImports.add(specifier);
          fileNode.importedSymbols.add(`${specifier}:*`);
          if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
            fileNode.externalPackageUsage.add(this._extractPackageName(specifier));
          }
        } else {
          // Non-literal dynamic import
          if (!fileNode.calculatedDynamicImports) fileNode.calculatedDynamicImports = [];
          fileNode.calculatedDynamicImports.push({ kind: ts.SyntaxKind[arg.kind], start: arg.getStart(sourceFile) });
          
          // UPGRADE 2: Try to perform Glob-Analysis on Template Strings
          this.handlePartialEvaluation(arg, fileNode, sourceFile);
        }
      }
    } else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      if (this.context.verbose) console.log(`[AST-DEBUG] Found require() call in ${fileNode.filePath}`);
      const arg = node.arguments[0];
      if (arg && ts.isStringLiteral(arg)) {
        if (this.context.verbose) console.log(`[AST-DEBUG] Added import: ${arg.text}`);
        fileNode.explicitImports.add(arg.text);
      }
    }
  }

  /**
   * UPGRADE 2: Partial Evaluation for dynamic imports.
   * Detects pattern like import(`./dynamic/${name}.js`) and marks the directory as potentially used.
   */
  handlePartialEvaluation(node, fileNode, sourceFile) {
    if (ts.isTemplateExpression(node)) {
      const head = node.head.text;
      if (head.startsWith('./') || head.startsWith('../')) {
        // Pattern: `./directory/${variable}`
        const dirPath = path.dirname(head);
        if (dirPath && dirPath !== '.') {
          if (!fileNode.globImports) fileNode.globImports = new Set();
          fileNode.globImports.add(dirPath);
        }
      }
    }
  }

  handleJsxElement(node, fileNode, sourceFile) {
    const tagName = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
    if (ts.isIdentifier(tagName)) {
      fileNode.jsxComponents.add(tagName.text);
      fileNode.instantiatedIdentifiers.add(tagName.text);
    }
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
    fileNode.instantiatedIdentifiers.add(decoratorName);
  }

  hasExportModifier(node) {
    if (ts.isVariableDeclaration(node)) {
      return this.hasExportModifier(node.parent.parent);
    }
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

  _extractPackageName(specifier) {
    if (specifier.startsWith('@')) {
      const parts = specifier.split('/');
      return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
    }
    return specifier.split('/')[0];
  }

  // UPGRADE: CommonJS module.exports / exports detection
  handleAssignmentExpressionPass1(node, fileNode, sourceFile) {
    if (ts.isExpressionStatement(node)) {
      const expr = node.expression;
      if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const left = expr.left;
        const right = expr.right;
        
        if (ts.isPropertyAccessExpression(left)) {
          const obj = left.expression;
          const prop = left.name;
          
          // module.exports = ...
          if (ts.isIdentifier(obj) && obj.text === 'module' &&
              ts.isIdentifier(prop) && prop.text === 'exports') {
            fileNode.internalExports.set('default', { type: 'default', start: left.getStart(sourceFile), end: left.getEnd() });
            
            // Handle module.exports = { a, b }
            if (ts.isObjectLiteralExpression(right)) {
              right.properties.forEach(p => {
                if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) {
                  fileNode.internalExports.set(p.name.text, { type: 'variable', start: p.getStart(sourceFile), end: p.getEnd() });
                } else if (ts.isShorthandPropertyAssignment(p)) {
                  fileNode.internalExports.set(p.name.text, { type: 'variable', start: p.getStart(sourceFile), end: p.getEnd() });
                }
              });
            }
          }
          // exports.name = ...
          else if (ts.isIdentifier(obj) && obj.text === 'exports') {
            fileNode.internalExports.set(prop.text, { type: 'variable', start: left.getStart(sourceFile), end: left.getEnd() });
          }
          // module.exports.name = ...
          else if (ts.isPropertyAccessExpression(obj) &&
                   ts.isIdentifier(obj.expression) && obj.expression.text === 'module' &&
                   ts.isIdentifier(obj.name) && obj.name.text === 'exports') {
            fileNode.internalExports.set(prop.text, { type: 'variable', start: left.getStart(sourceFile), end: left.getEnd() });
          }
        }
      }
    }
  }
}
