import fs from 'fs/promises';
import path from 'path';
// Native sub-directory crawling removed as it's not in fs/promises in older node, but we use readdir anyway.

/**
 * Monorepo Cross-Linking Topology Manager
 * Maps sub-package structural boundaries across pnpm, Yarn, or npm workspaces.
 */
export class WorkspaceGraph {
  constructor(context) {
    this.context = context;
    this.packageManifests = new Map(); // Package Name -> { manifestPath, rootDirectory, entryPoints[] }
    this.workspacePackageNames = new Set();
  }

  /**
   * Checks the environment layout to discover and map local workspace packages.
   */
  async initializeWorkspaceMesh() {
    const rootPackageJsonPath = path.join(this.context.cwd, 'package.json');
    const pnpmWorkspacePath = path.join(this.context.cwd, 'pnpm-workspace.yaml');
    
    let workspaceGlobs = [];
    this.hoistedDependencies = new Set();

    // Load hoisted dependencies from root package.json (Knip Issue #1792 fix)
    try {
      const rootPkg = JSON.parse(await fs.readFile(rootPackageJsonPath, 'utf8'));
      const deps = { ...rootPkg.dependencies, ...rootPkg.devDependencies };
      Object.keys(deps).forEach(d => this.hoistedDependencies.add(d));
    } catch (e) {
      // No root package.json or unreadable
    }

    // Protocol A: Check for pnpm workspace configurations
    try {
      const yaml = await fs.readFile(pnpmWorkspacePath, 'utf8');
      const lines = yaml.split('\n');
      let insidePackagesBlock = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('packages:')) {
          insidePackagesBlock = true;
          continue;
        }
        if (insidePackagesBlock && trimmed.startsWith('-')) {
          const pattern = trimmed.replace(/^-|['"]/g, '').trim();
          workspaceGlobs.push(pattern);
        }
      }
    } catch {
      // pnpm structure absent; check package.json workspace array paths instead
    }

    // Protocol B: Check for Yarn/npm workspaces array inside the root package.json
    if (workspaceGlobs.length === 0) {
      try {
        const pkgText = await fs.readFile(rootPackageJsonPath, 'utf8');
        const pkg = JSON.parse(pkgText);
        if (pkg.workspaces) {
          workspaceGlobs = Array.isArray(pkg.workspaces) ? pkg.workspaces : (pkg.workspaces.packages || []);
        }
      } catch {
        return; // Workspace mesh maps skipped for single-package targets
      }
    }

    // Crawl target glob configurations to locate workspace packages
    for (const pattern of workspaceGlobs) {
      await this.locatePackagesViaPattern(pattern);
    }
  }

  async locatePackagesViaPattern(globPattern) {
    // Normalizes wildcards down into base query directories
    const standardizedPattern = globPattern.replace(/\\/g, '/');
    const baseDir = standardizedPattern.split('/*')[0];
    const absoluteSearchPath = path.resolve(this.context.cwd, baseDir);

    try {
      const contents = await fs.readdir(absoluteSearchPath, { withFileTypes: true });
      
      for (const entity of contents) {
        if (!entity.isDirectory()) continue;
        
        const subPackageDir = path.join(absoluteSearchPath, entity.name);
        const manifestFile = path.join(subPackageDir, 'package.json');
        
        try {
          const data = await fs.readFile(manifestFile, 'utf8');
          const pkg = JSON.parse(data);
          
          if (pkg.name) {
            const entryPoints = this.calculatePackageExportsEntries(pkg, subPackageDir);
            
            this.packageManifests.set(pkg.name, {
              packageName: pkg.name,
              rootDirectory: subPackageDir,
              manifestPath: manifestFile,
              entryPoints
            });

            this.workspacePackageNames.add(pkg.name);
          }
        } catch {
          // package.json parsing failed; ignore invalid directory roots
        }
      }
    } catch {
      // Unreadable target directories; pass tracking
    }
  }

  /**
   * Tracks package entry points by evaluating standard fields and main/exports configurations.
   */
  calculatePackageExportsEntries(pkg, pkgDir) {
    const entries = new Set();

    // Trace traditional entry fields
    if (pkg.main) entries.add(path.resolve(pkgDir, pkg.main));
    if (pkg.module) entries.add(path.resolve(pkgDir, pkg.module));
    if (pkg.browser) entries.add(path.resolve(pkgDir, pkg.browser));
    if (pkg.types) entries.add(path.resolve(pkgDir, pkg.types));

    // Handle deep nested conditional exports matrices block parameters
    if (pkg.exports) {
      this.recursivelyUnwindExports(pkg.exports, pkgDir, entries);
    }

    // Default file index fallback configurations
    if (entries.size === 0) {
      entries.add(path.resolve(pkgDir, 'index.js'));
      entries.add(path.resolve(pkgDir, 'index.ts'));
    }

    return Array.from(entries);
  }

  recursivelyUnwindExports(exportsValue, pkgDir, collected) {
    if (typeof exportsValue === 'string') {
      if (exportsValue.startsWith('.')) {
        collected.add(path.resolve(pkgDir, exportsValue));
      }
    } else if (typeof exportsValue === 'object' && exportsValue !== null) {
      for (const val of Object.values(exportsValue)) {
        this.recursivelyUnwindExports(val, pkgDir, collected);
      }
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
