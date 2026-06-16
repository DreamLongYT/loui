# Getting Started with loui v3.3.15

## Overview

loui v3.3.15 is a major update focused on solving the most critical issues currently facing the JavaScript/TypeScript ecosystem—many of which remain open in competing tools like Knip.

## Why v3.3.15?

This version isn't just a number; it's a statement. We've analyzed the most requested features and reported bugs from across the community and implemented robust solutions.

### 🚀 Key Improvements over Knip

| Feature | loui v3.3.15 | Knip v6 Status |
| :--- | :--- | :--- |
| **Circular Dependency Tracking** | ✅ Native Support | 💡 Open Feature Request (#1734) |
| **tsConfig Path Resolution** | ✅ Robust & v6-Ready | 🔄 Open Issue (#1794) |
| **Monorepo Hoisting Fix** | ✅ Automatic Detection | 🔄 Open Regression (#1792) |
| **Self-Healing / Auto-Fix** | ✅ Integrated | ⚠️ Limited |
| **Standalone Operation** | ✅ No dependencies | ⚠️ Requires full ecosystem |

## New Features

### 🔄 Circular Dependency Tracking
Detect circular dependencies in your codebase before they cause runtime issues or memory leaks. Unlike other tools, we provide a full trace of the cycle.
[Read more about Circular Detection](/impact-analysis)

### 🗺️ Robust tsConfig Path Mapping
Our new `PathMapper` handles complex `baseUrl` and `paths` configurations with precision, ensuring that aliased imports are always resolved correctly, even in multi-package monorepos.

### 📦 Monorepo Hoisting Awareness
We've solved the "Sibling Workspace" problem. loui correctly identifies when dependencies are hoisted to the root, preventing false positives in individual packages.

## Quick Start

### Installation
```bash
npm install loui
```

### Basic Usage
```bash
npx loui -r --fix
```

### Check for Circular Dependencies
```bash
npx loui -r --circular
```

### Scan for Hardcoded Secrets
```bash
npx loui -r
```

> **Note**: Always use the `-r` or `--run` flag to execute the analysis loop. v3.3.15 focuses on security and precision.

## Community-Driven Development

We listen to the issues that matter. By addressing long-standing pain points like circular dependency tracking and robust path resolution, we ensure that your developer experience is smooth and productive.

[View the Full Reference](/reference)
