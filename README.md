# pkg-scaffold

[![NPM Version](https://img.shields.io/npm/v/pkg-scaffold.svg?style=flat&color=brightgreen&label=version)](https://www.npmjs.com/package/pkg-scaffold)
[![License](https://img.shields.io/npm/l/pkg-scaffold.svg?style=flat&color=blue)](https://www.npmjs.com/package/pkg-scaffold)
[![NPM Downloads](https://img.shields.io/npm/dm/pkg-scaffold.svg?style=flat&color=blueviolet)](https://www.npmjs.com/package/pkg-scaffold)

`pkg-scaffold` is a zero-config, intelligent **Workspace Genesis Engine**. Instead of forcing you to configure infrastructure *before* writing code, it crawls your raw scratchpads or prototypes, diagnoses the ecosystem, automatically generates structural runtime configurations, repairs unimported statements, provisions legal licenses from remote registries, and runs deep compatibility audits.

---

## 🚀 Core Features

* **Reverse Workspace Generation:** Analyzes your raw source files (`.js`, `.ts`, `.jsx`, `.tsx`) to instantly construct a tailored, valid `package.json`.
* **Phantom Dependency Remediation:** Detects modules used in code paths (like `fs.` or `axios.`) that were never explicitly imported, and automatically injects the proper `import` or `require` headers.
* **On-Demand Legal Provisioning:** Connects directly to the GitHub Licenses API to dynamically download, year-stamp, and author-sign standard licenses (`MIT`, `Apache-2.0`, `GPL-3.0`).
* **Adaptive Code Mirroring:** Learns your codebase formatting preferences (tabs vs. spaces, semicolon termination configurations) and outputs matching `.prettierrc` manifests.
* **Ecosystem-Aware Setup:** Automatically drops clean `.gitignore` files, standard `tsconfig.json` foundations if TypeScript dominates, and maps test parameters cleanly.
* **Integrated Deprecation Guard:** Runs an isolated local layer audit to intercept obsolete, abandoned, or heavily bloated imports.

---

## 📦 Installation & Immediate Usage

You do not even need to install it locally to weaponize a folder. Simply open your terminal in any directory of raw source code files and run:

```bash
npx pkg-scaffold