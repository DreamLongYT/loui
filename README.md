# 📦 pkg-scaffold v3.1.1

**The Ultimate Enterprise Codebase Janitor: OXC-Powered, Type-Aware, and Self-Healing.**

[![npm version](https://img.shields.io/npm/v/pkg-scaffold.svg?style=flat&color=CB3837)](https://www.npmjs.com/package/pkg-scaffold)
[![License](https://img.shields.io/badge/license-MIT-orange.svg?style=flat)](LICENSE)
[![Performance](https://img.shields.io/badge/performance-OXC--Inside-blueviolet.svg?style=flat)](https://oxc.rs/)

`pkg-scaffold` is the industry's most advanced codebase optimization engine. Version 3.1.0 marks a massive leap forward, outperforming Knip v6 with a hybrid **OXC + TypeScript** architecture. It doesn't just find dead code—it safely prunes it and validates your project's integrity through a unique **Self-Healing Loop**.

---

## 🚀 Why pkg-scaffold@3.1.1?

### 1. Extreme Speed with OXC
By integrating the Rust-based **OXC (Oxc-Parser & Oxc-Resolver)**, pkg-scaffold v3.1.0 achieves a **2-4x performance boost** over previous versions, matching and often exceeding the speed of Knip v6 for single-pass analysis.

### 2. True Type-Aware Analysis
Unlike basic linters, pkg-scaffold uses the full **TypeScript Compiler API** to resolve types across your entire project. This ensures that implicitly implemented interfaces, extended objects, and global ambient overrides are correctly tracked, reducing false positives to near zero.

### 3. Automated Self-Healing (The "Fix" Loop)
This is the "Knip-Killer" feature. pkg-scaffold doesn't just give you a report; it:
1.  **Identifies** unused code.
2.  **Prunes** it automatically.
3.  **Validates** the change by running your test suite.
4.  **Self-Heals** by rolling back immediately if a test fails.

### 4. Modular Plugin Ecosystem
With a dedicated `/pkg-scaffold` directory, you can now manage local configurations and custom plugins. We even support **Knip-style plugins**, allowing you to leverage the existing ecosystem while using our superior engine.

---

## ⚔️ Competitive Analysis: pkg-scaffold vs. The Rest

| Feature | **pkg-scaffold v3.1.0** | Knip v6 | Depcheck |
| :--- | :---: | :---: | :---: |
| **Parsing Engine** | ⚡ **OXC (Rust) + Hybrid TS** | ⚡ OXC (Rust) | ⚠️ Regex/Loose |
| **Type-Awareness** | ✅ **Full Program API** | ✅ Yes | ❌ No |
| **Automated Pruning** | ✅ **Native & Safe** | ⚠️ Experimental | ❌ No |
| **Self-Healing Loop** | ✅ **Yes (Auto-Rollback)** | ❌ No | ❌ No |
| **Plugin Architecture** | ✅ **Modular + Knip-Compat** | ✅ Built-in Only | ❌ No |
| **Namespace Tracking** | ✅ **Sub-Symbol Level** | ✅ Yes | ❌ No |
| **Security Audit** | ✅ **Dynamic Registry Check** | ❌ No | ❌ No |

### Where Knip.dev is still strong:
- **Maturity:** Knip has a larger set of pre-configured community plugins (150+).
- **Ecosystem:** More integrations with niche tools and legacy build systems.
*However, pkg-scaffold's Knip-compatibility layer is designed to bridge this gap.*

---

## 🛠️ Installation & Usage

### 1. Add to your project
```bash
npm install --save-dev pkg-scaffold
```

### 2. Configure (Optional)
Create a `pkg-scaffold/config.json` to customize your experience:
```json
{
  "interface": "CLI",
  "options": {
    "fastMode": true,
    "selfHealing": true
  }
}
```

### 3. Run the Engine
Add this to your `package.json` scripts:
```json
"scripts": {
  "pkg-scaffold:run": "pkg-scaffold --fix --test-command 'npm test'"
}
```

---

## 📂 Project Structure

- **`/pkg-scaffold/config.json`**: Your local settings (CLI/GUI, Plugin Toggles).
- **`/pkg-scaffold/plugins/`**: Drop your custom or Knip-style plugins here.
- **`/docs/`**: Full [Plugin Development Guide](https://dreamlongyt.github.io/pkg-scaffold/).

---

## 🛡️ Suppression

Protect specific code from the janitor:

```javascript
/**
 * @scaffold-suppress
 */
export const internalHelper = () => { /* Safe from pruning */ };
```

---

## 📜 License

MIT © DreamLongYT & The Enhanced Contributors.
