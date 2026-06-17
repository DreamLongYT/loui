import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

/**
 * Monorepo Cross-Linking Topology Manager
 * Maps sub-package structural boundaries across pnpm, Yarn, or npm workspaces.
 *
 * Improvements over v1:
 * - Auto-activates workspace mode when workspace config is detected (no manual flag required)
 * - Supports deeper glob patterns beyond simple `packages/*` (e.g. `apps/*`, `libs/**`)
 * - Correctly registers workspace package names as "used" so they are never flagged as unused deps
 * - Handles Bun workspaces (workspaces array in package.json)
 * - Resolves subpath imports for workspace packages (e.g. `@scope/pkg/utils`)
 * - Exposes `markWorkspacePackagesAsUsed()` so the engine can call it after dep audit
 */
export class WorkspaceGraph {
  constructor(context) {
    this.context = context;
    this.packageManifests = new Map(); // Package Name -> { manifestPath, rootDirectory, entryPoints[] }
    this.workspacePackageNames = new Set();
  }

  /**
   * Checks the environment layout to discover and map local workspace packages.
   * This method is idempotent and safe to call multiple times.
   */
  async initializeWorkspaceMesh() {
    const rootPackageJsonPath = path.join(this.context.cwd, 'package.json');
    const pnpmWorkspacePath = path.join(this.context.cwd, 'pnpm-workspace.yaml');
    
    let workspaceGlobs = [];
    this.hoistedDependencies = new Set();

    // Load hoisted dependencies from root package.json
    try {
      const rootPkg = JSON.parse(await fs.readFile(rootPackageJsonPath, 'utf8'));
      const deps = { ...rootPkg.dependencies, ...rootPkg.devDependencies };
      Object.keys(deps).forEach(d => this.hoistedDependencies.add(d));
    } catch (e) {
      // No root package.json or unreadable
    }

    // Protocol A: Check for pnpm workspace configurations (pnpm-workspace.yaml)
    try {
      const yaml = await fs.readFile(pnpmWorkspacePath, 'utf8');
      const lines = yaml.split('\n');
      let insidePackagesBlock = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === 'packages:') {
          insidePackagesBlock = true;
          continue;
        }
        if (insidePackagesBlock) {
          if (trimmed.startsWith('-')) {
            const pattern = trimmed.replace(/^-\s*/, '').replace(/['"]/g, '').trim();
            if (pattern) workspaceGlobs.push(pattern);
          } else if (trimmed && !trimmed.startsWith('#')) {
            // Another top-level key encountered – stop reading packages block
            insidePackagesBlock = false;
          }
        }
      }
    } catch {
      // pnpm structure absent; check package.json workspace array paths instead
    }

    // Protocol B: Check for Yarn/npm/Bun workspaces array inside the root package.json
    if (workspaceGlobs.length === 0) {
      try {
        const pkgText = await fs.readFile(rootPackageJsonPath, 'utf8');
        const pkg = JSON.parse(pkgText);
        if (pkg.workspaces) {
          workspaceGlobs = Array.isArray(pkg.workspaces)
            ? pkg.workspaces
            : (pkg.workspaces.packages || []);
        }
      } catch {
        // No workspaces found
      }
    }

    if (workspaceGlobs.length > 0) {
      this.context.isWorkspaceEnabled = true;
      if (this.context.verbose) {
        console.log(`🌐 Auto-detected monorepo layout with ${workspaceGlobs.length} glob patterns.`);
      }
    } else if (this.context.isWorkspaceEnabled) {
      // Force enabled via flag but no patterns found; default to standard packages/*
      workspaceGlobs = ['packages/*'];
      if (this.context.verbose) {
        console.log(`🌐 Workspace mode forced via flag. Using default patterns: ${workspaceGlobs.join(', ')}`);
      }
    } else {
      return; // Workspace mesh maps skipped for single-package targets
    }

    // Crawl target glob configurations to locate workspace packages
    for (const pattern of workspaceGlobs) {
      await this.locatePackagesViaPattern(pattern);
    }

    // Register all discovered workspace packages as "used" external packages so they
    // are never incorrectly flagged as unused dependencies.
    this.markWorkspacePackagesAsUsed();
  }

  /**
   * Expands a workspace glob pattern and registers all found packages.
   * Supports patterns like:
   *   - `packages/*`       (one level deep)
   *   - `apps/*`           (one level deep)
   *   - `packages/**`      (recursive – all subdirectories)
   *   - `packages/core`    (explicit single package)
   */
  async locatePackagesViaPattern(globPattern) {
    const standardizedPattern = globPattern.replace(/\\/g, '/');

    // Determine if this is a recursive pattern (`**`) or a simple wildcard (`*`)
    const isRecursive = standardizedPattern.includes('**');
    const isWildcard = standardizedPattern.includes('*');

    if (!isWildcard) {
      // Explicit path: treat the pattern itself as a single package directory
      const absolutePath = path.resolve(this.context.cwd, standardizedPattern);
      await this._tryRegisterPackage(absolutePath);
      return;
    }

    // Extract the base directory before the first wildcard segment
    const baseDir = standardizedPattern.split('/*')[0];
    const absoluteSearchPath = path.resolve(this.context.cwd, baseDir);

    if (isRecursive) {
      await this._scanDirectoryRecursively(absoluteSearchPath);
    } else {
      await this._scanDirectoryShallow(absoluteSearchPath);
    }
  }

  /**
   * Scans a directory one level deep for workspace packages.
   */
  async _scanDirectoryShallow(absoluteSearchPath) {
    try {
      const contents = await fs.readdir(absoluteSearchPath, { withFileTypes: true });
      for (const entity of contents) {
        if (!entity.isDirectory()) continue;
        const subPackageDir = path.join(absoluteSearchPath, entity.name);
        await this._tryRegisterPackage(subPackageDir);
      }
    } catch {
      // Unreadable target directories; pass tracking
    }
  }

  /**
   * Recursively scans a directory tree for workspace packages.
   * Stops descending into `node_modules` directories.
   */
  async _scanDirectoryRecursively(absoluteSearchPath) {
    try {
      const contents = await fs.readdir(absoluteSearchPath, { withFileTypes: true });
      for (const entity of contents) {
        if (!entity.isDirectory()) continue;
        if (entity.name === 'node_modules' || entity.name === '.git') continue;
        const subDir = path.join(absoluteSearchPath, entity.name);
        // Try to register as a package first
        const registered = await this._tryRegisterPackage(subDir);
        // If not a package root itself, recurse deeper
        if (!registered) {
          await this._scanDirectoryRecursively(subDir);
        }
      }
    } catch {
      // Unreadable directories; pass
    }
  }

  /**
   * Attempts to register a directory as a workspace package.
   * Dynamically evaluates companion tsconfig.json configurations for local build boundaries.
   * Returns true if a valid package.json with a `name` field was found.
   */
  async _tryRegisterPackage(packageDir) {
    const manifestFile = path.join(packageDir, 'package.json');
    const tsconfigFile = path.join(packageDir, 'tsconfig.json');
    
    try {
      const data = await fs.readFile(manifestFile, 'utf8');
      const pkg = JSON.parse(data);
      
      if (pkg.name) {
        // Attempt to safely load compilation map configurations from the local tsconfig.json
        let localTsconfig = null;
        try {
          let tsconfigText = await fs.readFile(tsconfigFile, 'utf8');
          
          // Clean up multi-line comments, single-line comments, and trailing commas
          tsconfigText = tsconfigText
            .replace(/\/\*[\s\S]*?\*\//g, '') 
            .replace(/\/\/.*/g, '')           
            .replace(/,(\s*[}\]])/g, '$1');   
            
          localTsconfig = JSON.parse(tsconfigText);
        } catch {
          // No local tsconfig or unreadable file format; pass null gracefully
        }

        // Pass the sub-package manifest and parsed tsconfig configuration down to our entry tracker
        const entryPoints = this.calculatePackageExportsEntries(pkg, packageDir, localTsconfig);
        
        this.packageManifests.set(pkg.name, {
          packageName: pkg.name,
          rootDirectory: packageDir,
          manifestPath: manifestFile,
          entryPoints
        });

        this.workspacePackageNames.add(pkg.name);
        // Also register the package root so the resolver can identify files
        // inside this package as "internal" rather than node_modules.
        this.context.monorepoPackageRoots.add(packageDir);
        return true;
      }
    } catch {
      // package.json parsing failed; ignore invalid directory roots
    }
    return false;
  }

  /**
   * Tracks package entry points by evaluating standard fields and main/exports configurations.
   * Reverses build-artifact paths back to source developer locations using local compilerOptions.
   */
  calculatePackageExportsEntries(pkg, pkgDir, localTsconfig) {
    const entries = new Set();

    // 1. Trace traditional entry fields from manifest
    if (pkg.main && typeof pkg.main === 'string') entries.add(path.resolve(pkgDir, pkg.main));
    if (pkg.module && typeof pkg.module === 'string') entries.add(path.resolve(pkgDir, pkg.module));
    if (pkg.browser && typeof pkg.browser === 'string') entries.add(path.resolve(pkgDir, pkg.browser));
    if (pkg.types && typeof pkg.types === 'string') entries.add(path.resolve(pkgDir, pkg.types));
    if (pkg.typings && typeof pkg.typings === 'string') entries.add(path.resolve(pkgDir, pkg.typings));

    // 2. Trace secondary and toolchain executable fields to avoid missing binary/source roots
    if (pkg.bin) {
      if (typeof pkg.bin === 'string') {
        entries.add(path.resolve(pkgDir, pkg.bin));
      } else if (typeof pkg.bin === 'object' && pkg.bin !== null) {
        for (const binPath of Object.values(pkg.bin)) {
          if (typeof binPath === 'string') entries.add(path.resolve(pkgDir, binPath));
        }
      }
    }
    if (pkg.source && typeof pkg.source === 'string') entries.add(path.resolve(pkgDir, pkg.source));

    // 3. Handle deep nested conditional exports matrices block parameters
    if (pkg.exports) {
      this.recursivelyUnwindExports(pkg.exports, pkgDir, entries);
    }

    // 4. Extract compiler options directly from the sub-package tsconfig metadata
    let outDirToken = 'dist'; // Default standard target directory
    let rootDirToken = 'src';  // Default standard source directory

    if (localTsconfig && localTsconfig.compilerOptions) {
      if (localTsconfig.compilerOptions.outDir) {
        outDirToken = path.normalize(localTsconfig.compilerOptions.outDir).replace(/^\.[\\/]/, '');
      }
      if (localTsconfig.compilerOptions.rootDir) {
        rootDirToken = path.normalize(localTsconfig.compilerOptions.rootDir).replace(/^\.[\\/]/, '');
      }
    }

    // 5. Manifest-Driven Verification Layer with Dynamic tsconfig Remapping
    const collectedPaths = Array.from(entries);
    const verifiedManifestEntries = [];

    for (const absolutePath of collectedPaths) {
      const normalizedPath = path.normalize(absolutePath);

      if (fsSync.existsSync(normalizedPath) && fsSync.statSync(normalizedPath).isFile()) {
        verifiedManifestEntries.push(normalizedPath);
      } else {
        // Precise Remapping Layer: Swap out local outDir tokens with local rootDir tokens
        const pathSegments = normalizedPath.split(path.sep);
        const outDirIndex = pathSegments.lastIndexOf(outDirToken);

        if (outDirIndex !== -1) {
          pathSegments[outDirIndex] = rootDirToken;
          let tsconfigCandidate = pathSegments.join(path.sep).replace(/\.js$/, '.ts');

          if (fsSync.existsSync(tsconfigCandidate) && fsSync.statSync(tsconfigCandidate).isFile()) {
            verifiedManifestEntries.push(tsconfigCandidate);
            continue;
          }

          // Check for companion TSX formats
          const tsxCandidate = tsconfigCandidate.replace(/\.ts$/, '.tsx');
          if (fsSync.existsSync(tsxCandidate) && fsSync.statSync(tsxCandidate).isFile()) {
            verifiedManifestEntries.push(tsxCandidate);
            continue;
          }
        }

        // Original Multi-directory Fallback Engine
        const remappedFallbacks = [
          normalizedPath.replace(/([\\/]|^)(dist|build|lib|out)([\\/])/, '$1src$3').replace(/\.js$/, '.ts'),
          normalizedPath.replace(/([\\/]|^)(dist|build|lib|out)([\\/])/, '$1src$3').replace(/\.js$/, '.tsx'),
          normalizedPath.replace(/([\\/]|^)(dist|build|lib|out)([\\/])/, '$1src$3').replace(/\.js$/, '.jsx'),
          normalizedPath.replace(/\.js$/, '.ts'),
          normalizedPath.replace(/\.js$/, '.tsx')
        ];

        for (const fallbackPath of remappedFallbacks) {
          const cleanFallback = path.normalize(fallbackPath);
          if (fsSync.existsSync(cleanFallback) && fsSync.statSync(cleanFallback).isFile()) {
            verifiedManifestEntries.push(cleanFallback);
            break; 
          }
        }
      }
    }

    // Populate verified items
    entries.clear();
    verifiedManifestEntries.forEach(item => entries.add(item));

    // 6. Default file index fallback configurations (Only runs if entries size is 0)
    if (entries.size === 0) {
      const standardFallbacks = [
        path.join(pkgDir, rootDirToken, 'index.ts'),
        path.join(pkgDir, rootDirToken, 'index.tsx'),
        path.join(pkgDir, rootDirToken, 'index.js'),
        path.join(pkgDir, 'index.ts'),
        path.join(pkgDir, 'index.js')
      ];

      for (const fallback of standardFallbacks) {
        if (fsSync.existsSync(fallback) && fsSync.statSync(fallback).isFile()) {
          entries.add(fallback);
          break; // Stop on first matched valid fallback file
        }
      }
    }

    return Array.from(entries);
  }

  recursivelyUnwindExports(exportsValue, pkgDir, collected) {
    if (typeof exportsValue === 'string') {
      if (exportsValue.startsWith('.')) {
        collected.add(path.resolve(pkgDir, exportsValue));
      }
    } else if (Array.isArray(exportsValue)) {
      exportsValue.forEach(v => this.recursivelyUnwindExports(v, pkgDir, collected));
    } else if (typeof exportsValue === 'object' && exportsValue !== null) {
      for (const val of Object.values(exportsValue)) {
        this.recursivelyUnwindExports(val, pkgDir, collected);
      }
    }
  }

  /**
   * Marks all registered workspace package names as used in the global
   * `usedExternalPackages` set so they are never flagged as unused dependencies.
   *
   * This must be called after `initializeWorkspaceMesh()` and before the
   * unused-dependency report is generated.
   */
  markWorkspacePackagesAsUsed() {
    for (const pkgName of this.workspacePackageNames) {
      this.context.usedExternalPackages.add(pkgName);
    }
  }

  /**
   * Checks if an import specifier matches a package registered in our workspace mesh.
   */
  isLocalWorkspaceSpecifier(specifier) {
    if (this.workspacePackageNames.has(specifier)) return true;
    
    // Catch sub-path imports from monorepos (e.g., '@workspace/shared/utils')
    for (const registeredPkgName of this.workspacePackageNames) {
      if (specifier.startsWith(`${registeredPkgName}/`)) return true;
    }
    return false;
  }

  /**
   * Maps a workspace package specifier to its local absolute package root location on disk.
   */
  /**
   * Maps a workspace package specifier to its local absolute package root location on disk.
   */
  getWorkspacePackageMatch(specifier) {
    if (this.packageManifests.has(specifier)) {
      return this.packageManifests.get(specifier);
    }

    for (const [name, metadata] of this.packageManifests.entries()) {
      if (specifier.startsWith(`${name}/`)) {
        return metadata;
      }
    }
    return null;
  }

  /**
   * Tracks an active module import specifier against the package context.
   * Identifies unlisted dependencies and roots shadowed dependencies.
   */
  auditImportSpecifier(specifier, importingFilePath) {
    // Ignore internal relative/absolute path imports
    if (specifier.startsWith('.') || specifier.startsWith('/')) return;

    // Clean up subpath imports (e.g., 'js-yaml/lib' -> 'js-yaml')
    const basePackageName = specifier.startsWith('@') 
      ? specifier.split('/').slice(0, 2).join('/') 
      : specifier.split('/')[0];

    // Find which local workspace package owns the file doing the importing
    let owningWorkspace = null;
    for (const [_, metadata] of this.packageManifests.entries()) {
      const relativePath = path.relative(metadata.rootDirectory, importingFilePath);
      if (!relativePath.startsWith('..') && !path.isAbsolute(relativePath)) {
        owningWorkspace = metadata;
        break;
      }
    }

    if (owningWorkspace) {
      // Read the local workspace package.json dependencies
      let localManifest = {};
      try {
        localManifest = JSON.parse(fsSync.readFileSync(owningWorkspace.manifestPath, 'utf8'));
      } catch {}

      const localDeps = new Set([
        ...Object.keys(localManifest.dependencies || {}),
        ...Object.keys(localManifest.devDependencies || {}),
        ...Object.keys(localManifest.peerDependencies || {})
      ]);

      // 🚨 TARGET BUG 2: Detect Unlisted Dependencies
      if (!localDeps.has(basePackageName) && !this.workspacePackageNames.has(basePackageName)) {
        if (!this.context.unlistedDependencies) this.context.unlistedDependencies = [];
        
        const alreadyFlagged = this.context.unlistedDependencies.some(
          u => u.package === basePackageName && u.file === importingFilePath
        );
        
        if (!alreadyFlagged) {
          this.context.unlistedDependencies.push({
            package: basePackageName,
            file: path.relative(this.context.cwd, importingFilePath),
            manifest: path.relative(this.context.cwd, owningWorkspace.manifestPath)
          });
        }
      }

      // Track that this package name was explicitly consumed by an active workspace file
      if (!this.context.consumedWorkspacePackages) this.context.consumedWorkspacePackages = new Set();
      this.context.consumedWorkspacePackages.add(basePackageName);
    } else {
      // The import happened in the root workspace environment
      if (!this.context.consumedRootPackages) this.context.consumedRootPackages = new Set();
      this.context.consumedRootPackages.add(basePackageName);
    }
  }
}