# Impact Analysis

## Overview

Impact Analysis in entkapp v4.3.0 provides a "crystal ball" view of your codebase. It allows you to see exactly how a proposed change will ripple through your system, helping you avoid regressions and make informed decisions about refactoring.

## Features

- **Dependency Graph Visualization**: Interactive view of file and package relationships.
- **Change Simulation**: Preview the effects of a change without actually modifying files.
- **Safety Verdicts**: Automatic assessment of whether a refactor is "Safe", "Risky", or "Dangerous".
- **Blast Radius Mapping**: Visual representation of all files and modules affected by a specific change.
- **Type-Aware Impact**: Tracks how changes to types and interfaces affect downstream consumers.

## Safety Verdicts

The engine assigns a safety level to every proposed modification:

- **🟢 SAFE**: No downstream dependencies. Change is guaranteed not to break other modules.
- **🟡 RISKY**: Has dependencies, but they are within the same package or have clear interfaces. Automated healing is recommended.
- **🔴 DANGEROUS**: High-impact change affecting many modules or public APIs. Human review is mandatory.

## Programmatic Usage

Get impact analysis via the Headless API:

```javascript
const impact = await api.getImpactAnalysis('src/core/auth.ts', 'login');

console.log(`Safety: ${impact.refactorSafety.verdict}`);
console.log(`Blast Radius: ${impact.directDependents.length} files`);

if (impact.refactorSafety.isSafeToPrune) {
  console.log('Safe to proceed with automatic removal.');
} else {
  console.log(`Blocked because: ${impact.refactorSafety.blockReason}`);
}
```

## How it Works

1. **Graph Traversal**: The engine uses the Workspace Graph to identify all direct and indirect consumers of a module or export.
2. **Semantic Analysis**: It checks how the export is used – is it just imported, or is it part of a complex type hierarchy or dynamic runtime call?
3. **Regression Testing (Simulated)**: It simulates the change and checks for immediate structural or type errors in the graph.
4. **Scoring**: A safety score is calculated based on the number of dependents, the complexity of usage, and the presence of test coverage for the affected areas.

## Visualizing the Blast Radius

When using the CLI with the `--impact` flag, the engine generates a report showing the affected modules:

```bash
npx entkapp --impact src/utils/format.ts
```

**Output:**
```
🎯 Impact Analysis for src/utils/format.ts:
------------------------------------------------------------
Files directly affected: 12
Packages affected: 2
Safety Verdict: 🟡 RISKY
Reason: Export 'formatCurrency' is used in 8 components across 'web-app' and 'admin-panel'.
------------------------------------------------------------
```

## Best Practices

1. **Check Before You Prune**: Always run an impact analysis before manually deleting code that isn't flagged by the engine.
2. **Review Dangerous Changes**: Never automate changes marked as 🔴 DANGEROUS without a manual code review.
3. **Leverage Safety Verdicts**: Use safety verdicts to prioritize your refactoring efforts – start with the 🟢 SAFE ones.

## Troubleshooting

### Impact analysis is too broad
The engine might be over-estimating the impact if it can't distinguish between different exports in a barrel file. Ensure your barrel files are correctly analyzed.

### Missing dependencies
If a dependency is injected at runtime (e.g., via a Dependency Injection container), the static analyzer might miss it. Use the `MagicDetector` to register these virtual edges.
