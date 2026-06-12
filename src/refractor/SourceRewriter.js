import ts from 'typescript';
import fs from 'fs/promises';

/**
 * Format-Preserving Abstract Syntax Tree Source Mutation Engine
 * Executes targeted updates using token position logic while preserving trivia (comments/JSDoc).
 */
export class SourceRewriter {
  constructor(context) {
    this.context = context;
  }

  /**
   * Removes a specific named export symbol declaration block from code text.
   * @param {string} filePath - Absolute path to on-disk code component
   * @param {string} symbolName - Target export key to prune
   * @param {Object} exportMeta - Mapped token offset indices (start/end offsets)
   */
  async stripNamedExportSignature(filePath, symbolName, exportMeta) {
    const rawSource = await fs.readFile(filePath, 'utf8');
    
    // Case A: Token is grouped inside a multi-export destructured statement block: export { a, b, c };
    if (exportMeta.type === 'named') {
      const updatedText = this.pruneFromSharedExportClause(rawSource, symbolName, exportMeta);
      if (updatedText) return updatedText;
    }

    // Case B: Isolated node removal. Calculate indices from start to end while preserving comments.
    const startOffset = exportMeta.start;
    const endOffset = exportMeta.end;

    // Split source without dropping trailing line structural punctuation or text formatting configurations
    const prefix = rawSource.slice(0, startOffset);
    let suffix = rawSource.slice(endOffset);

    // Clean up trailing commas or semicolons to prevent syntax errors
    if (suffix.startsWith(';') || suffix.startsWith(',')) {
      suffix = suffix.slice(1);
    }

    return prefix + suffix;
  }

  /**
   * Handles selective pruning of export elements within inline groupings like `export { x, y as z }`.
   */
  pruneFromSharedExportClause(sourceText, symbolName, meta) {
    // Find the enclosing export declaration node using structural boundaries
    const sourceFile = ts.createSourceFile(
      'temp.ts',
      sourceText,
      ts.ScriptTarget.Latest,
      true
    );

    let targetText = null;

    const findAndPrune = (node) => {
      if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
        const start = node.getStart(sourceFile);
        const end = node.getEnd();

        // Check if the target node spans the exact offset coordinates of the dead symbol
        if (meta.start >= start && meta.end <= end) {
          const activeElements = node.exportClause.elements;
          const keptSymbols = activeElements
            .filter(el => el.name.text !== symbolName)
            .map(el => el.getText(sourceFile));

          if (keptSymbols.length === 0) {
            // Drop the entire declaration block if no active exports remain inside it
            targetText = sourceText.slice(0, start) + sourceText.slice(end);
          } else {
            // Rewrite the export group inline, preserving formatting and comments
            const reconstructedClause = `export { ${keptSymbols.join(', ')} };`;
            targetText = sourceText.slice(0, start) + reconstructedClause + sourceText.slice(end);
          }
        }
      }
      ts.forEachChild(node, findAndPrune);
    };

    findAndPrune(sourceFile);
    return targetText;
  }
}
