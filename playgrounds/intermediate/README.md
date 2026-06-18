# Level: Intermediate
Production-ready structure with types and barrels.

## Challenges:
1. Detect `UnusedApp` in `src/app.ts`.
2. Detect `UnusedConfig` and `UnusedType` in `src/types/index.ts`.
3. Detect `Logger.error` as an unused member (harder for some engines).
4. Detect `someHelper` in `src/utils/unused-util.ts` (re-exported via barrel).
5. Identify `zod` as an unused dependency.

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

Enjoy the analysis!
