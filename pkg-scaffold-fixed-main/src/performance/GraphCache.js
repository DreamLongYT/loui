import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * High-Performance Graph State Persistence & Delta Hash Registry
 * Automatically bypasses the AST compilation layer for unmodified files.
 */
export class IncrementalCacheManager {
  constructor(context) {
    this.context = context;
    this.manifestPath = path.join(context.cacheDir, 'graph-manifest.json');
  }

  /**
   * Computes a highly efficient SHA-256 hash checksum of a file directly from raw buffers.
   * @param {string} filePath - Absolute path to the on-disk source component
   */
  async computeHash(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch {
      return '';
    }
  }

  /**
   * Loads the serialized manifest from disk, fallback to empty layout if unreadable.
   * @returns {Promise<Object>} Mapped compilation cache states index
   */
  async loadCacheManifest() {
    try {
      await fs.access(this.manifestPath);
      const rawText = await fs.readFile(this.manifestPath, 'utf8');
      return JSON.parse(rawText);
    } catch {
      if (this.context.verbose) {
        console.log('✨ No structural performance cache found. Initializing a clean baseline manifest entry.');
      }
      return {};
    }
  }

  /**
   * Serializes the current active dependency graph, translating Maps and Sets into JSON schemas.
   * @param {Map<string, Object>} currentGraphState - In-memory structural project state map
   */
  async saveCacheManifest(currentGraphState) {
    const serializationOutput = {};

    for (const [absolutePath, node] of currentGraphState.entries()) {
      // Do not cache external configuration manifests like package.json
      if (absolutePath.endsWith('package.json')) continue;

      serializationOutput[absolutePath] = {
        hash: node.contentHash,
        isLibraryEntry: node.isLibraryEntry,
        explicitImports: Array.from(node.explicitImports),
        dynamicImports: Array.from(node.dynamicImports),
        importedSymbols: Array.from(node.importedSymbols),
        rawStringReferences: Array.from(node.rawStringReferences),
        instantiatedIdentifiers: Array.from(node.instantiatedIdentifiers),
        propertyAccessChains: Array.from(node.propertyAccessChains),
        internalExports: Object.fromEntries(node.internalExports),
        securityThreats: node.securityThreats || [],
        localSuppressedRules: Array.from(node.localSuppressedRules),
        symbolSourceLocations: Object.fromEntries(node.symbolSourceLocations),
        externalPackageUsage: Array.from(node.externalPackageUsage)
      };
    }

    try {
      await fs.writeFile(
        this.manifestPath, 
        JSON.stringify(serializationOutput, null, 2), 
        'utf8'
      );
    } catch (writeError) {
      if (this.context.verbose) {
        console.error(`🚨 [Cache Writer Instability] Failed to commit manifest log indices: ${writeError.message}`);
      }
    }
  }
}
