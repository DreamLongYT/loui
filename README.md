# 🕸️ luoi

> **The Ultimate Enterprise Codebase Janitor.** Faster than Knip with OXC integration, type-aware analysis, and automated structural healing. Fully standalone - solving what Knip cannot.

![Version](https://img.shields.io/npm/v/luoi) ![License](https://img.shields.io/badge/license-Apache--2.0-green.svg) ![Performance](https://img.shields.io/badge/performance-OXC--Inside-blueviolet.svg)

## 🌐 Pronunciation
**luoi** (pronounced: *loo-oy*) — from the Vietnamese word *lưới* (mesh/net). 
*Pronunciation tip for English speakers: It rhymes with "buoy" or "boy," with a soft "loo" at the start.*

---

`luoi` is a next-generation tool designed to declutter your JavaScript and TypeScript projects. It finds unused files, unused dependencies, dead code, circular dependencies, and more. It is built to be a direct and superior competitor to `knip.dev`.

## 🚀 Why luoi over Knip?

* **⚡ Blazing Fast:** Powered by `oxc-parser` (Rust-based) for lightning-fast AST traversal.
* **🔌 Massive Plugin Ecosystem:** Over 20+ built-in plugins (Next.js, Nuxt, SvelteKit, Tailwind, Jest, Vitest, Playwright, etc.).
* **💀 True Dead Code Detection:** Advanced graph-based reachability analysis to find truly dead files and unused exports.
* **🔄 Circular Dependency Detection:** High-performance Tarjan-based algorithm to detect circular dependencies.
* **🔐 Secrets Scanning:** Automatically detects hardcoded API keys, tokens, and credentials.
* **🛡️ Supply Chain Guard:** Detects typosquatting and verifies integrity lockfile hashes.
* **🛠️ Automated Structural Healing:** Automatically fixes structural issues with git-based rollback protection and SHA-256 transaction integrity.
* **⚛️ Framework Precision:** Enhanced support for JSX, Decorators, and Monorepos with reliable cross-thread data merging.
* **⚙️ Flexible Configuration:** Supports `luoi.json`, `luoi.ts`, `luoi.config.js`, and more.

## 📦 Installation

```bash
npm install -D luoi
# or
pnpm add -D luoi