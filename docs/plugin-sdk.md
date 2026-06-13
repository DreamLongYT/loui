# Plugin SDK Guide

## Overview

The Plugin SDK provides utilities and helpers for developing custom plugins that extend pkg-scaffold's analysis and healing capabilities. Plugins allow you to add support for new frameworks, languages, and analysis patterns.

## Quick Start

```javascript
import { PluginSDK } from 'pkg-scaffold/src/api/PluginSDK.js';

const MyPlugin = PluginSDK.createPlugin({
  name: 'my-custom-plugin',
  configFiles: ['my-config.json'],
  
  async analyze(node, filePath, context) {
    // Your analysis logic here
  },
  
  async transform(code, filePath, context) {
    // Your transformation logic here
    return code;
  }
});
```

## Creating Custom Plugins

### Basic Plugin Structure

```javascript
import { PluginSDK } from 'pkg-scaffold/src/api/PluginSDK.js';

const MyFrameworkPlugin = PluginSDK.createPlugin({
  name: 'my-framework',
  
  // Configuration files that indicate this framework is active
  configFiles: ['my-framework.config.js', 'my-framework.json'],
  
  // Route patterns for files this plugin should analyze
  routePatterns: [/\.(tsx?|jsx?)$/],
  
  // Symbols that are implicitly required by the framework
  requiredContracts: ['default', 'config'],
  
  // Detect if the plugin should be active
  async isActive(baseDir) {
    // Custom detection logic
    return true;
  },
  
  // Initialize the plugin
  async initialize(context) {
    console.log('Plugin initialized');
  },
  
  // Analyze files
  async analyze(node, filePath, context) {
    // Track framework-specific imports
    if (node.explicitImports.has('my-framework')) {
      node.frameworkUsage = true;
    }
  },
  
  // Transform code
  async transform(code, filePath, context) {
    // Apply transformations
    return code;
  },
  
  // Validate code
  async validate(code, filePath, context) {
    const errors = [];
    // Add validation errors
    return errors;
  }
});
```

## Built-in Plugin Factories

### CSS-in-JS Plugin

Analyze styled components, emotion, and other CSS-in-JS libraries:

```javascript
import { PluginSDK } from 'pkg-scaffold/src/api/PluginSDK.js';

const CSSInJSPlugin = PluginSDK.createCSSInJSPlugin({
  name: 'my-css-in-js',
  libraries: [
    'styled-components',
    'emotion',
    '@emotion/react',
    '@emotion/styled'
  ]
});
```

**Features:**
- Detects CSS-in-JS imports
- Tracks styled component definitions
- Identifies unused styles
- Validates CSS-in-JS patterns

### Asset Tracking Plugin

Track and manage static assets:

```javascript
const AssetPlugin = PluginSDK.createAssetTrackingPlugin({
  name: 'asset-tracker',
  extensions: [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.mp4', '.webm', '.mp3', '.wav',
    '.woff', '.woff2', '.ttf', '.eot'
  ]
});
```

**Features:**
- Tracks asset imports and requires
- Detects asset URLs in strings
- Identifies unused assets
- Supports custom extensions

### Monorepo Plugin

Enable monorepo and workspace awareness:

```javascript
const MonorepoPlugin = PluginSDK.createMonorepoPlugin({
  name: 'monorepo-aware',
  configFiles: ['nx.json', 'pnpm-workspace.yaml', 'lerna.json']
});
```

**Features:**
- Detects workspace packages
- Tracks workspace imports
- Manages package boundaries
- Handles cross-package dependencies

### Circular Dependency Detector

Detect circular dependencies:

```javascript
const CircularDepPlugin = PluginSDK.createCircularDepPlugin({
  name: 'circular-dep-detector'
});
```

**Features:**
- Identifies circular dependencies
- Provides cycle paths
- Suggests refactoring strategies

## Advanced Plugin Development

### Using Hooks

```javascript
import { PluginSDKBase } from 'pkg-scaffold/src/api/PluginSDK.js';

class AdvancedPlugin extends PluginSDKBase {
  get name() {
    return 'advanced-plugin';
  }

  async initialize(context) {
    // Register hooks for lifecycle events
    this.registerHook('analyze:start', async (data) => {
      console.log('Analysis starting');
    });

    this.registerHook('analyze:complete', async (data) => {
      console.log('Analysis complete');
    });

    this.registerHook('refactor:start', async (data) => {
      console.log('Refactoring starting');
    });
  }

  async emitHook(eventName, data) {
    // Emit custom events
    await super.emitHook(eventName, data);
  }
}
```

### Using Transformers

```javascript
class TransformerPlugin extends PluginSDKBase {
  get name() {
    return 'transformer-plugin';
  }

  async initialize(context) {
    // Register code transformers
    this.registerTransformer(async (code, filePath) => {
      // Transform code
      return code.replace(/old/g, 'new');
    });
  }

  async applyTransformers(code, filePath) {
    return await super.applyTransformers(code, filePath);
  }
}
```

### Using Validators

```javascript
class ValidatorPlugin extends PluginSDKBase {
  get name() {
    return 'validator-plugin';
  }

  async initialize(context) {
    // Register validators
    this.registerValidator(async (code, filePath) => {
      const errors = [];
      
      if (code.includes('console.log')) {
        errors.push({
          type: 'console-usage',
          line: code.split('\n').findIndex(l => l.includes('console.log')) + 1,
          message: 'console.log found in production code'
        });
      }
      
      return errors;
    });
  }

  async runValidators(code, filePath) {
    return await super.runValidators(code, filePath);
  }
}
```

## Plugin Lifecycle

1. **Initialization**: Plugin is loaded and initialized
2. **Detection**: Plugin checks if it should be active for the project
3. **Analysis**: Plugin analyzes files and collects information
4. **Transformation**: Plugin applies code transformations (if enabled)
5. **Validation**: Plugin validates code against rules
6. **Reporting**: Results are collected and reported

## Plugin Configuration

Plugins can be configured via `pkg-scaffold/config.json`:

```json
{
  "useBuiltinPlugins": true,
  "useCustomPlugins": true,
  "supportKnipPlugins": true,
  "enabledPlugins": [
    "nextjs",
    "typescript",
    "my-custom-plugin"
  ]
}
```

## Loading Custom Plugins

Place your plugins in `pkg-scaffold/plugins/`:

```
my-project/
├── pkg-scaffold/
│   ├── config.json
│   └── plugins/
│       ├── my-plugin.js
│       └── another-plugin.js
└── src/
```

Plugins are automatically discovered and loaded:

```javascript
// my-plugin.js
import { PluginSDK } from 'pkg-scaffold/src/api/PluginSDK.js';

export default PluginSDK.createPlugin({
  name: 'my-plugin',
  // ... plugin configuration
});
```

## Best Practices

### 1. Clear Naming

```javascript
// Good
const name = 'react-hooks-analyzer';

// Avoid
const name = 'plugin1';
```

### 2. Proper Error Handling

```javascript
async analyze(node, filePath, context) {
  try {
    // Analysis logic
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error);
    // Don't throw, allow other plugins to continue
  }
}
```

### 3. Performance Considerations

```javascript
// Cache expensive operations
class CachingPlugin extends PluginSDKBase {
  constructor(context) {
    super(context);
    this.cache = new Map();
  }

  async analyze(node, filePath, context) {
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath);
    }
    
    const result = await this.expensiveAnalysis(filePath);
    this.cache.set(filePath, result);
    return result;
  }
}
```

### 4. Documentation

```javascript
/**
 * Analyzes React component patterns
 * @param {Node} node - AST node
 * @param {string} filePath - File path
 * @param {Context} context - Engine context
 * @returns {Promise<void>}
 */
async analyze(node, filePath, context) {
  // Implementation
}
```

## Example: Complete Plugin

```javascript
import { PluginSDK } from 'pkg-scaffold/src/api/PluginSDK.js';

const ReactPlugin = PluginSDK.createPlugin({
  name: 'react-analyzer',
  configFiles: ['package.json'], // React is detected via package.json
  routePatterns: [/\.(tsx?|jsx?)$/],
  requiredContracts: ['default', 'Component'],

  async analyze(node, filePath, context) {
    // Track React imports
    if (node.explicitImports.has('react')) {
      node.isReactComponent = true;
    }

    // Detect React hooks
    const hookPattern = /use[A-Z]\w+/g;
    const hooksUsed = (node.rawCode || '').match(hookPattern) || [];
    if (hooksUsed.length > 0) {
      node.reactHooks = new Set(hooksUsed);
    }

    // Track JSX
    if ((node.rawCode || '').includes('</')) {
      node.hasJSX = true;
    }
  },

  async validate(code, filePath, context) {
    const errors = [];

    // Check for unused imports
    const importMatch = code.match(/import\s+(\w+)\s+from\s+['"]react['"]/);
    if (importMatch) {
      const imported = importMatch[1];
      if (!code.includes(imported) && imported !== 'React') {
        errors.push({
          type: 'unused-import',
          name: imported,
          message: `Unused React import: ${imported}`
        });
      }
    }

    return errors;
  }
});

export default ReactPlugin;
```

## Testing Your Plugin

```javascript
import { HeadlessAPI } from 'pkg-scaffold/src/api/HeadlessAPI.js';

async function testPlugin() {
  const api = new HeadlessAPI();
  
  await api.initialize('/path/to/test-project');
  
  // Check if your plugin is loaded
  const plugins = api.getPlugins();
  const myPlugin = plugins.find(p => p.name === 'my-plugin');
  
  if (myPlugin) {
    console.log('✓ Plugin loaded successfully');
  } else {
    console.log('✗ Plugin not found');
  }
  
  // Run analysis
  const results = await api.analyze();
  console.log('Analysis results:', results);
}

testPlugin().catch(console.error);
```

## Troubleshooting

### Plugin Not Loading

1. Check plugin file is in `pkg-scaffold/plugins/`
2. Verify plugin exports a default class or function
3. Check `config.json` has `useCustomPlugins: true`

### Plugin Errors

```javascript
// Enable verbose logging
const api = new HeadlessAPI();
await api.initialize(projectRoot, { verbose: true });
```

### Performance Issues

- Use caching for expensive operations
- Avoid regex in hot paths
- Consider async operations for I/O

## Resources

- [API Documentation](/api-headless)
- [CSS-in-JS Integration](/css-in-js)
- [Asset Tracking](/asset-tracking)
- [Best Practices](/best-practices)
