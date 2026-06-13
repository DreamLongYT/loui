# Getting Started with pkg-scaffold

This guide will walk you through the installation and basic usage of `pkg-scaffold`. Learn how to quickly clean and optimize your project.

## Installation

`pkg-scaffold` is an npm package and can be easily installed in your project. It is recommended to install it as a `devDependency`.

```bash
npm install --save-dev pkg-scaffold
# or
yarn add --dev pkg-scaffold
# or
pnpm add --save-dev pkg-scaffold
```

After installation, you can run `pkg-scaffold` via `npx` or by adding a script to your `package.json`.

## Basic Usage

### Dry-Run Mode (Recommended)

Before making any changes to your project, it is always advisable to use the dry-run mode. This mode analyzes your project and shows you which changes *would be made* without actually applying them.

```bash
npx pkg-scaffold --no-fix
```

This command will output a summary of identified issues, such as orphaned files or potential refactoring opportunities.

### Applying Changes

If you are satisfied with the proposed changes, you can run `pkg-scaffold` with the `--fix` option to apply the changes to your project. The `--yes` option skips the confirmation prompt.

```bash
npx pkg-scaffold --fix --yes
```

**Caution:** Ensure you have backed up your changes or are in a version control system before using this option.

### Monorepo Support

For projects organized in a monorepo, `pkg-scaffold` can be run with the `--workspace` option to analyze and optimize all packages within the workspace.

```bash
npx pkg-scaffold --workspace --fix --yes
```

## Next Steps

*   Learn more about all available options in the [Reference](/reference).
*   Visit the [GitHub Repository](https://github.com/DreamLongYT/pkg-scaffold) for the latest updates and to report issues.

## Plugin Development

Building a plugin for pkg-scaffold is straightforward. You need to export a class that extends the `BasePlugin` (or follows its structure).

### Basic Plugin Structure

```javascript
export default class MyCustomPlugin {
  constructor(context) {
    this.context = context;
  }

  // Unique identifier for the plugin
  get name() {
    return 'my-plugin';
  }

  // Files that indicate this ecosystem is active
  getConfigFiles() {
    return ['my-config.json'];
  }

  // Regex patterns for entry point files
  getRoutePatterns() {
    return [
      /\/src\/routes\/.*\.js$/
    ];
  }

  // Symbols that should never be flagged as unused in entry points
  getRequiredSystemContracts() {
    return ['default', 'handler', 'config'];
  }

  // Logic to determine if the plugin should run
  async isActive(baseDir) {
    // Return true if your framework is detected
    return true; 
  }
}
```

### Advanced: Interfacing with the Engine

Plugins have access to the `context`, allowing them to trigger specific engine behaviors like `fastMode` or `selfHealing` for certain file types.

### Knip Compatibility

If you are porting a Knip plugin, ensure the export mappings align with the `getRoutePatterns()` and `getRequiredSystemContracts()` methods to ensure full compatibility with the pkg-scaffold resolution graph.

### Default Plugins

*   **NextJsPlugin**: Optimizes Next.js projects, detecting unused pages and API routes.
*   **GenericPlugins**: Basic optimizations for standard JavaScript/TypeScript projects.

### Disabling Plugins

In the `pkg-scaffold/config.json`, plugins can be controlled under the `plugins` key:

```json
{
  "plugins": {
    "nextjs": false,
    "typescript": true
  }
}
```