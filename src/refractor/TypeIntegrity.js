import ts from 'typescript';
import fs from 'fs/promises';
import path from 'path';

/**
 * Ambient Type Declaration (`.d.ts`) Alignment Supervisor
 * Updates declaration mapping entries to keep compiler checks stable.
 */
export class TypeIntegrity {
  constructor(context) {
    this.context = context;
  }

  /**
   * Re-evaluates ambient files to verify type alignment after optimization changes.
   * @param {string} sourceFilePath - Absolute filename target context location
   * @param {string} prunedSymbolName - Target variable token removed from active source graph
   */
  async synchronizeDeclarationFile(sourceFilePath, prunedSymbolName) {
    const fileDirectory = path.dirname(sourceFilePath);
    const baselineName = path.basename(sourceFilePath, path.extname(sourceFilePath));
    
    // Map standard ambient types build output combinations
    const declarationTargets = [
      path.join(fileDirectory, `${baselineName}.d.ts`),
      path.join(this.context.cwd, 'dist', `${baselineName}.d.ts`),
      path.join(this.context.cwd, 'types', `${baselineName}.d.ts`)
    ];

    for (const dtsPath of declarationTargets) {
      try {
        await fs.access(dtsPath);
        const code = await fs.readFile(dtsPath, 'utf8');
        
        const sourceFile = ts.createSourceFile(
          dtsPath,
          code,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TS
        );

        const replacementIntervals = [];
        this.inspectDtsNodes(sourceFile, prunedSymbolName, replacementIntervals);

        if (replacementIntervals.length > 0) {
          let updatedDtsText = code;
          // Apply substring text deletions from back to front to keep offset indexes accurate
          replacementIntervals.sort((a, b) => b.start - a.start);
          
          for (const interval of replacementIntervals) {
            updatedDtsText = updatedDtsText.slice(0, interval.start) + updatedDtsText.slice(interval.end);
          }

          await fs.writeFile(dtsPath, updatedDtsText, 'utf8');
        }
      } catch {
        // Declaration file variation target absent; proceed to fallback check routes
      }
    }
  }

  inspectDtsNodes(node, matchSymbol, intervals) {
    if (!node) return;

    // Match type mutations inside ambient structural parameters
    if (ts.isExportSpecifier(node) && node.name.text === matchSymbol) {
      intervals.push({ start: node.getStart(), end: node.getEnd() });
    } else if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name && node.name.text === matchSymbol) {
      intervals.push({ start: node.getStart(), end: node.getEnd() });
    }

    ts.forEachChild(node, child => this.inspectDtsNodes(child, matchSymbol, intervals));
  }
}
