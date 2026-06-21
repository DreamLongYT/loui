import fs from 'fs/promises';
import path from 'path';

/**
 * WorkspaceDiagnostic
 * Performs health checks and architectural boundary enforcement for Monorepo workspaces.
 * Detects cross-package import violations, version mismatches, and missing workspace declarations.
 */
export class WorkspaceDiagnostic {
  constructor(context) { 
    this.context = context; 
    this.findings = [];
  }

  async checkWorkspaceHealth() {
    this.findings = [];

    if (!this.context.isWorkspaceEnabled) return this.findings;

    const rootPkgPath = this.context.cwd ? path.join(this.context.cwd, 'package.json') : null;
    let rootPkg = {};
    try {
      if (rootPkgPath) rootPkg = JSON.parse(await fs.readFile(rootPkgPath, 'utf8'));
    } catch (e) {}

    // 1. Check for version mismatches across workspace packages
    const versionMap = new Map(); // dep name -> { version, source }
    for (const [dir, manifest] of (this.context.monorepoPackageRoots || new Set()).entries ? [] : (this.context.monorepoPackageRoots || [])) {
      // iterate over monorepoPackageRoots as a Set
    }

    // Use workspaceGraph if available
    if (this.context.workspaceGraph && this.context.workspaceGraph.packageManifests) {
      for (const [dir, manifest] of this.context.workspaceGraph.packageManifests.entries()) {
        const allDeps = {
          ...manifest.dependencies,
          ...manifest.devDependencies
        };
        for (const [dep, version] of Object.entries(allDeps)) {
          if (!versionMap.has(dep)) {
            versionMap.set(dep, []);
          }
          versionMap.get(dep).push({ version, source: manifest.name || dir });
        }
      }

      // Report version mismatches
      for (const [dep, usages] of versionMap.entries()) {
        const uniqueVersions = new Set(usages.map(u => u.version));
        if (uniqueVersions.size > 1) {
          this.findings.push({
            type: 'version-mismatch',
            severity: 'warning',
            message: `Dependency "${dep}" has conflicting versions across workspace packages: ${[...uniqueVersions].join(', ')}`,
            packages: usages.map(u => u.source)
          });
        }
      }

      // 2. Check for missing workspace package declarations in root
      for (const [dir, manifest] of this.context.workspaceGraph.packageManifests.entries()) {
        if (!manifest.name) continue;
        const rootDeps = {
          ...rootPkg.dependencies,
          ...rootPkg.devDependencies,
          ...rootPkg.peerDependencies
        };
        // If the workspace package is referenced in root deps but not as "workspace:*"
        if (rootDeps[manifest.name] && !rootDeps[manifest.name].startsWith('workspace:')) {
          this.findings.push({
            type: 'workspace-declaration-missing',
            severity: 'info',
            message: `Workspace package "${manifest.name}" is referenced in root package.json without "workspace:" protocol`,
            packages: ['root', manifest.name]
          });
        }
      }

      // 3. Check for packages that have no entry points defined
      for (const [dir, manifest] of this.context.workspaceGraph.packageManifests.entries()) {
        if (!manifest.entryPoints || manifest.entryPoints.length === 0) {
          this.findings.push({
            type: 'missing-entry-point',
            severity: 'warning',
            message: `Workspace package "${manifest.name || dir}" has no entry points (main/module/exports) defined in package.json`,
            packages: [manifest.name || dir]
          });
        }
      }
    }

    return this.findings;
  }

  enforceBoundaries(filePath, imports) {
    const violations = [];
    if (!this.context.isWorkspaceEnabled) return violations;
    if (!this.context.workspaceGraph || !this.context.workspaceGraph.packageManifests) return violations;

    // Determine which workspace package this file belongs to
    let sourcePackage = null;
    for (const [dir, manifest] of this.context.workspaceGraph.packageManifests.entries()) {
      if (filePath.startsWith(dir + '/') || filePath.startsWith(dir + '\\')) {
        sourcePackage = manifest;
        break;
      }
    }

    if (!sourcePackage) return violations;

    // Check each import
    for (const specifier of imports) {
      if (!specifier || specifier.startsWith('.') || specifier.startsWith('/')) continue;

      // Check if the import is a workspace package
      if (this.context.workspaceGraph.isLocalWorkspaceSpecifier(specifier)) {
        const targetManifest = this.context.workspaceGraph.getWorkspacePackageMatch(specifier);
        if (targetManifest && targetManifest.name) {
          // Check if the target package is declared as a dependency of the source package
          const sourceDeps = {
            ...sourcePackage.dependencies,
            ...sourcePackage.devDependencies,
            ...sourcePackage.peerDependencies
          };
          if (!sourceDeps[targetManifest.name]) {
            violations.push({
              type: 'undeclared-workspace-dependency',
              severity: 'error',
              message: `Package "${sourcePackage.name}" imports "${specifier}" but "${targetManifest.name}" is not declared as a dependency`,
              file: filePath
            });
          }
        }
      }
    }

    return violations;
  }
}
