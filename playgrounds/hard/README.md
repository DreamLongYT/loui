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
