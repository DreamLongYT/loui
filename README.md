# 🚀 pkg-scaffold

**Advanced Dependency Intelligence & Zero-Config Workspace Initializer**

`pkg-scaffold` is a high-performance CLI tool designed to audit, clean, and initialize your JavaScript/TypeScript workspaces. It goes far beyond simple scaffolding by analyzing your source code's Abstract Syntax Tree (AST) to find critical issues like undeclared dependencies, orphaned packages, and security leaks.


[![npm version](https://img.shields.io/npm/v/pkg-scaffold.svg?style=flat&color=CB3837)](https://www.npmjs.com/package/pkg-scaffold)
[![npm downloads](https://img.shields.io/npm/dm/pkg-scaffold.svg?style=flat&color=34ADFF)](https://www.npmjs.com/package/pkg-scaffold)
[![License](https://img.shields.io/badge/license-MIT-orange.svg?style=flat)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/DreamLongYT/pkg-scaffold.svg?style=flat&color=gold)](https://github.com/DreamLongYT/pkg-scaffold/stargazers)

---

## ✨ Why pkg-scaffold?

Most tools just create a `package.json`. `pkg-scaffold` **understands** your code. It bridges the gap between your source files and your configuration.

### 🔍 Deep Intelligence Features

*   **🚨 Ghost Dependency Detection**: Finds packages you `import` in your code but forgot to add to `package.json`. These are critical errors that will break your CI/CD or production builds.
*   **🗑️ Orphaned Package Identification**: Finds packages listed in your `package.json` that are never actually used in your code. Perfect for reducing bundle size and "dependency bloat".
*   **⚡ Unused Import Auditor**: Pinpoints specific files and line numbers where a package is imported but its identifier is never referenced.
*   **🔐 Security Compliance**: Automatically scans for hardcoded secrets (API keys, tokens, passwords) and offers to move them safely into `.env` files.
*   **📛 Deprecation Guard**: Live-checks your dependencies against the npm registry to warn you about deprecated or non-existent packages.
*   **🏗️ Intelligent Scaffolding**: Detects your framework (React, Vue, Svelte, Next.js, etc.) and automatically generates optimized `tsconfig.json`, `eslint.config.js`, `.prettierrc`, and `.gitignore`.
*   **📦 Monorepo Ready**: Automatically detects sub-workspaces and offers to set up `pnpm-workspace.yaml` or npm/yarn workspaces.

---

## 🚀 Quick Start

You don't even need to install it to try it out:

```bash
npx pkg-scaffold
```

Or install it globally:

```bash
npm install -g pkg-scaffold
# then run
pkg-scaffold
```

---

## 🛠️ How it works

### 1. The Scan
`pkg-scaffold` crawls your workspace, ignoring `node_modules` and build artifacts. It parses every `.js`, `.ts`, `.jsx`, and `.tsx` file using a high-performance AST engine.

### 2. The Analysis
It maps your imports against your `package.json`. It knows about:
*   **Aliases**: Understands that `lodash` is often imported as `_`.
*   **Binaries**: Knows that `tsc` comes from `typescript` and `vite` from `vite`.
*   **Type-only imports**: Correctly handles TypeScript `import type` without flagging them as unused.
*   **Side-effects**: Detects `import 'css-file'` or polyfills correctly.

### 3. The Fix
The tool is interactive. It will ask you before:
*   Adding missing (ghost) dependencies.
*   Pruning unused (orphaned) packages.
*   Injecting `dotenv` initialization.
*   Moving secrets to `.env`.

---

## 📊 Summary Report
At the end of every run, you get a clear intelligence summary:

```text
═══════════════════════════════════════════════════════════════════
📊 DEPENDENCY INTELLIGENCE SUMMARY
═══════════════════════════════════════════════════════════════════
   📁 Files scanned:           42
   📦 Packages imported:        18
   🚨 Ghost deps (missing):     2 — CRITICAL
   🗑️  Orphaned deps (unused):   3
   ⚡ Unused imports:           5
   📛 Deprecated packages:      1
   🔐 Hardcoded secrets:        1 — SECURITY RISK
═══════════════════════════════════════════════════════════════════
```

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Built with ❤️ by [DreamLongYT](https://github.com/DreamLongYT)**
