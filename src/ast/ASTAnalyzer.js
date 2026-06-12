import ts from 'typescript';
import fs from 'fs/promises';
import crypto from 'crypto';

/**
 * Enterprise AST Syntax Walker & Feature Extractor
 * Utilizes the official TypeScript Compiler infrastructure to execute deeply nested
 * node classification without falling back to high-risk regular expression approximations.
 */
export class ASTAnalyzer {
  constructor(context) {
    this.context = context;
    // Standard high-entropy baseline selectors for AST variable tracking
    this.entropyThreshold = 4.3;
  }

  /**
   * Parses target file data into an isolated AST representation and populates metadata structures.
   * @param {string} filePath - Absolute path to on-disk component
   * @param {Object} fileNode - In-memory structural graph reference node
   */
  async processFile(filePath, fileNode) {
    try {
      const sourceText = await fs.readFile(filePath, 'utf8');
      
      // Configure target extraction structures to parse TS, JSX, and modern TC39 specifications
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true, // Ensure parent pointers are bound to allow localized subtree walking
        this.getScriptKind(filePath)
      );

      this.walkNode(sourceFile, sourceFile, fileNode);
      this.extractTopLevelJSDocSuppreessions(sourceFile, fileNode);
      
      return true;
    } catch (parseError) {
      if (this.context.verbose) {
        console.error(`[AST Open Error] Failed compilation validation mapping on element: ${filePath}. Reason: ${parseError.message}`);
      }
      return false;
    }
  }

  /**
   * Primary node walker loop executing atomic switch classifications.
   * Challenge #7: Resolves conditional/destructured references to prevent cascading breakages.
   */
  walkNode(sourceFile, node, fileNode) {
    if (!node) return;

    switch (node.kind) {
      // Handle Explicit Named or Absolute Star Namespace Imports
      case ts.SyntaxKind.ImportDeclaration: {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          const specifier = node.moduleSpecifier.text;
          fileNode.explicitImports.add(specifier);

          if (node.importClause) {
            // Trace named bounds: import { activeToken } from 'module';
            if (node.importClause.namedBindings) {
              if (ts.isNamedImports(node.importClause.namedBindings)) {
                node.importClause.namedBindings.elements.forEach(element => {
                  const importedName = element.name.text;
                  const propertyName = element.propertyName ? element.propertyName.text : importedName;
                  fileNode.importedSymbols.add(`${specifier}:${propertyName}`);
                });
              } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                // Tracking total wildcard imports: import * as layout from 'module';
                fileNode.importedSymbols.add(`${specifier}:*`);
              }
            }
            // Trace default bounds: import React from 'react';
            if (node.importClause.name) {
              fileNode.importedSymbols.add(`${specifier}:default`);
            }
          }
        }
        break;
      }

      // Handle Explicit Namespace Requirements: import config = require('./config');
      case ts.SyntaxKind.ImportEqualsDeclaration: {
        if (node.moduleReference && ts.isExternalModuleReference(node.moduleReference)) {
          if (node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
            fileNode.explicitImports.add(node.moduleReference.expression.text);
          }
        }
        break;
      }

      // Challenge #1: Tracking dynamic expressions e.g., import('./chunks/' + variant)
      case ts.SyntaxKind.CallExpression: {
        if (node.expression && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          const firstArgument = node.arguments[0];
          if (firstArgument) {
            if (ts.isStringLiteral(firstArgument)) {
              fileNode.explicitImports.add(firstArgument.text);
              fileNode.dynamicImports.add(firstArgument.text);
            } else {
              // Deeply trace runtime calculated variables within the import parameters call
              const stringPatterns = [];
              this.traceStringExpressions(firstArgument, stringPatterns);
              fileNode.calculatedDynamicImports.push({
                rawText: firstArgument.getText(sourceFile),
                heuristics: stringPatterns,
                position: node.getStart(sourceFile)
              });
            }
          }
        }
        break;
      }

      // Handle Variable Declaration Assignments & Challenge #11 (AST Secret Scanning)
      case ts.SyntaxKind.VariableDeclaration: {
        if (node.name && ts.isIdentifier(node.name)) {
          this.auditAssignmentSafety(node.name.text, node.initializer, fileNode, sourceFile);
        } else if (node.name && (ts.isObjectBindingPattern(node.name) || ts.isArrayBindingPattern(node.name))) {
          // Flatten binding properties to map destructured usage accurately
          node.name.elements.forEach(element => {
            if (element.name && ts.isIdentifier(element.name)) {
              this.auditAssignmentSafety(element.name.text, null, fileNode, sourceFile);
            }
          });
        }
        break;
      }

      // Handle Named Function Node Exports Matrix Configurations
      case ts.SyntaxKind.FunctionDeclaration: {
        if (node.name && ts.isIdentifier(node.name)) {
          const name = node.name.text;
          if (this.hasExportModifier(node)) {
            fileNode.internalExports.set(name, { type: 'function', start: node.getStart(sourceFile), end: node.getEnd() });
          }
        }
        break;
      }

      // Handle Structural Class Definitions and Class Export Signatures
      case ts.SyntaxKind.ClassDeclaration: {
        if (node.name && ts.isIdentifier(node.name)) {
          const name = node.name.text;
          if (this.hasExportModifier(node)) {
            fileNode.internalExports.set(name, { type: 'class', start: node.getStart(sourceFile), end: node.getEnd() });
          }
        }
        break;
      }

      // Handle Interface Definitions (Crucial for Challenge #10: Type Integrity Mapping)
      case ts.SyntaxKind.InterfaceDeclaration: {
        if (node.name && ts.isIdentifier(node.name)) {
          const name = node.name.text;
          if (this.hasExportModifier(node)) {
            fileNode.internalExports.set(name, { type: 'interface', start: node.getStart(sourceFile), end: node.getEnd() });
          }
        }
        break;
      }

      // Handle Type Invocations and Declarations Aliases
      case ts.SyntaxKind.TypeAliasDeclaration: {
        if (node.name && ts.isIdentifier(node.name)) {
          const name = node.name.text;
          if (this.hasExportModifier(node)) {
            fileNode.internalExports.set(name, { type: 'type-alias', start: node.getStart(sourceFile), end: node.getEnd() });
          }
        }
        break;
      }

      // Handle Explicit Export Assignments: export default baselineConfiguration;
      case ts.SyntaxKind.ExportAssignment: {
        const name = node.expression ? node.expression.getText(sourceFile) : 'default';
        fileNode.internalExports.set('default', { 
          type: 'default-assignment', 
          referencedSymbol: name,
          start: node.getStart(sourceFile), 
          end: node.getEnd() 
        });
        break;
      }

      // Handle Arbitrary String References to catch deep framework routing or dynamic keys
      case ts.SyntaxKind.StringLiteral: {
        const text = node.text;
        if (text.length > 2 && text.length < 120) {
          fileNode.rawStringReferences.add(text);
        }
        break;
      }

      // Track general identifiers to register references to mapped import keys
      case ts.SyntaxKind.Identifier: {
        const idText = node.text;
        // Avoid adding declarations to usage logs to keep verification accurate
        if (!this.isNodeDeclarationName(node)) {
          fileNode.instantiatedIdentifiers.add(idText);
        }
        break;
      }
    }

    // Traverse recursively down the Node structural tree
    ts.forEachChild(node, child => this.walkNode(sourceFile, child, fileNode));
  }

  /**
   * Challenge #1: Evaluates math operations and template configurations inside dynamic imports.
   */
  traceStringExpressions(node, collector) {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      this.traceStringExpressions(node.left, collector);
      this.traceStringExpressions(node.right, collector);
    } else if (ts.isStringLiteral(node)) {
      collector.push({ type: 'literal', val: node.text });
    } else if (ts.isTemplateExpression(node)) {
      if (node.head) collector.push({ type: 'template-slice', val: node.head.text });
      node.templateSpans.forEach(span => {
        collector.push({ type: 'dynamic-var', val: span.expression.getText() });
        if (span.literal) collector.push({ type: 'template-slice', val: span.literal.text });
      });
    } else {
      collector.push({ type: 'computed-variable', val: node.getText() });
    }
  }

  /**
   * Challenge #11: AST Secret Scanning. Evaluates entropy and patterns directly via assignments.
   */
  auditAssignmentSafety(variableName, initializer, fileNode, sourceFile) {
    // Process variable mapping target indicators first
    if (this.hasExportModifier(variableName?.parent)) {
      fileNode.internalExports.set(variableName, { type: 'variable', start: variableName.parent.getStart(sourceFile), end: variableName.parent.getEnd() });
    }

    if (!initializer || !ts.isStringLiteral(initializer)) return;
    const value = initializer.text;

    // Challenge #11 Heuristic validation parameters matching variable patterns or contents values
    const isSuspiciousKeyName = /api_?key|secret|token|password|auth_?token|private_?key/i.test(variableName);
    const entropy = this.calculateShannonEntropy(value);

    if ((isSuspiciousKeyName && value.length > 8) || (entropy > this.entropyThreshold && value.length > 16)) {
      fileNode.securityThreats.push({
        identifier: variableName,
        entropy: parseFloat(entropy.toFixed(2)),
        position: initializer.getStart(sourceFile),
        riskCode: 'HIGH_RISK_SECRET_LEAK'
      });
    }
  }

  calculateShannonEntropy(str) {
    const map = {};
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      map[char] = (map[char] || 0) + 1;
    }
    let entropy = 0;
    for (const char in map) {
      const p = map[char] / str.length;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  /**
   * Challenge #18 & #8: Parse JSDoc suppression blocks right out of code statements.
   */
  extractTopLevelJSDocSuppreessions(sourceFile, fileNode) {
    const fullText = sourceFile.text;
    const commentRanges = ts.getLeadingCommentRanges(fullText, 0) || [];
    
    for (const range of commentRanges) {
      const comment = fullText.slice(range.pos, range.end);
      const matches = comment.match(/@scaffold-suppress\s+([a-zA-Z0-9_\-*:]+)/g);
      if (matches) {
        matches.forEach(m => {
          const directive = m.replace('@scaffold-suppress', '').trim();
          fileNode.localSuppressedRules.add(directive);
        });
      }
    }
  }

  hasExportModifier(node) {
    if (!node || !node.modifiers) return false;
    return node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
  }

  isNodeDeclarationName(node) {
    const parent = node.parent;
    if (!parent) return false;
    if (ts.isVariableDeclaration(parent) && parent.name === node) return true;
    if (ts.isFunctionDeclaration(parent) && parent.name === node) return true;
    if (ts.isClassDeclaration(parent) && parent.name === node) return true;
    if (ts.isInterfaceDeclaration(parent) && parent.name === node) return true;
    if (ts.isImportSpecifier(parent) && parent.name === node) return true;
    return false;
  }

  getScriptKind(filePath) {
    if (filePath.endsWith('.ts')) return ts.ScriptKind.TS;
    if (filePath.endsWith('.tsx')) return ts.ScriptKind.TSX;
    if (filePath.endsWith('.jsx')) return ts.ScriptKind.JSX;
    return ts.ScriptKind.JS;
  }
}
