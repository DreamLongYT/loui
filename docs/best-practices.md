# Best Practices

## Overview

To get the most out of entkapp v4.3.0, follow these best practices for project structure, configuration, and workflow integration.

## Project Structure

### 1. Explicit Entry Points
Define clear entry points for your applications and libraries. This helps the engine distinguish between "Dead Code" and "Internal Library Code" that is meant to be exported but not necessarily used within the same package.

### 2. Avoid Deep Barrel Files
While barrel files (index.ts) are convenient, very deep or circular barrel files can make analysis more complex and slower. Try to keep your export structure as flat as possible.

### 3. Consistent File Extensions
Use consistent file extensions (`.ts`, `.tsx`, `.js`, `.jsx`) to help the engine's auto-detection logic.

## Configuration

### 1. Use `.gitignore`
entkapp automatically respects your `.gitignore` file. Ensure it is up to date to prevent the engine from scanning `node_modules`, build artifacts, or temporary files.

### 2. Tailor Your Plugins
Only enable the plugins you actually need for your project. This reduces analysis time and prevents false positives from unrelated ecosystems.

```json
{
  "enabledPlugins": ["typescript", "react", "nextjs"]
}
```

### 3. Define Custom Aliases
If you use complex path aliases (e.g., in `tsconfig.json` or `vite.config.js`), ensure they are correctly mapped in your entkapp configuration if the auto-detection fails.

## Workflow Integration

### 1. Run in CI/CD
Integrate entkapp into your CI/CD pipeline to ensure that dead code never reaches your main branch. Use the `--check` flag to fail the build if issues are found.

```bash
npx entkapp --check
```

### 2. Use "Review Mode"
When first adopting entkapp on a large legacy codebase, use it without the `--fix` flag first. Review the generated report and apply changes incrementally.

### 3. Leverage Git Integration
Always run entkapp on a clean git state. The engine's "Self-Healing" relies on git to create temporary sandboxes and perform rollbacks if tests fail.

## Coding Patterns

### 1. Prefer Static Imports
Static `import` statements are much easier to analyze than dynamic `import()` or `require()`. Use dynamic imports only when necessary for code splitting.

### 2. Avoid "Magic" Strings
Try to avoid referencing files or exports using dynamic string construction, as this can be missed by static analysis. If you must use them, register them in a plugin using `MagicDetector`.

### 3. Document Implicit Dependencies
If a file is required by a framework but not explicitly imported (e.g., a Next.js page file), ensure there is a plugin that handles this detection.

## Performance Optimization

### 1. Enable Caching
Ensure that the `cache` option is enabled in your configuration. This significantly speeds up subsequent runs by only re-analyzing changed files.

### 2. Use Worker Pools
For projects with thousands of files, ensure `parallel` is enabled to leverage multi-core processing.

### 3. Incremental Adoption
If you have a massive monorepo, start by analyzing individual packages rather than the entire workspace at once.
