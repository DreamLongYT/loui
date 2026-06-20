import ts from 'typescript';
import fs from 'fs/promises';

/**
 * Enterprise Wildcard Optimization & Flattening Layer for Barrel Operations
 * Traces unreferenced paths through redistribution entries.
 */
export class BarrelParser {
  constructor(context, resolver) {
    this.context = context; // Enthält globale Konfigurationen (z.B. context.entrypoints)
    this.resolver = resolver;
    this.cachedSpecifications = new Map();
  }

  /**
   * Compiles the structural export layout for a specific index or barrel target.
   * @param {string} filePath - Absolute path to on-disk target element
   */
  async parseBarrelSpecification(filePath) {
    if (this.cachedSpecifications.has(filePath)) {
      return this.cachedSpecifications.get(filePath);
    }

    const specification = {
      isBarrelInstance: false,
      isApplicationEntrypoint: false,     // FIX: Schutzschicht für Einstiegspunkte gegen Fehldetektion
      wildcardExports: new Set(),         // export * from './module';
      namespacedWildcardExports: new Map(), // export * as Utils from './module';
      forwardedNamedExports: new Map(),   // export { token as alias } from './module';
      declaredLocalExports: new Set()      // export const a = 1;
    };

    // FIX: Überprüfe, ob die aktuelle Datei als App-Einstiegspunkt deklariert ist
    if (this.context && this.context.entrypoints) {
      const isEntry = this.context.entrypoints.some(entry => 
        this.resolver.resolveModulePath(filePath, entry) === filePath || entry === filePath
      );
      if (isEntry) {
        specification.isApplicationEntrypoint = true;
      }
    }

    try {
      const code = await fs.readFile(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

      this.harvestExportSignatures(sourceFile, specification);

      // FIX: Eine Datei ist NUR DANN ein rein kosmetisches Barrel, wenn sie Re-Exports besitzt
      // UND NICHT der geschützte Haupteinstiegspunkt (Entrypoint) der Anwendung ist!
      if (!specification.isApplicationEntrypoint && (
          specification.wildcardExports.size > 0 || 
          specification.namespacedWildcardExports.size > 0 || 
          specification.forwardedNamedExports.size > 0
      )) {
        specification.isBarrelInstance = true;
      }

      this.cachedSpecifications.set(filePath, specification);
      return specification;
    } catch {
      return specification; // Error-State fällt auf sicheres Standard-Layout zurück
    }
  }

  harvestExportSignatures(node, spec) {
    if (!node) return;

    switch (node.kind) {
      case ts.SyntaxKind.ExportDeclaration: {
        const targetSpecifier = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : null;

        if (targetSpecifier) {
          if (!node.exportClause) {
            // Standard Wildcard Transfer: export * from './module';
            spec.wildcardExports.add(targetSpecifier);
          } else if (ts.isNamespaceExport(node.exportClause)) {
            // Namespaced Wildcard Transfer: export * as Core from './module';
            const namespaceAlias = node.exportClause.name.text;
            spec.namespacedWildcardExports.set(namespaceAlias, targetSpecifier);
          } else if (ts.isNamedExports(node.exportClause)) {
            // Selective Re-export Forwarding: export { x, y as z } from './module';
            node.exportClause.elements.forEach(element => {
              const originalSymbol = element.propertyName ? element.propertyName.text : element.name.text;
              const exposedAlias = element.name.text;
              spec.forwardedNamedExports.set(exposedAlias, {
                targetModule: targetSpecifier,
                sourceSymbol: originalSymbol
              });
            });
          }
        }
        break;
      }

      // Track items declared directly within the file boundary
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.InterfaceDeclaration:
      case ts.SyntaxKind.TypeAliasDeclaration:
      case ts.SyntaxKind.EnumDeclaration: {
        if (node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
          if (node.name && ts.isIdentifier(node.name)) {
            spec.declaredLocalExports.add(node.name.text);
          }
        }
        break;
      }

      case ts.SyntaxKind.VariableStatement: {
        if (node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
          node.declarationList.declarations.forEach(decl => {
            if (ts.isIdentifier(decl.name)) {
              spec.declaredLocalExports.add(decl.name.text);
            } else if (ts.isObjectBindingPattern(decl.name)) {
              decl.name.elements.forEach(element => {
                if (element.name && ts.isIdentifier(element.name)) {
                  spec.declaredLocalExports.add(element.name.text);
                }
              });
            } else if (ts.isArrayBindingPattern(decl.name)) {
              decl.name.elements.forEach(element => {
                if (ts.isBindingElement(element) && element.name && ts.isIdentifier(element.name)) {
                  spec.declaredLocalExports.add(element.name.text);
                }
              });
            }
          });
        }
        break;
      }

      case ts.SyntaxKind.ExportAssignment: {
        spec.declaredLocalExports.add('default');
        break;
      }
    }

    ts.forEachChild(node, child => this.harvestExportSignatures(child, spec));
  }

  /**
   * Challenge #3 Resolution Logic. Unwraps nested redistribution links to find origin source nodes.
   * @param {string} contextFilePath - Current position filename vector pointer
   * @param {string} targetSymbolName - Targeted semantic variable signature name
   * @param {Map} activeProjectGraph - Global active module maps directory registry
   * @param {Set} [protectionStack] - Avoids cyclic validation traps inside self-referencing links
   */
  async determineSymbolDeclarationOrigin(contextFilePath, targetSymbolName, activeProjectGraph, protectionStack = new Set()) {
    if (protectionStack.has(contextFilePath)) {
      return { originFile: contextFilePath, originSymbol: targetSymbolName };
    }
    protectionStack.add(contextFilePath);

    const spec = await this.parseBarrelSpecification(contextFilePath);
    if (!spec.isBarrelInstance) {
      return { originFile: contextFilePath, originSymbol: targetSymbolName };
    }

    // Rule A: Settle boundary immediately if local declaration matches token signature name
    if (spec.declaredLocalExports.has(targetSymbolName)) {
      return { originFile: contextFilePath, originSymbol: targetSymbolName };
    }

    // Rule B: Evaluate explicit named re-export mappings (export { A as B } from 'module')
    if (spec.forwardedNamedExports.has(targetSymbolName)) {
      const routingRule = spec.forwardedNamedExports.get(targetSymbolName);
      const fullyResolvedPath = this.resolver.resolveModulePath(contextFilePath, routingRule.targetModule);
      if (fullyResolvedPath) {
        return this.determineSymbolDeclarationOrigin(fullyResolvedPath, routingRule.sourceSymbol, activeProjectGraph, protectionStack);
      }
    }

    // Rule C: Evaluate structural namespace alias groupings (export * as name from 'module')
    for (const [namespaceAlias, relativeModule] of spec.namespacedWildcardExports.entries()) {
      if (targetSymbolName === namespaceAlias) {
          const fullyResolvedPath = this.resolver.resolveModulePath(contextFilePath, relativeModule);
          return { originFile: fullyResolvedPath, originSymbol: '*' };
      }
      if (targetSymbolName.startsWith(`${namespaceAlias}.`)) {
        const originalSymbol = targetSymbolName.substring(namespaceAlias.length + 1);
        const fullyResolvedPath = this.resolver.resolveModulePath(contextFilePath, relativeModule);
        if (fullyResolvedPath) {
          return this.determineSymbolDeclarationOrigin(fullyResolvedPath, originalSymbol, activeProjectGraph, protectionStack);
        }
      }
    }

    // Rule D: Sweep through anonymous star re-exports vectors (export * from 'module')
    for (const relativePath of spec.wildcardExports) {
      const fullyResolvedPath = this.resolver.resolveModulePath(contextFilePath, relativePath);
      
      if (fullyResolvedPath) {
        // Verbinde Graph-Kanten direkt während der Wildcard-Traversierung
        const contextNode = activeProjectGraph.get(contextFilePath);
        if (contextNode) {
          contextNode.outgoingEdges.add(fullyResolvedPath);
          const targetNode = activeProjectGraph.get(fullyResolvedPath);
          if (targetNode) {
            targetNode.incomingEdges.add(contextFilePath);
          }
        }

        const continuousResolutionTrace = await this.determineSymbolDeclarationOrigin(
          fullyResolvedPath,
          targetSymbolName,
          activeProjectGraph,
          new Set(protectionStack) // Kopie verhindert geschwisterliche Branch-Blockaden
        );

        if (!continuousResolutionTrace) continue;
        if (continuousResolutionTrace.originFile === contextFilePath) continue;

        const originSpec = await this.parseBarrelSpecification(continuousResolutionTrace.originFile);
        if (originSpec.declaredLocalExports.has(continuousResolutionTrace.originSymbol) || 
            continuousResolutionTrace.originSymbol === '*') {
          return continuousResolutionTrace;
        }

        if (originSpec.isBarrelInstance) {
          return continuousResolutionTrace;
        }
      }
    }

    return { originFile: contextFilePath, originSymbol: targetSymbolName };
  }
}