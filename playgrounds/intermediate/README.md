# Level: Intermediate
Production-ready structure with types and barrels.

## Challenges:
1. Detect `UnusedApp` in `src/app.ts`.
2. Detect `UnusedConfig` and `UnusedType` in `src/types/index.ts`.
3. Detect `Logger.error` as an unused member (harder for some engines).
4. Detect `someHelper` in `src/utils/unused-util.ts` (re-exported via barrel).
5. Identify `zod` as an unused dependency.
