# 🕸️ entkapp Ultimate v5.3.1

> **The Ultimate Enterprise Codebase Janitor.** High-speed OXC integration, type-aware analysis, and automated structural healing. Fully standalone architectural orchestrator.

![Version](https://img.shields.io/npm/v/entkapp) ![License](https://img.shields.io/badge/license-Apache--2.0-green.svg) ![Performance](https://img.shields.io/badge/performance-OXC--Inside-blueviolet.svg)

---

`entkapp` is a next-generation static code analysis engine. It identifies unused files, dead exports, circular dependencies, and security risks faster than any other tool in the ecosystem..

## 🚀 Why entkapp?

*   **⚡ Blazing Fast:** Leverages the Rust-based `oxc-parser` for ultra-fast AST traversal, combined with the TypeScript Compiler API for deep semantic analysis.
*   **🔌 Massive Plugin System:** Over 98 built-in plugins (React, Vue, Svelte, Angular, Next.js, Nuxt, SvelteKit, Astro, Vite, Webpack, Turbo, Nx, Tailwind, ESLint, Prettier, and many more).
*   **💀 True Dead Code Detection:** Advanced graph-based analysis to identify genuinely orphaned code.
*   **🔄 Circular Dependency Detection:** High-performance detection of circular dependencies using Tarjan's algorithm.
*   **🔐 Secrets Scanning:** Automatic detection of hardcoded API keys, tokens, and credentials.
*   **🛠️ Automated Structural Healing:** Automatically fixes dependency issues and structural errors with Git-based rollback protection.

## 📦 Installation

```bash
# Run directly without installation (recommended)
npx entkapp

# Or install it globally
npm install -g entkapp
```

## 🛠️ Usage

### Interactive Mode (Default)
Starts the interactive analysis:
```bash
npx entkapp -r
```

### Headless Analysis Mode
Ideal for CI/CD pipelines. Performs analysis without prompts and outputs JSON:
```bash
npx entkapp --analyze
```

### Auto-Fix Mode
Automatically resolves dependency conflicts and structural issues:
```bash
npx entkapp --fix
```

### Additional Options
```bash
npx entkapp --cwd ./my-project  -r    # Analyzes a specific directory
npx entkapp --verbose -r              # Enables detailed logging
npx entkapp --version                 # Displays the version number
npx entkapp --help                    # Displays the help panel
```

## 🧠 Advanced Architecture

### Incremental Caching
`entkapp` uses a persistent graph state layer (`.entkapp-cache`). It calculates SHA-256 hashes of file buffers to skip AST parsing for unchanged files.

### Parallel Analysis
For larger codebases, `entkapp` automatically distributes the workload across multiple CPU threads using Node.js Worker Threads.

## 📄 License

Apache-2.0