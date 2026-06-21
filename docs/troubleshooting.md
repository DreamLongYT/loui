# Troubleshooting

## Overview

This guide covers common issues you might encounter while using entkapp v5.2.4 and provides solutions to resolve them.

## General Issues

### Analysis is taking too long
- **Cause**: Large codebase, disabled caching, or too many active plugins.
- **Solution**: 
  - Ensure `cache: true` is set in your config.
  - Disable unnecessary plugins in `enabledPlugins`.
  - Check that `node_modules` and build folders are in your `.gitignore`.

### False positives (Code flagged as dead but is used)
- **Cause**: Dynamic imports, reflection, or framework-specific "magic" usage.
- **Solution**:
  - Use `// entkapp-ignore` comments above the flagged code.
  - Add the file or symbol to the `ignore` list in `config.json`.
  - Ensure you have the correct ecosystem plugin enabled (e.g., `nextjs` for Next.js projects).

### False negatives (Dead code not flagged)
- **Cause**: The code is being referenced in a way the analyzer doesn't recognize (e.g., in a string that happens to match a filename).
- **Solution**:
  - Ensure all entry points are correctly identified.

## CLI Errors

### "Command not found: entkapp"
- **Solution**: Ensure you have installed the package locally (by `npm install -g entkapp@latest`) or you are using `npx entkapp@latest`.

### "Critical Operational Pipeline Failure"
- **Cause**: Usually a permission issue, a corrupt cache, or an unhandled edge case in a plugin.
- **Solution**:
  - Run with `--verbose` to see the full stack trace.
  - Try clearing the cache: `rm -rf .entkapp/cache`.
  - Ensure the engine has write permissions to your project directory.

## Plugin Issues

### "Plugin must implement name getter"
- **Cause**: You are using a custom plugin designed for older versions that hasn't been updated.
- **Solution**: Update your plugin class to include a `get name()` method.

### "Dependency resolution failed"
- **Cause**: Complex tsConfig paths or missing workspace symlinks.
- **Solution**: 
  - Verify your `tsconfig.json` paths.
  - Ensure you have run `npm install` or `pnpm install` in your monorepo.

## Automated Healing Issues

### "Healing proposing incorrect changes"
- **Solution**: 
  - Review the proposed changes in dry-run mode first.
  - Ensure your test suite is comprehensive, as the healer relies on tests for verification.
  - Use more specific `ignore` rules to protect sensitive code areas.

### "Rollback failed"
- **Cause**: Git state was modified during the healing process.
- **Solution**: Ensure your working directory is clean before running with `--fix`.

## Monorepo Issues

### "Package not found in workspace"
- **Cause**: Incorrect workspace configuration or symlink issues.
- **Solution**:
  - Verify your `pnpm-workspace.yaml` or `workspaces` field in `package.json`.
  - Run `pnpm install` or `npm install` to ensure symlinks are correctly created.

## Getting Help

If you can't find the solution here:
1. Check the [GitHub Issues](https://github.com/DreamLongYT/entkapp/issues).
2. Run with `--verbose` and share the logs.
3. Consult the [API Documentation](/api-headless) for programmatic issues.
