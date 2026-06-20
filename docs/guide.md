# Getting Started with entkapp v5.2.1

## Overview

entkapp v5.2.1 is the **Ultimate Hybrid Edition**, merging the rock-solid stability of Version 7 with the high-performance innovations of Version 9. It is specifically engineered to handle massive enterprise codebases where precision and speed are non-negotiable.

## Why v5.2.1 (The Hybrid Edition)?

This version addresses the "unstable feature-creep" of previous iterations by restoring the proven core logic from v7 while keeping the cutting-edge plugin architecture and OXC performance from v9.

### 🚀 Key Improvements & Comparisons

| Feature | entkapp v5.2.1 | Knip v6 Status |
| :--- | :--- | :--- |
| **Engine Stability** | ✅ v7 Core (Rock Solid) | ⚠️ Iterative |
| **Circular Dependency Tracking** | ✅ Native Support (Tarjan-Algorithm) | 💡 Open Feature Request (#1734) |
| **OXC Native Parsing** | ✅ Highly optimized (Rust binding pipeline) | ❌ Not available |
| **Ecosystem Plugins** | ✅ 80+ (Next.js, Nuxt, Astro, etc.) | ⚠️ Plugin-based |
| **tsConfig Path Resolution** | ✅ Robust & v6-Ready | 🔄 Open Issue (#1794) |
| **Monorepo Hoisting Fix** | ✅ Automatic Detection | 🔄 Open Regression (#1792) |
| **Self-Healing / Auto-Fix** | ✅ Integrated (With safe transaction boundaries) | ⚠️ Limited |
| **Deep Program Analysis (CFG, Taint)** | ✅ Integrated | ❌ Not available |
| **SAST (ReDoS, Prototype Pollution)** | ✅ Integrated | ❌ Not available |
| **Incremental Watch Mode Analysis** | ✅ Native (Sub-second diff compilation via GraphCache) | ❌ Full scan required |
| **Supply Chain Typosquatting Detection** | ✅ Integrated (Verifies lockfile hashes and names) | ❌ Not available |
| **Automated Structural Transaction Integrity** | ✅ Native (SHA-256 backed modifications with GitSandbox) | ❌ Not available |
| **Dynamic Import Reachability Profiling** | ✅ Integrated (CFG-based predictive resolution) | ⚠️ Static string mapping only |
| **Dead-Code Graph Reachability** | ✅ Deep graph traversal for absolute dead files | ⚠️ Syntactic heuristic checking only |
| **Monorepo Boundary Enforcement** | ✅ Restricts illegal cross-package module leaking | ❌ Config-reliant path allowance only |
| **Type-Aware Dependency Pruning** | ✅ Prunes `devDependencies` matching only unused types | ❌ Structural manifest analysis only |
| **Orphaned Barrel Export Resolution** | ✅ Flattens and validates complex re-export index chains | ⚠️ Frequent false-positives on nested barrels |
| **Graceful AST Fault Tolerance** | ✅ Continues graph build on invalid/broken syntax nodes | ❌ Total analysis crash on unparsed tokens |


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

## ⚡ v4.5.0: The "JIT-Friendly" & SAST Update

### 1. Engine-Level Optimizations
- **Monomorphic Shape Enforcement**: Catch varying object shapes that trigger JIT de-optimization.
- **Array Type Invalidation Tracker**: Detect expensive structural layout shifts in arrays.

### 2. Global Native Topology Mapping
- **Package.json Export Reachability**: Ensure exports are reachable from the public API.
- **Strict Worker-Thread Safety**: Track non-serializable data passed to Worker threads.

### 3. Structural Security Analysis (SAST)
- **Prototype Pollution Sink-Detection**: Identify dynamic property assignments without proper filtering.
- **ReDoS Scanner**: Detect evil nested quantifiers in regular expressions.

## 📊 v4.5.0: The "Ultimate Vanilla" Update

### 1. Traceable JSON/YAML Integrity Verification
- **Schema Matching**: entkapp parses raw static JSON/YAML files and ensures they conform exactly to your TypeScript interfaces. Catch missing required fields during compile time!

### 2. Event-Driven Loop Leak Trackers
- **Event Listener Pruning**: Track the lifecycle of event handlers (`.on()`, `.addListener()`).
- **Leak Detection**: If a listener has no matching `.off()` or `.removeListener()` pathway in the control flow graph, entkapp flags it as an Active Event Leak Risk.

### 3. Single-Pass Binary Shaking (Cross-Language)
- **FFI Export Tracing**: Inspect symbol definitions in native bindings (Bun.FFI, Wasm).
- **Dead Native Code Detection**: Highlight unused native binary bindings that can be stripped from compilation targets.

### 4. Architectural Sandbox Enforcement
- **Dependency Sandboxing**: Enforce strict directory-level restrictions natively.
- **Structural Wall Violations**: Prevent unauthorized pathways between modules (e.g., prohibiting `src/core` from importing `src/network`).

### 5. Path-Sensitive Null / Undefined Dereference Tracking
- **Nullability State Tracking**: entkapp tracks the nullability state of identifiers across execution splits.
- **Guaranteed Runtime Exceptions**: If a property access occurs on a potentially null/undefined object before a conditional guard, entkapp flags a Guaranteed Runtime Dereference Exception.

### 6. Structural AST Clone Detection
- **Type-0 to Type-3 Clones**: entkapp detects duplicate logic structures using sliding window hashes of AST sub-trees, even if variable names are changed.
- **Deduplication Suggestions**: Identify identical logic patterns across different files and suggest extracting them into shared utilities.

### 7. Escape Analysis for Identifier Lifetimes
- **Scope Minimization**: entkapp determines the exact strict boundaries of where a declared variable is visible.
- **Visibility Optimization**: If a variable is only used within a small child block, entkapp suggests pushing the initialization down to maximize readability and structural integrity.

### 8. Exact Execution Graph Visualizer
- **Interactive Tree**: Use `entkapp --visualize` to generate a lightweight ASCII tree mapping out the codebase's true network topology.
- **Audit Transparency**: See exactly why a file is considered alive or dead by tracing the edges back to the entry point.

### 9. Infinite-Loop & Deep Recursion Static Proofs
- **Termination Analysis**: Evaluate loop termination criteria using the Control Flow Graph.
- **Execution Traps**: Identify `while(true)` loops or recursive functions without reachable termination paths before running the code.

### 10. Configuration Sanitizer (Self-Cleaning)
- **Dead Ignore Rules**: entkapp analyzes its own exception comments and configurations.
- **Config Hygiene**: Identify and flag `entkapp-ignore` comments that are no longer necessary, keeping your project's configuration minimal and clean.

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

> **Note**: Always use the `-r` or `--run` flag to execute the analysis loop. v5.1.0 focuses on security and precision. Use `--verbose` for detailed debugging output, including OXC status and fallback information.

## Community-Driven Development

We listen to the issues that matter. By addressing long-standing pain points like circular dependency tracking and robust path resolution, we ensure that your developer experience is smooth and productive.

[View the Full Reference](/reference)
