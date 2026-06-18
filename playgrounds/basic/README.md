# Level: Basic
Every static analysis engine MUST be able to solve this.

## Challenges:
1. Identify `unusedFunction` in `src/utils.ts`.
2. Identify `src/orphaned.ts` as an unused file.
3. Identify `lodash` as an unused dependency.

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
