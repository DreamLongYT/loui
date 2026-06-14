import fs from 'fs/promises';
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
   * Returns true if a valid package.json with a `name` field was found.
   */
  async _tryRegisterPackage(packageDir) {
    const manifestFile = path.join(packageDir, 'package.json');
    try {
      const data = await fs.readFile(manifestFile, 'utf8');
      const pkg = JSON.parse(data);
      
      if (pkg.name) {
        const entryPoints = this.calculatePackageExportsEntries(pkg, packageDir);
        
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
   */
  calculatePackageExportsEntries(pkg, pkgDir) {
    const entries = new Set();

    // Trace traditional entry fields
    if (pkg.main) entries.add(path.resolve(pkgDir, pkg.main));
    if (pkg.module) entries.add(path.resolve(pkgDir, pkg.module));
    if (pkg.browser && typeof pkg.browser === 'string') entries.add(path.resolve(pkgDir, pkg.browser));
    if (pkg.types) entries.add(path.resolve(pkgDir, pkg.types));
    if (pkg.typings) entries.add(path.resolve(pkgDir, pkg.typings));

    // Handle deep nested conditional exports matrices block parameters
    if (pkg.exports) {
      this.recursivelyUnwindExports(pkg.exports, pkgDir, entries);
    }

    // Default file index fallback configurations
    if (entries.size === 0) {
      // Standard roots
      entries.add(path.resolve(pkgDir, 'index.js'));
      entries.add(path.resolve(pkgDir, 'index.ts'));
      entries.add(path.resolve(pkgDir, 'index.tsx'));
      entries.add(path.resolve(pkgDir, 'index.jsx'));
      // Common src patterns
      entries.add(path.resolve(pkgDir, 'src/index.ts'));
      entries.add(path.resolve(pkgDir, 'src/index.tsx'));
      entries.add(path.resolve(pkgDir, 'src/index.js'));
      entries.add(path.resolve(pkgDir, 'src/index.jsx'));
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
}
