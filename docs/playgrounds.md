# Analysis Playgrounds

Explore our curated collection of test projects designed to benchmark static analysis engines. From simple unused exports to complex circular dependency nightmares, these playgrounds help you understand the depth and precision of your tools.

## 🎯 Levels of Complexity

| Level | Badge | Playground Link | Focus |
| :--- | :--- | :--- | :--- |
| **Basic** | <Badge type="tip" text="Beginner" /> | [Launch Basic](https://stackblitz.com/github/DreamLongYT/entkapp/tree/main/playgrounds/basic?file=README.md) | Unused files & simple exports |
| **Normal** | <Badge type="info" text="Standard" /> | [Launch Normal](https://stackblitz.com/github/DreamLongYT/entkapp/tree/main/playgrounds/normal?file=README.md) | Re-exports & unused dependencies |
| **Intermediate** | <Badge type="warning" text="Advanced" /> | [Launch Intermediate](https://stackblitz.com/github/DreamLongYT/entkapp/tree/main/playgrounds/intermediate?file=README.md) | Barrel files, types & interfaces |
| **Hard** | <Badge type="danger" text="Enterprise" /> | [Launch Hard](https://stackblitz.com/github/DreamLongYT/entkapp/tree/main/playgrounds/hard?file=README.md) | Side-effects & deep trees |
| **Nightmare** | <Badge type="danger" text="God Mode" /> | [Launch Nightmare](https://stackblitz.com/github/DreamLongYT/entkapp/tree/main/playgrounds/nightmare?file=README.md) | Circular chains & dynamic exports |

---

## 📂 Playground Details

### 🟢 Basic
The entry point for every analysis tool. If an engine fails here, it's not ready for production.
- **Challenges**: 1 unused file, 1 unused function, 1 unused dependency.
- **Try it**: [Playground - Basic](https://stackblitz.com/github/DreamLongYT/entkapp/tree/main/playgrounds/basic?file=README.md)

### 🔵 Normal
Simulates a typical small-scale project structure.
- **Challenges**: Re-exports from nested files, multiple unused dependencies (`axios`, `lodash`).
- **Try it**: [Playground - Normal](https://stackblitz.com/github/DreamLongYT/entkapp/tree/main/playgrounds/normal?file=README.md)

### 🟡 Intermediate
A production-like environment where types and organizational patterns matter.
- **Challenges**: Unused interface definitions, unused class members, and barrel file (`index.ts`) traversal.
- **Try it**: [Playground - Intermediate](https://stackblitz.com/github/DreamLongYT/entkapp/tree/main/playgrounds/intermediate?file=README.md)

### 🔴 Hard
Enterprise-level complexity that trips up many "fast" scanners.
- **Challenges**: Side-effect imports, deep orphaned directory trees, and complex registry patterns.
- **Try it**: [Playground - Hard](https://stackblitz.com/github/DreamLongYT/entkapp/tree/main/playgrounds/hard?file=README.md)

### 💀 Nightmare
The ultimate stress test. Designed to break engines or force them into infinite loops.
- **Challenges**: Multi-file circular dependency chains, dynamic imports with computed keys, and 5-level deep re-export chains.
- **Try it**: [Playground - Nightmare](https://stackblitz.com/github/DreamLongYT/entkapp/tree/main/playgrounds/nightmare?file=README.md)

---

## 🛠️ How to use

1. **Launch** the playground using the links above.
2. **Install** dependencies in the StackBlitz terminal:
   ```bash
   npm install
   ```
3. **Run** your analysis tool (e.g., using the latest `entkapp`):
   ```bash
   npx entkapp@latest -r --no-fix
   ```

::: warning CAUTION
When running on the **Nightmare** level, some engines might experience high CPU usage or timeouts due to the extreme circularity of the dependency graph.
:::
