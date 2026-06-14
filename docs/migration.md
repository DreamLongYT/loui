# Migration Guide: v3 to v4

## Overview

pkg-scaffold v4.0 is a major update that introduces the Headless API, enhanced Monorepo support, and AI Self-Healing. While we've maintained as much backward compatibility as possible, there are some breaking changes and new configuration options you should be aware of.

## Breaking Changes

### 1. Configuration Path
The default configuration path has changed from `.pkg-scaffold.json` to `pkg-scaffold/config.json`. The engine will still look for the old file as a fallback, but it is recommended to migrate to the new structure.

**Old:**
```
my-project/
└── .pkg-scaffold.json
```

**New:**
```
my-project/
└── pkg-scaffold/
    └── config.json
```

### 2. CLI Flags
Some CLI flags have been renamed for consistency:
- `--workspace-enabled` is now `--workspace`
- `--auto-fix` is now `--fix`
- `--skip-confirmation` is now `--yes`

### 3. Plugin API
The `BasePlugin` class has been updated to support dynamic getters and hooks. If you have custom plugins, you will need to update them to match the new `BasePlugin` interface.

## New Features to Enable

### 1. Headless API
If you were previously wrapping the CLI in shell scripts, you can now use the `HeadlessAPI` directly in your Node.js code.

```javascript
// New in v4.0
import { HeadlessAPI } from 'pkg-scaffold/src/api/HeadlessAPI.js';
```

### 2. AI Self-Healing
AI healing is disabled by default. To enable it, add the following to your `config.json`:

```json
{
  "healing": {
    "ai": { "enabled": true }
  }
}
```

### 3. Monorepo Support
V4.0 features a much more robust monorepo engine. Enable it to get better cross-package analysis:

```json
{
  "monorepo": { "enabled": true }
}
```

## Migration Steps

1. **Update the package**:
   ```bash
   npm install pkg-scaffold@latest
   ```

2. **Move your configuration**:
   Create a `pkg-scaffold` directory and move your configuration file there as `config.json`.

3. **Update custom plugins**:
   If you have custom plugins, ensure they extend the new `BasePlugin` and implement the `name` getter.

4. **Verify your setup**:
   Run the analysis with the `--verbose` flag to ensure all plugins and configurations are loaded correctly:
   ```bash
   npx pkg-scaffold --verbose
   ```

## Troubleshooting

### "Plugin must implement name getter"
This error occurs if a custom plugin hasn't been updated to the v4.0 `BasePlugin` structure. Add a `get name()` method to your plugin class.

### Configuration not found
Ensure your config file is named `config.json` and is located inside a `pkg-scaffold` directory at your project root.

### AI Healing not working
Ensure you have provided a valid API key for your chosen AI provider (e.g., `OPENAI_API_KEY`) in your environment variables.
