# Monorepo Support

## Overview

pkg-scaffold v3.3.7 is designed from the ground up to support modern monorepo structures. It now features **Automatic Workspace Detection**, meaning it will automatically find your `pnpm-workspace.yaml` or `workspaces` field in `package.json`. It understands workspace protocols, cross-package dependencies, and the complex graph relationships inherent in large-scale multi-package projects.

## Supported Tools

- **pnpm Workspaces**
- **npm Workspaces**
- **yarn Workspaces**
- **Nx**
- **Turborepo**
- **Lerna**

## Key Features

### 1. Workspace Graph Resolution
The engine builds a complete graph of all packages in your workspace, resolving `workspace:` protocols and local symlinks.

### 2. Cross-Package Dead Code Detection
Detects unused exports in a package even if they are intended to be used by another package in the same monorepo.

### 3. Shared Dependency Auditing
Audits dependencies across the entire monorepo to find version mismatches and redundant installations.

### 4. Boundary Enforcement
Enforces architectural boundaries between packages, preventing illegal imports and circular dependencies between workspace members.

## Configuration

Enable monorepo support in `pkg-scaffold/config.json`:

```json
{
  "monorepo": {
    "enabled": true,
    "type": "pnpm", // or "npm", "yarn", "nx"
    "packages": ["packages/*", "apps/*"],
    "analyzeCrossPackage": true
  }
}
```

## How it Works

1. **Root Discovery**: Identifies the monorepo root by looking for `pnpm-workspace.yaml`, `lerna.json`, or `package.json` with a `workspaces` field.
2. **Package Mesh**: Scans all defined package directories and builds a "Package Mesh" – a graph where nodes are packages and edges are inter-package dependencies.
3. **Unified Analysis**: Performs analysis across all packages simultaneously, treating the entire monorepo as a single, interconnected system.
4. **Impact Propagation**: When a change is proposed in one package, the engine analyzes the impact on all dependent packages in the workspace.

## Example Structure

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json
├── packages/
│   ├── ui-components/ (Package A)
│   │   ├── package.json
│   │   └── src/index.ts
│   └── utils/ (Package B)
│       ├── package.json
│       └── src/index.ts
└── apps/
    └── web-app/ (Package C)
        ├── package.json
        └── src/main.ts
```

If `ui-components` exports a `Button` that is only used in `web-app`, pkg-scaffold knows it's used. If it exports a `Slider` that is used nowhere in the entire monorepo, it will be flagged.

## Commands

### Analyze entire monorepo
```bash
npx pkg-scaffold --workspace -r
```

> **Note**: In v3.3.7+, the engine automatically detects monorepo layouts. Using `--workspace` forces the mesh evaluation even if no root config is found.

### Analyze specific package
```bash
npx pkg-scaffold --package @my-org/ui-components
```

## Best Practices

1. **Consistent Versioning**: Use the same versions for shared dependencies across all packages to simplify analysis.
2. **Clear Boundaries**: Define clear entry points for your packages to make cross-package usage easier to track.
3. **Use Workspace Protocols**: Use `workspace:*` for local dependencies to help the engine distinguish them from external npm packages.

## Troubleshooting

### Package not discovered
Check that the package directory matches the patterns defined in your workspace configuration (e.g., `pnpm-workspace.yaml`).

### Circular dependency errors
Monorepos are prone to circular dependencies between packages. Use the `Circular Dependency Detector` plugin to identify and resolve these.
