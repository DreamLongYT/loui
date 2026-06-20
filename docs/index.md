---
layout: home

hero:
  name: entkapp v5.1.0
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

**entkapp** is not just another analysis tool . It's a proactive **Janitor** for your code. It doesn't just tell you what's wrong; it provides the tools to fix it automatically and safely.

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
| Knip Plugin Support | ❌ (Deprecated since v5.1.0+) | N/A |
| Headless API | ✅ | ✅ |
---

## Community & Support

- **GitHub**: [DreamLongYT/entkapp](https://github.com/DreamLongYT/entkapp)
- **NPM**: [entkapp](https://www.npmjs.com/package/entkapp)
- **License**: Apache-2.0 (The original code was from the lovely DreamLong)
