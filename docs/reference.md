# CLI Reference v3.2.0

This page lists all available command-line options and configuration keys for `pkg-scaffold v3.2.0`.

```text
Usage: pkg-scaffold [options]

Ultimate Enterprise Codebase Janitor & Self-Healing Engine

Options:
  -V, --version          output the version number
  -c, --cwd <path>       Specify the execution context root directory
  -r, --run              Execute the primary operational pipeline loop
  --fix                  Enable atomic code updates and self-healing (default: true)
  --no-fix               Disable direct file manipulation (dry-run mode)
  --tsconfig <path>      Specify path to custom layout configurations
  --test-command <cmd>   Integrated safety test validation script (default: "npm test")
  --workspace            Enable monorepo cluster mesh evaluation
  --verbose              Toggle expanded trace telemetry for diagnostics
  -y, --yes              Skip confirmation prompts for automatic execution
  --init                 Initialize a new pkg-scaffold configuration in the current directory
  -h, --help             display help for command
  -r, --run              Start Tool
```

## Options in Detail

### `-V`, `--version`
Displays the current version of `pkg-scaffold`.

### `-c`, `--cwd <path>`
Defines the root directory where `pkg-scaffold` should be executed.

### `-r`, `--run`
Initiates the analysis and refactoring process. This is required for execution.

### `--fix` / `--no-fix`
Controls whether the engine should apply changes to the filesystem.

### `--init`
**New in v3.2.0.** Automatically sets up the `/pkg-scaffold` directory and a default `config.json` in your project root.

### `--workspace`
Enables deep analysis of monorepos, linking dependencies across multiple packages.

## Plugin API Reference (v3.2.0)

### `BasePlugin` Methods

| Method | Description | Return Type |
| --- | --- | --- |
| `get name()` | Unique identifier for the plugin | `string` |
| `getConfigFiles()` | Files that trigger plugin activation | `string[]` |
| `getRoutePatterns()` | Regex for entry point detection | `RegExp[]` |
| `getRequiredSystemContracts()` | Symbols that must be preserved | `string[]` |
| `get(key)` | **New in v3.2.0.** Dynamic getter for custom properties | `any` |
| `isActive(dir)` | Async check for project compatibility | `Promise<boolean>` |

### Configuration (`pkg-scaffold/config.json`)

```json
{
  "interface": "CLI",
  "useBuiltinPlugins": true,
  "useCustomPlugins": true,
  "supportKnipPlugins": true,
  "options": {
    "verbose": false,
    "fastMode": true,
    "selfHealing": true
  },
  "enabledPlugins": ["nextjs", "nuxt", "remix", "sveltekit", "astro"]
}
```
