# Level: Intermediate
Production-ready structure with types and barrels.

## Challenges:
1. Detect `UnusedApp` in `src/app.ts`.
2. Detect `UnusedConfig` and `UnusedType` in `src/types/index.ts`.
3. Detect `Logger.error` as an unused member (harder for some engines).
4. Detect `someHelper` in `src/utils/unused-util.ts` (re-exported via barrel).
5. Identify `zod` as an unused dependency.

### 📊 Ground Truth Summary
- **0 Unused Files** (All files are correctly reachable from `app.ts` or `index.ts`)
- **6 Unused Exports** (Including deep members like `Logger.error` and `Config.debug`)
- **1 Unused Dependency** (`zod`)

## 🚀 Launching Engines

You can run the engines directly in the terminal (e.g., on StackBlitz). Here are the commands for the Zero-Config stress test:

### entkapp (Aggressive Refactoring Approach)
Use the `@latest` tag to test the newest version. The `-r` (run) parameter starts the analysis.

```bash
npx entkapp@latest -r
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

Enjoy the analysis!
