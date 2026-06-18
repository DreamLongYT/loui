# Getting Started with entkapp v4.4.0

## Overview

entkapp v4.4.0 is a major update focused on solving the most critical issues currently facing the JavaScript/TypeScript ecosystem—many of which remain open in competing tools like Knip.

## Why v4.4.0?

This version isn't just a number; it's a statement. We've analyzed the most requested features and reported bugs from across the community and implemented robust solutions.

### 🚀 Key Improvements over Knip

| Feature | entkapp v4.4.0 | Knip v6 Status |
| :--- | :--- | :--- |
| **Circular Dependency Tracking** | ✅ Native Support | 💡 Open Feature Request (#1734) |
| **tsConfig Path Resolution** | ✅ Robust & v6-Ready | 🔄 Open Issue (#1794) |
| **Monorepo Hoisting Fix** | ✅ Automatic Detection | 🔄 Open Regression (#1792) |
| **Self-Healing / Auto-Fix** | ✅ Integrated | ⚠️ Limited |
| **Standalone Operation** | ✅ No dependencies | ⚠️ Requires full ecosystem |
| **Deep Program Analysis (CFG, Taint)** | ✅ Integrated | ❌ Not available |
| **Smart TypeScript Whitelisting** | ✅ Context-aware | ❌ Not available |
| **Windows Path Compatibility** | ✅ Robust | ⚠️ Known issues |
| **OXC Native Parsing** | ✅ Highly optimized | ❌ Not available |

## New Features & Enhancements

### 🔄 Circular Dependency Tracking
Detect circular dependencies in your codebase before they cause runtime issues or memory leaks. Unlike other tools, we provide a full trace of the cycle directly in the optimization plan.
[Read more about Circular Detection](/impact-analysis)

### 🗺️ Robust tsConfig Path Mapping
Our new `PathMapper` handles complex `baseUrl` and `paths` configurations with precision, ensuring that aliased imports are always resolved correctly, even in multi-package monorepos.

### 📦 Monorepo Hoisting Awareness
We've solved the "Sibling Workspace" problem. entkapp correctly identifies when dependencies are hoisted to the root, preventing false positives in individual packages.

### 🛠️ CLI Flag Refinement
- The `--no-fix` flag has been removed. Fixing is now **standardmäßig deaktiviert**.
- The `--fix` flag now activates atomic code updates and structural healing **without further questions**.

### 🌐 Windows & OXC Compatibility
- **Slashify Fix**: Correct handling of Windows drive paths (e.g., `C:/...`) to prevent parsing errors.
- **OXC Analyzer Correction**: Improved parsing logic for OXC, including `lang: "typescript"` for accurate `.ts` file parsing and robust handling of N-API conversion issues via JSON stabilization.
- **OXC Debugging**: Enhanced verbose output to clearly indicate OXC status and fallback to TypeScript Compiler API if OXC fails.

### 🚀 Advanced Program Analysis (Deep Tech)
- **Control Flow Graph (CFG) & Data Flow Analysis**: Build a CFG from your AST to track execution flow, enabling: 
  - **Reachable Code Analysis**: Detecting dead code that syntax-matching misses.
  - **Definite Assignment Checking**: Ensuring variables are initialized before use across all execution paths.
- **Program Dependence Graph (PDG) & Taint Tracking**: Implement Taint Analysis to track untrusted user input (sources) as it flows through the application to dangerous execution points (sinks, like SQL queries or `eval` statements). This turns your analyzer into a powerful SAST (Static Application Security Testing) tool.
- **Pointer Analysis / Alias Analysis**: Determine if two different identifiers point to the same memory location or object instance.

### ✨ Innovative & Novel Features
- **Workspace Diagnostic & Architecture Enforcement**: Go beyond individual file linting. Analyze the entire workspace structure. Let users define strict architectural boundaries (e.g., "Files in `/features` cannot import files from `/utilities` directly; they must go through the public API"). Validate workspace configuration health, such as checking for circular dependencies across monorepo packages, misaligned dependency versions, or invalid license headers.
- **Type Typo / "Type-Jail" Analysis**: For dynamically typed languages or loose TypeScript/JSDoc environments, track structural shapes implicitly to warn developers when they are accessing a property that probably doesn't exist on an object based on its history in the flow graph.
- **Complexity Matrix & Technical Debt Costing**: Combine complexity with change-frequency (via Git history integration). High-complexity code that changes often is a "Hotspot." Tell the developer exactly which files are costing them the most maintenance.

### 🕵️ Better Secrets Detection
- Enhanced heuristics for detecting hardcoded secrets, including Google API Keys, Firebase API Keys, SSH keys, and certificates.

### 🔄 Improved Dynamic Importing / Exporting / Entry
- More robust resolution of dynamic imports and exports, including handling of computed exports and complex barrel file structures.

## Quick Start

### Installation
```bash
npm install entkapp
```

### Basic Usage
```bash
npx entkapp -r
```

### Apply Fixes (with confirmation)
```bash
npx entkapp -r --fix
```

### Check for Circular Dependencies
```bash
npx entkapp -r --verbose
```

### Scan for Hardcoded Secrets
```bash
npx entkapp -r --verbose
```

> **Note**: Always use the `-r` or `--run` flag to execute the analysis loop. v4.4.0 focuses on security and precision. Use `--verbose` for detailed debugging output, including OXC status and fallback information.

## Community-Driven Development

We listen to the issues that matter. By addressing long-standing pain points like circular dependency tracking and robust path resolution, we ensure that your developer experience is smooth and productive.

[View the Full Reference](/reference)
