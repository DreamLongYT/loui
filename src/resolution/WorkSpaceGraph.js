import fs from 'fs/promises';
import path from 'path';

export class WorkspaceGraph {
  constructor(context) { 
    this.context = context; 
    this.packageManifests = new Map(); // dirPath -> manifestData
    this.workspacePackages = new Map(); // packageName -> dirPath
    this.tsconfigPaths = new Map(); // packageName -> tsconfigData
  }

  async initializeWorkspaceMesh() {
    const rootPkgPath = path.join(this.context.cwd, 'package.json');
    try {
      const rootPkg = JSON.parse(await fs.readFile(rootPkgPath, 'utf8'));
      let workspaces = [];

      // 1. Detect Workspaces (npm/yarn/pnpm/lerna)
      if (rootPkg.workspaces) {
        workspaces = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : rootPkg.workspaces.packages || [];
      } else {
        // Fallback for pnpm-workspace.yaml
        const pnpmWorkspacePath = path.join(this.context.cwd, 'pnpm-workspace.yaml');
        try {
          const yaml = await fs.readFile(pnpmWorkspacePath, 'utf8');
          const match = yaml.match(/packages:\n((?:\s+- .+\n?)+)/);
          if (match) {
            workspaces = match[1].split('\n')
              .filter(line => line.trim().startsWith('-'))
              .map(line => line.replace('-', '').trim().replace(/['"]/g, ''));
          }
        } catch (e) {}
      }

      if (workspaces.length > 0) {
        this.context.isWorkspaceEnabled = true;
        if (this.context.verbose) console.log(`[Workspace] Detected workspaces:`, workspaces);

        for (const pattern of workspaces) {
          const matches = await this._expandGlob(pattern, this.context.cwd);
          for (const matchDir of matches) {
            const pkgPath = path.join(matchDir, 'package.json');
            try {
              const pkgData = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
              const normalizedDir = matchDir.replace(/\\/g, '/');
              
              this.packageManifests.set(normalizedDir, {
                rootDirectory: normalizedDir,
                manifestPath: pkgPath.replace(/\\/g, '/'),
                name: pkgData.name,
                dependencies: pkgData.dependencies || {},
                devDependencies: pkgData.devDependencies || {},
                peerDependencies: pkgData.peerDependencies || {},
                scripts: pkgData.scripts || {},
                entryPoints: this.calculatePackageExportsEntries(pkgData, normalizedDir)
              });

              if (pkgData.name) {
                this.workspacePackages.set(pkgData.name, normalizedDir);
                this.context.monorepoPackageRoots.add(normalizedDir);
              }

              // Also try to load tsconfig.json for this workspace
              const tsconfigPath = path.join(matchDir, 'tsconfig.json');
              try {
                const tsconfigData = JSON.parse(await fs.readFile(tsconfigPath, 'utf8'));
                if (pkgData.name) this.tsconfigPaths.set(pkgData.name, tsconfigData);
              } catch(e) {}

            } catch (e) {}
          }
        }
      }
    } catch (e) {
      if (this.context.verbose) console.log('[Workspace] No root package.json found or invalid.');
    }
  }

  calculatePackageExportsEntries(pkgData, dirPath) {
    const entries = [];
    const addEntry = (p) => {
      if (typeof p === 'string') entries.push(path.resolve(dirPath, p).replace(/\\/g, '/'));
    };

    if (pkgData.main) addEntry(pkgData.main);
    if (pkgData.module) addEntry(pkgData.module);
    if (pkgData.source) addEntry(pkgData.source);
    if (pkgData.types) addEntry(pkgData.types);
    if (pkgData.typings) addEntry(pkgData.typings);

    if (pkgData.bin) {
      if (typeof pkgData.bin === 'string') addEntry(pkgData.bin);
      else Object.values(pkgData.bin).forEach(addEntry);
    }

    if (pkgData.exports) {
      const traverseExports = (obj) => {
        if (typeof obj === 'string') {
          addEntry(obj);
        } else if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) traverseExports(obj[key]);
        }
      };
      traverseExports(pkgData.exports);
    }

    return entries;
  }

  isLocalWorkspaceSpecifier(specifier) {
    if (!specifier) return false;
    // Direct match
    if (this.workspacePackages.has(specifier)) return true;
    // Sub-path match (e.g. @my-org/ui/components)
    for (const pkgName of this.workspacePackages.keys()) {
      if (specifier.startsWith(pkgName + '/')) return true;
    }
    return false;
  }

  getWorkspacePackageMatch(specifier) {
    if (this.workspacePackages.has(specifier)) {
      const dir = this.workspacePackages.get(specifier);
      return this.packageManifests.get(dir);
    }
    for (const pkgName of this.workspacePackages.keys()) {
      if (specifier.startsWith(pkgName + '/')) {
        const dir = this.workspacePackages.get(pkgName);
        return this.packageManifests.get(dir);
      }
    }
    return null;
  }

  markWorkspacePackagesAsUsed() {
    for (const [pkgName, dirPath] of this.workspacePackages.entries()) {
      this.context.usedExternalPackages.add(pkgName);
    }
  }

  /**
   * Expands a workspace glob pattern (e.g. 'packages/*') to absolute directory paths.
   * Supports single-level wildcards and direct paths.
   */
  async _expandGlob(pattern, cwd) {
    const results = [];
    
    // Remove trailing slash
    const cleanPattern = pattern.replace(/\/$/, '');
    
    // Handle simple wildcard patterns like 'packages/*' or 'apps/*'
    if (cleanPattern.includes('*')) {
      const parts = cleanPattern.split('/');
      const wildcardIndex = parts.findIndex(p => p.includes('*'));
      const baseDir = path.join(cwd, ...parts.slice(0, wildcardIndex));
      
      try {
        const entries = await fs.readdir(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            const fullPath = path.join(baseDir, entry.name);
            // Check if it has a package.json
            try {
              await fs.access(path.join(fullPath, 'package.json'));
              results.push(fullPath.replace(/\\/g, '/'));
            } catch (e) {}
          }
        }
      } catch (e) {}
    } else {
      // Direct path
      const fullPath = path.resolve(cwd, cleanPattern);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          results.push(fullPath.replace(/\\/g, '/'));
        }
      } catch (e) {}
    }
    
    return results;
  }
}
