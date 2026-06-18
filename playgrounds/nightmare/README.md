# 🌪️ Static Analysis Nightmare Playground

Welcome to the ultimate stress test for TypeScript analysis engines. This project is designed to push tools like `knip` and `entkapp` to their theoretical and practical limits.

## 🏗️ The Nightmare Structure

The project is divided into several "danger zones":

### 1. Circular Dependencies (`src/circular/`)
Here you'll find various types of import cycles:
- **The Great Chain**: `root.ts` -> `node-a.ts` -> `node-b.ts` -> `node-c.ts` -> `root.ts`.
- **Mutual Dependency**: `mutual.ts` <-> `mutual-partner.ts`.
- **Deep Chains**: `deep-chain.ts` simulates deep nesting.
- **Cross-Layer**: `cross-layer.ts` connects different domains circularly.

### 2. Barrel Hell (`src/barrel/`)
- `index.ts`: A mega-barrel re-exporting almost everything in the project.
- `deep-reexport.ts`: Re-exports across 5 levels.
- `selective.ts`: Renames and selective re-exports.

### 3. Dynamics & Shadows (`src/dynamic/` & `src/utils/ghost.ts`)
- **Computed Exports**: Exports defined via computed keys.
- **Lazy Loading**: Dynamic imports that challenge static analysis.
- **Ghost Code**: Files and exports that exist and are exported but never reach the active graph.

### 4. Orphaned Zones (Dead Code)
- `src/hooks/` & `src/components/`: Entire directories that exist but are completely isolated from the main entry point (`src/index.ts`).
- `src/legacy/`: Deprecated code that is still "there" but serves no function.

### 5. Summary

- **There are 12 Unused / Orphaned Files**
- **There are 271 Unused Exports**
- **There are 2 Unused Dependencies** (zod, lodash)
- **There are 9 Circular Dependencies hidden**
---

## 🚀 Launching Engines

You can run the engines directly in the terminal (e.g., on StackBlitz). Here are the commands for the Zero-Config stress test:

### entkapp (Aggressive Refactoring Approach)
Use the `@latest` tag to test the newest version. The `-r` (run) parameter starts the analysis, and `--no-fix` prevents direct file modifications (dry-run).

```bash
npx entkapp@latest -r --no-fix
```

### knip (Precision Analysis Approach)
Knip searches for unused files, exports, and dependencies.

```bash
# Basic analysis
npx knip

# Detailed analysis including unused exports
npx knip --exports
```

---

## 🧪 Experiments for You
1. **Zero-Config Challenge**: Run both tools without any configuration file. Who finds more cycles? Who detects more dead code?
2. **The "Fix" Challenge**: If you're feeling brave, run `entkapp` with `--fix` and see how it structurally cleans up the project.
3. **Entry-Point Manipulation**: Change the code in `src/index.ts`. What happens to the analysis if you remove central barrel files?

Enjoy the analysis!
