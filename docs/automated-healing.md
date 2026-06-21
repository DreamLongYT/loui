# Automated Self-Healing

entkapp v5.3.0 introduces an advanced **Self-Healing Engine** that goes beyond simple linting. It can automatically fix structural issues in your codebase while ensuring absolute safety through transactional integrity.

## 🛡️ Transactional Safety (GitSandbox)

Before any modification is made, entkapp ensures your workspace is clean. Every "healing" session follows a strict lifecycle:

1.  **State Capture**: entkapp creates a temporary snapshot of your current Git state.
2.  **Impact Analysis**: The engine simulates the change and checks for potential breaks in the dependency graph.
3.  **Atomic Write**: Changes are applied within a transaction boundary.
4.  **Verification**: The engine runs your configured test suite (e.g., `npm test`).
5.  **Commit or Rollback**: If tests pass, the changes are committed. If they fail, entkapp performs an automatic rollback to the captured state.

## 🔧 What can be healed?

### 1. Dependency Mismatches
If a package is used in your code but missing from `package.json`, or if a production dependency is incorrectly placed in `devDependencies`, entkapp will move it to the correct section automatically.

### 2. Orphaned Exports
Exports that are never imported anywhere in the reachable graph can be automatically stripped or converted to local declarations to reduce the public API surface.

### 3. Unused Files
Verwaiste Dateien, die von keinem Einstiegspunkt aus erreichbar sind, können sicher in einen `_orphaned` Ordner verschoben oder gelöscht werden.

### 4. Barrel Flattening
Complex, nested barrel files (`index.js`) that cause performance issues can be flattened to direct imports to improve build times and IDE performance.

## 🚀 How to use it

Simply run entkapp with the `--fix` flag:

```bash
npx entkapp --fix
```

For maximum safety, combine it with the `--verbose` flag to see exactly what the engine is proposing before it applies the changes.
