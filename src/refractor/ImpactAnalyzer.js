import path from 'path';
import fs from 'fs/promises';

/**
 * Cross-Reference Dependency Matrix & Breakage Risk Auditor
 * Traces dynamic runtime usage patterns to prevent code pruning from breaking downstream systems.
 */
export class ImpactAnalyzer {
  constructor(context) {
    this.context = context;
    this.safetyOverlays = [/\.json$/, /\.json5$/, /\.html$/, /\.yaml$/, /\.yml$/];
  }

  /**
   * Scans non-code assets and dynamic lookups to check if an unused export is needed elsewhere.
   * @param {string} originFile - Absolute path of component housing target symbol
   * @param {string} symbolName - Literal identifier being evaluated for deletion
   * @param {Map} projectGraph - Full project structural graph representation
   */
  async verifyRefactorSafety(originFile, symbolName, projectGraph) {
    // Avoid dropping generic single letter tokens or framework primitives
    if (symbolName === 'default' || symbolName.length <= 2) {
      return { isSafeToPrune: false, blockReason: 'PROTECTED_SYSTEM_CONTRACT_KEYWORD' };
    }

    // Rule 1: Check across all code files for loose string-based token references
    for (const [filePath, fileNode] of projectGraph.entries()) {
      if (filePath === originFile) continue;

      // If the symbol name is explicitly referenced in an element lookup or template slice, flag it as risky
      if (fileNode.rawStringReferences && fileNode.rawStringReferences.has(symbolName)) {
        return {
          isSafeToPrune: false,
          blockReason: `LOOSE_STRING_ACCESS_MATCH_FOUND_IN: ${path.relative(this.context.cwd, filePath)}`
        };
      }

      // Check member property chain lookups: customer.profile.billingAddress
      if (fileNode.propertyAccessChains) {
        for (const chain of fileNode.propertyAccessChains) {
          if (chain.endsWith(`.${symbolName}`) || chain.includes(`.${symbolName}.`)) {
            return {
              isSafeToPrune: false,
              blockReason: `DYNAMIC_PROPERTY_ACCESS_CHAIN_HIT: ${chain}`
            };
          }
        }
      }
    }

    // Rule 2: Crawl through external static manifests (JSON metadata, HTML routing templates, workflow files)
    const configurations = await this.gatherMetadataFiles(this.context.cwd);
    
    for (const confPath of configurations) {
      try {
        const payload = await fs.readFile(confPath, 'utf8');
        
        // Match string references inside configuration boundaries
        if (payload.includes(`"${symbolName}"`) || payload.includes(`'${symbolName}'`) || payload.includes(`data-${symbolName}`)) {
          return {
            isSafeToPrune: false,
            blockReason: `METADATA_MANIFEST_DEPENDENCY_FOUND_IN: ${path.relative(this.context.cwd, confPath)}`
          };
        }
      } catch {
        // Read step error; skip unreadable descriptors
      }
    }

    return { isSafeToPrune: true, blockReason: null };
  }

  async gatherMetadataFiles(dir, collected = []) {
    try {
      const entities = await fs.readdir(dir, { withFileTypes: true });
      for (const ent of entities) {
        const resolutionPath = path.join(dir, ent.name);
        
        if (ent.isDirectory()) {
          if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '.entkapp-cache' || ent.name === 'dist') continue;
          await this.gatherMetadataFiles(resolutionPath, collected);
        } else if (ent.isFile()) {
          const actsAsMetaAsset = this.safetyOverlays.some(regex => regex.test(ent.name));
          if (actsAsMetaAsset) {
            collected.push(resolutionPath);
          }
        }
      }
    } catch {}
    return collected;
  }
}
