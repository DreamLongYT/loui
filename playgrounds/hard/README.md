# Level: Hard
Enterprise patterns, side effects, and deep trees.

## Challenges:
1. Detect `Registry.remove` as an unused class member.
2. Detect `UNUSED_EXPORT` in `src/core/registry.ts`.
3. Detect `PLUGIN_VERSION` in `src/plugins/index.ts` (tricky due to side-effect import).
4. Detect `unregister` in `src/plugins/base.ts`.
5. Detect `unusedPluginVal` in `src/plugins/unused-plugin.ts`.
6. Identify the entire `src/deep/` directory as unused (orphaned tree).
7. Identify `lodash` and `reflect-metadata` as unused dependencies.

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
