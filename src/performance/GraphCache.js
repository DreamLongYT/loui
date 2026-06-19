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
    this.cacheDir = context.cacheDir || path.join(context.cwd, '.entkapp-cache');
    this.manifestPath = path.join(this.cacheDir, 'graph-manifest.json');
  }

  /**
   * Clears the entire cache directory to ensure a fresh analysis run.
   */
  async clearCache() {
    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
      if (this.context.verbose) {
        console.log(`🧹 Cache cleared at: ${this.cacheDir}`);
      }
    } catch (err) {
      if (this.context.verbose) {
        console.error(`🚨 Failed to clear cache: ${err.message}`);
      }
    }
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
        externalPackageUsage: Array.from(node.externalPackageUsage),
        isEntry: node.isEntry,
        isFrameworkComponent: node.isFrameworkComponent,
        calculatedDynamicImports: node.calculatedDynamicImports || [],
        globImports: node.globImports || []
      };
    }

    try {
      const cacheDir = path.dirname(this.manifestPath);
      await fs.mkdir(cacheDir, { recursive: true });
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
