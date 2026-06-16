# 📦 pkg-scaffold

![Logo](./logo.png)

> **The Ultimate Enterprise Codebase Janitor.** Faster than Knip with OXC integration, type-aware analysis, and automated structural healing. Fully standalone - solving what Knip cannot.

![Version](https://img.shields.io/npm/v/pkg-scaffold) ![License](https://img.shields.io/badge/license-Apache--2.0-green.svg) ![Performance](https://img.shields.io/badge/performance-OXC--Inside-blueviolet.svg)

`pkg-scaffold` is a next-generation tool designed to declutter your JavaScript and TypeScript projects. It finds unused files, unused dependencies, dead code, circular dependencies, and more. It is built to be a direct and superior competitor to `knip.dev`.

## 🚀 Why pkg-scaffold over Knip?

*   **⚡ Blazing Fast:** Powered by `oxc-parser` (Rust-based) for lightning-fast AST traversal. Fallback to TypeScript compiler API when needed.
*   **🔌 Massive Plugin Ecosystem:** Over 20+ built-in plugins (Next.js, Nuxt, SvelteKit, Tailwind, Jest, Vitest, Playwright, GitHub Actions, Webpack, Babel, Rollup, ESLint, Prettier, Husky, and many more).
*   **💀 True Dead Code Detection:** Advanced graph-based reachability analysis to find truly dead files and unused exports, even deep within your codebase.
*   **🔄 Circular Dependency Detection:** High-performance Tarjan-based algorithm to detect and report circular dependencies.
*   **🔐 Secrets Scanning:** Automatically detects hardcoded API keys, tokens, and credentials (v3.3.6+).
*   **🛡️ Supply Chain Guard:** Detects typosquatting and verifies integrity lockfile hashes.
*   **🛠️ Automated Structural Healing:** Not just reporting, but automatically fixing structural issues (removing dead files, pruning unused dependencies) with git-based rollback protection and **SHA-256 transaction integrity (v3.3.7+)**.
*   **⚛️ Framework Precision:** Enhanced support for JSX, Decorators, and Monorepos with reliable cross-thread data merging (v3.3.7+).
*   **⚙️ Flexible Configuration:** Supports `pkg-scaffold.json`, `pkg-scaffold.ts`, `scaffold.config.js`, and more.

## 📦 Installation

```bash
npm install -D pkg-scaffold
# or
pnpm add -D pkg-scaffold
# or
pnpm add -D pkg-scaffold
```

## 🚀 Usage

Run the CLI at the root of your project:

```bash
npx pkg-scaffold -r
```

> **Note**: Always use the `-r` flag to start the analysis loop. v3.3.7+ features **Atomic Refactoring**, **Improved JSX Support**, and **SHA-256 Backups**.

### CLI Options

*   `-c, --cwd <path>`: Specify the execution context root directory.
*   `--fix`: Enable atomic code updates, structural file pruning, and active type sanitization.
*   `--no-fix`: Disable direct file manipulation (dry-run reporting mode).
*   `--tsconfig <filename>`: Specify path to custom layout configurations.
*   `--verbose`: Toggle expanded trace telemetry for debug operational diagnostics.
*   `-r, --run`: Execute the primary operational pipeline loop.
*   `-y, --yes`: Skip confirmation prompts.

## ⚙️ Configuration

Create a `pkg-scaffold.json` (or `.js`, `.ts`) in your project root:

```json
{
  "entryPoints": ["src/index.ts"],
  "exclude": ["node_modules/**", "dist/**", "**/*.test.ts"],
  "rules": {
    "no-unused-exports": "error",
    "no-dead-code": "error"
  }
}
```

## 🔌 Supported Plugins

`pkg-scaffold` automatically detects your ecosystem and enables the relevant plugins:

*   **Frameworks:** Next.js, Nuxt, Remix, SvelteKit, Astro, Vue, Angular
*   **Testing:** Jest, Vitest, Playwright, Cypress
*   **Build Tools:** Webpack, Rollup, Babel, PostCSS, TailwindCSS
*   **Linters/Formatters:** ESLint, Prettier, Commitlint, Lint-Staged, Husky
*   **CI/CD:** GitHub Actions
*   **And more!**

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License

Apache-2.0 License.
