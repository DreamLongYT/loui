# Plugin SDK Guide (v5.3.1)

## Overview

The `entkapp` Plugin SDK provides a robust framework for extending the engine's capabilities. Whether you are adding support for a new framework (like Next.js) or a specific library (like Envelop), the SDK allows you to hook into the analysis lifecycle, define dependency rules, and even perform automated structural healing.

## Quick Start: The Envelop Pattern

A common pattern for plugins is to detect a library and mark specific function calls as entry points to prevent them from being flagged as dead code. The `EnvelopPlugin` demonstrates a dynamic `isActive` check and how to influence the analysis graph.

```javascript
import { PluginSDK } from 'entkapp/src/api/PluginSDK.js';
import fs from 'fs/promises';
import path from 'path';

const EnvelopPlugin = PluginSDK.createPlugin({
  name: 'envelop',
  configFiles: ['package.json'], // A common file to check for framework presence

  // Dynamic activation: Check for any @envelop/ scoped packages in package.json
  async isActive(baseDir) {
    try {
      const pkgJson = JSON.parse(await fs.readFile(path.join(baseDir, 'package.json'), 'utf8'));
      const allDeps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
      return Object.keys(allDeps).some(k => k.startsWith('@envelop/'));
    } catch {
      return false;
    }
  },

  getRequiredPackages() {
    return [{ name: '@envelop/core', dev: false }]; // Core package required for Envelop
  },

  async analyze(node, filePath, context) {
    // Practical Analysis: Mark files containing 'useEnvelop(' as entry points.
    // This ensures that the module containing this call is considered 'live' and not dead code.
    if (node.rawCode?.includes('useEnvelop(')) {
      node.isEntry = true;
    }
    // Further analysis could involve checking arguments to useEnvelop or related files.
  }
});

export default EnvelopPlugin;
```

## Advanced Plugin Concepts

### 1. Dynamic Activation (`isActive`)

While `configFiles` provides a static check, the `isActive` method allows for more nuanced detection. You can check `package.json` for specific dependencies, scan for directory structures, or even look for specific code patterns. The `EnvelopPlugin` example above showcases checking for a family of packages (`@envelop/`).

```javascript
async isActive(baseDir) {
  // Example: Check if a specific directory exists, indicating a framework's presence
  try {
    await fs.access(path.join(baseDir, 'src/graphql'));
    return true;
  } catch {
    return false;
  }
}
```

### 2. Influencing the Analysis Graph (`node.isEntry`)

As seen in the `EnvelopPlugin`, setting `node.isEntry = true` is a powerful way for plugins to inform the `entkapp` engine about critical entry points in the codebase that might not be obvious from static import analysis alone. This prevents important parts of your application from being incorrectly identified as dead code.

### 3. Dependency Diagnostics

Plugins can enforce best practices for package management by implementing `getRequiredPackages()`. The engine automatically checks if these packages are present in the correct section (`dependencies` vs `devDependencies`).

```javascript
getRequiredPackages() {
  return [
    { name: 'next', dev: false },      // Must be in dependencies
    { name: 'typescript', dev: true }  // Must be in devDependencies
  ];
}
```

### 4. Lifecycle Hooks

Register hooks in the `initialize` method to react to engine events. This is useful for cross-plugin coordination or generating custom reports.

| Hook Name | Description |
| :--- | :--- |
| `beforeAnalysis` | Runs before the AST traversal begins. |
| `afterDependencyAnalysis` | Runs after all package.json and import paths are resolved. |
| `beforeTransformation` | Triggered before the `SourceRewriter` applies changes. |
| `afterHealing` | Final hook after a structural healing cycle completes. |

```javascript
async initialize(context) {
  this.registerHook('afterDependencyAnalysis', (data) => {
    if (data.diagnostics.some(d => d.package === 'react')) {
      console.log('React project detected, applying optimized graph traversal.');
    }
  });
}
```

### 5. Specialized Analyzers: `createMemberAnalyzer`

For protecting specific API surfaces or internal members from being pruned during "dead code" cleanup, use the `createMemberAnalyzer` helper.

```javascript
const MySecurityPlugin = PluginSDK.createMemberAnalyzer({
  name: 'security-guard',
  protectMembers: ['validateToken', 'authorizeUser'],
  
  async analyze(node, filePath, context) {
    // Custom logic to flag sensitive imports
    if (node.importedSymbols.has('crypto:createHash')) {
      context.report({ 
        type: 'SECURITY_WARN', 
        message: 'Manual hashing detected', 
        file: filePath 
      });
    }
  }
});
```

### 6. Automated Structural Healing

Plugins can participate in "Healing" cycles by registering transformers. These are deterministic code modifiers that the engine can apply and then verify using the `GitSandbox`.

```javascript
async initialize(context) {
  this.registerTransformer({
    name: 'deprecations-fixer',
    transform: (code, filePath) => {
      return code.replace(/oldAPI\(/g, 'newAPI(');
    }
  });
}
```

## Best Practices

*   **Be Conservative in `analyze`:** The `analyze` method runs for every file. Keep it fast by using `node.rawCode.includes()` before doing expensive logic, as demonstrated in the `EnvelopPlugin`.
*   **Use `requiredContracts`:** If your framework uses "magic" globals or strings, add them to `requiredContracts` to prevent false "unreferenced symbol" warnings.
*   **Leverage the Context:** The `context` object provides access to the full `projectGraph`, allowing you to make analysis decisions based on the state of other files.
