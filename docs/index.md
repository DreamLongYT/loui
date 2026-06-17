---
layout: home

hero:
  name: entkapp v4.3.0
  text: The Ultimate Enterprise Codebase Janitor
  tagline: Solving what Knip cannot. Circular-Aware & Self-Healing.
  image:
    src: /logo.png
    alt: entkapp
  actions:
    - theme: brand
      text: Get Started
      link: /guide
    - theme: alt
      text: View on GitHub
      link: https://github.com/DreamLongYT/entkapp

features:
  - title: Comprehensive Analysis
    details: Detect unused files, exports, and dependencies with precision. Supports monorepos and workspace protocols.
  - title: Self-Healing
    details: Automatically fix issues with intelligent refactoring, including backups and rollbacks via Git.
  - title: Type-Aware
    details: Full TypeScript support with type-safe refactoring. Understands complex type patterns.
  - title: Plugin Ecosystem
    details: Extensible architecture supporting custom plugins and full compatibility with Knip plugins.
  - title: Headless API
    details: Programmatic interface for seamless integration into CI/CD pipelines and custom workflows.
  - title: Security Scanning
    details: Detect hardcoded secrets, API keys, and sensitive data automatically during analysis.
---

## Why entkapp?

In large-scale enterprise projects, codebases naturally accumulate "cruft" – unused files, orphaned exports, and redundant dependencies. This "dead code" increases bundle sizes, slows down build times, and makes the codebase harder to maintain.

**entkapp** is not just another analysis tool. It's a proactive **Janitor** for your code. It doesn't just tell you what's wrong; it provides the tools to fix it automatically and safely.

### Key Benefits

| Benefit | Description |
| :--- | :--- |
| **Reduced Bloat** | Automatically prune unused files and dependencies to keep your project lean. |
| **Faster Builds** | Less code means faster compilation, testing, and deployment cycles. |
| **Better Quality** | Enforce architectural boundaries and maintain a clean, navigable codebase. |
| **Safety First** | Built-in Git sandboxing and intelligent repair ensure that refactoring never breaks your app. |

## Quick Comparison

| Feature | entkapp | Knip.dev |
| :--- | :---: | :---: |
| Dead Code Detection | ✅ | ✅ |
| Auto-Fix / Refactoring | ✅ | ⚠️ |
| Self-Healing | ✅ | ❌ |
| Secrets Detection | ✅ | ❌ |
| Knip Plugin Support | ✅ | N/A |
| Headless API | ✅ | ✅ |

## Quick Test

### entkapp v3.3.7

> **📦 entkapp v3.3.7 Engine Activation**

```
Target Workspace Root : E:\Download\final-test-package
Refactoring Mode     : Dry-Run Reporting Only
Validation Sandbox   : npm test
```

> **🎯 Starting entkapp Operational Optimization Cycle...**

```
🔗 Linking graph edges and checking structural usage paths...
🔄 Detecting circular dependencies...
🔍 Scanning for hardcoded secrets...
```

> **📊 Operational Diagnostics Summary:**

```
⏱️  Duration             : 0.09s
📁 Files Processed      : 4
💾 Cache Optimization   : 50.0% hits
```

> **🔍 Structural Integrity:**
> ❌ Found 2 orphaned/dead files.

```
   • clutter.ts
   • util.ts
```

> **✂️  Dead Exports Detected (8):**

```
   • UnusedComponent in test-folder\src\components\Unused.tsx:3
   • AnotherUnused in test-folder\src\components\Unused.tsx:7
   • usedHelper in test-folder\src\helpers.ts:1
   • unusedHelper in test-folder\src\helpers.ts:5
   • anotherUnused in test-folder\src\helpers.ts:9
   • UnusedInterface in test-folder\src\types.ts:1
   • UsedType in test-folder\src\types.ts:6
   • AnotherUnused in test-folder\src\types.ts:10
```

> **📦 Unused Dependencies (5):**

```
   • react (dependency in test-folder\package.json)
   • lodash (dependency in test-folder\package.json)
   • unused-lib (dependency in test-folder\package.json)
   • typescript (devDependency in test-folder\package.json)
   • @types/react (devDependency in test-folder\package.json)
```

> **🔐 Hardcoded Secrets Detected (3):**
> **CRITICAL (3):**

```
     • databaseUrl in src/App.tsx:7 [DATABASE_PASSWORD]
     • dbPassword in src/App.tsx:7 [DATABASE_]
     • bearerToken in src/App.tsx:8 [API_TOKEN]
```

> **✨ Core optimization cycle completed smoothly. Codebase workspace is healthy.**
> **✨ Core cycle execution completed successfully. Structural layout is clean.**

---

### Knip v6.16.1

> **Unused files (4)**

```
src/App.tsx
src/components/Unused.tsx
src/helpers.ts
src/types.ts
```

> **Unused dependencies (3)**

```
react       package.json:12:6
lodash      package.json:13:6
unused-lib  package.json:14:6
```

> **Unused devDependencies (1)**

```
@types/react  package.json:18:6
```

> **Unlisted binaries (1)**

```
entkapp  package.json
```

> **Configuration hints (1)**

```
src/index.ts    package.json  Package entry file not found
```

## Community & Support

- **GitHub**: [DreamLongYT/entkapp](https://github.com/DreamLongYT/entkapp)
- **NPM**: [entkapp](https://www.npmjs.com/package/entkapp)
- **License**: Apache-2.0 (The original code was from the lovely DreamLong)
