# CLI Reference

This page lists all available command-line options for `pkg-scaffold v3.1.1`.

```text
Usage: pkg-scaffold [options]
Ultimate Enterprise Codebase Janitor & Self-Healing Engine

Options:
  -V, --version             output the version number
  -c, --cwd <path>          Specify the execution context root directory
  -r, --run                 Execute the primary operational pipeline loop (Required to start analysis)
  --fix                     Enable atomic code updates, structural file pruning, and active type sanitization (default: true)
  --no-fix                  Disable direct file manipulation modifications (dry-run reporting mode)
  --tsconfig <filename>     Specify path to custom layout configurations (default: "tsconfig.json")
  --test-command <command>  Integrated continuous safety test validation script execution path (default: "npm test")
  --workspace               Enable high-density workspace workspace/monorepo cluster mesh evaluation parsing (default: false)
  --verbose                 Toggle expanded trace telemetry for debug operational diagnostics (default: false)
  -y, --yes                 Skip confirmation prompts and execute planned structural modifications automatically (default: false)
  -h, --help                display help for command
```

## Options in Detail

### `-V`, `--version`
Displays the current version of `pkg-scaffold`.

### `-c`, `--cwd <path>`
Defines the root directory where `pkg-scaffold` should be executed. By default, this is the current working directory.

### `-r`, `--run`
**New in v3.1.0.** This flag is required to initiate the actual analysis and refactoring process. If omitted, the CLI will enter interactive onboarding mode or display configuration status.

### `--fix`
Activates the mode for atomic code updates, structural file pruning, and active type sanitization. This is the mode in which `pkg-scaffold` makes actual changes to your code.

### `--no-fix`
Disables direct file manipulation modifications. `pkg-scaffold` performs an analysis and reports on potential changes without applying them (dry-run mode).

### `--tsconfig <filename>`
Specifies the path to a custom `tsconfig.json` file. By default, `pkg-scaffold` looks for `tsconfig.json` in the current working directory.

### `--test-command <command>`
Defines the command to be executed for integrated continuous safety test validation after changes. By default, `npm test` is used.

### `--workspace`
Enables evaluation of workspaces/monorepo clusters. When this option is enabled, `pkg-scaffold` analyzes and optimizes all packages within a monorepo.

### `--verbose`
Enables expanded trace telemetry for debug operational diagnostics, providing more detailed output during execution.

### `-y`, `--yes`
Skips all confirmation prompts and automatically executes planned structural modifications. **Use with caution in production environments without prior review.**

### `-h`, `--help`
Displays help information for `pkg-scaffold`.
