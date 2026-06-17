# Troubleshooting

## Overview

This guide covers common issues you might encounter while using entkapp v4.0 and provides solutions to resolve them.

## General Issues

### Analysis is taking too long
- **Cause**: Large codebase, disabled caching, or too many active plugins.
- **Solution**: 
  - Ensure `cache: true` is set in your config.
  - Disable unnecessary plugins in `enabledPlugins`.
  - Check that `node_modules` and build folders are in your `.gitignore`.
  - Enable parallel processing with the `--parallel` flag.

### False positives (Code flagged as dead but is used)
- **Cause**: Dynamic imports, reflection, or framework-specific "magic" usage.
- **Solution**:
  - Use `// entkapp-ignore` comments above the flagged code.
  - Add the file or symbol to the `ignore` list in `config.json`.
  - Ensure you have the correct ecosystem plugin enabled (e.g., `nextjs` for Next.js projects).

### False negatives (Dead code not flagged)
- **Cause**: The code is being referenced in a way the analyzer doesn't recognize (e.g., in a string that happens to match a filename).
- **Solution**:
  - Check your `MagicDetector` settings.
  - Ensure all entry points are correctly identified.

## CLI Errors

### "Command not found: entkapp"
- **Solution**: Ensure you have installed the package locally and are using `npx entkapp` or have added it to your `PATH`.

### "Critical Operational Pipeline Failure"
- **Cause**: Usually a permission issue, a corrupt cache, or an unhandled edge case in a plugin.
- **Solution**:
  - Run with `--verbose` to see the full stack trace.
  - Try clearing the cache: `rm -rf .entkapp/cache`.
  - Ensure the engine has write permissions to your project directory.

## Plugin Issues

### "Plugin must implement name getter"
- **Cause**: You are using a custom plugin designed for v3.0 that hasn't been updated for v4.0.
- **Solution**: Update your plugin class to include a `get name()` method.

### Knip plugins not working
- **Cause**: Knip compatibility mode is disabled or the Knip plugin is not installed.
- **Solution**:
  - Ensure `supportKnipPlugins: true` is in your `config.json`.
  - Ensure the corresponding Knip plugin is installed in your `node_modules`.

## AI Healing Issues

### "AI proposing incorrect changes"
- **Solution**: 
  - Lower the `temperature` in your AI config.
  - Provide more context by increasing the `contextWindow` setting.
  - Use a more capable model like `gpt-4-turbo`.

### "Authentication failed"
- **Cause**: Missing or invalid API key.
- **Solution**: Set the appropriate environment variable (e.g., `OPENAI_API_KEY`).

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
