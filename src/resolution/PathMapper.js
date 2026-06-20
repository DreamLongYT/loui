import fs from 'fs';
import path from 'path';

export class PathMapper {
  constructor(context) { 
    this.context = context; 
  }
  
  async loadMappings() {
    // Hier können später tsconfig-Pfade geladen werden
  }

  /**
   * Resolves physical module paths on disk, translating modern .js imports 
   * back to their actual TypeScript source files.
   * @param {string} p - The target module specifier or absolute path
   */
  resolvePath(p) {
    if (!p || typeof p !== 'string') return p;

    // FIX 1: Wenn der Import auf .js endet, übersetze ihn für die Suche auf .ts
    if (p.endsWith('.js')) {
      const tsPath = p.slice(0, -3) + '.ts';
      if (fs.existsSync(tsPath)) return tsPath;
    }

    // FIX 2: Wenn der Import auf .jsx endet, übersetze ihn für die Suche auf .tsx
    if (p.endsWith('.jsx')) {
      const tsxPath = p.slice(0, -4) + '.tsx';
      if (fs.existsSync(tsxPath)) return tsxPath;
    }

    // FIX 3: Unterstützung für Verzeichnis-Imports (z.B. ./adapters -> ./adapters/index.ts)
    try {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        for (const ext of extensions) {
          const indexPath = path.join(p, `index${ext}`);
          if (fs.existsSync(indexPath)) return indexPath;
        }
      }
    } catch {
      // Datei existiert nicht oder ist kein Verzeichnis, fahre mit Standard fort
    }

    return p; 
  }
}
