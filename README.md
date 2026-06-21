# 🕸️ entkapp Ultimate v5.2.4

> **The Ultimate Enterprise Codebase Janitor.** Faster than Knip with OXC integration, type-aware analysis, and automated structural healing. Fully standalone - solving what Knip cannot.

![Version](https://img.shields.io/npm/v/entkapp) ![License](https://img.shields.io/badge/license-Apache--2.0-green.svg) ![Performance](https://img.shields.io/badge/performance-OXC--Inside-blueviolet.svg)

---

`entkapp` ist eine next-generation Engine zur statischen Code-Analyse, die die Stabilität der bewährten Version 7 mit den Hochleistungs-Features der Version 9 kombiniert. Sie findet ungenutzte Dateien, tote Exports, zirkuläre Abhängigkeiten und Sicherheitsrisiken schneller als jedes andere Tool im Ökosystem.

## 🚀 Warum entkapp?

*   **⚡ Blazing Fast:** Nutzt den Rust-basierten `oxc-parser` für extrem schnelle AST-Traversierung, kombiniert mit der TypeScript Compiler API für tiefe semantische Analysen.
*   **🔌 Massives Plugin-System:** Über 80+ integrierte Plugins (React, Vue, Svelte, Angular, Next.js, Nuxt, SvelteKit, Astro, Vite, Webpack, Turbo, Nx, Tailwind, ESLint, Prettier und viele mehr).
*   **💀 True Dead Code Detection:** Fortschrittliche graphbasierte Analyse zur Identifizierung von wirklich verwaistem Code.
*   **🔄 Circular Dependency Detection:** Hochperformante Erkennung von zirkulären Abhängigkeiten mittels Tarjan's Algorithmus.
*   **🔐 Secrets Scanning:** Automatische Erkennung von hartkodierten API-Keys, Tokens und Anmeldedaten.
*   **🛠️ Automated Structural Healing:** Repariert Abhängigkeitsprobleme und strukturelle Fehler automatisch mit Git-basiertem Rollback-Schutz.

## 📦 Installation

```bash
# Direkt ausführen ohne Installation (empfohlen)
npx entkapp

# Oder global installieren
npm install -g entkapp
```

## 🛠️ Nutzung

### Interaktiver Modus (Standard)
Startet den interaktiven Analyse- und Scaffolding-Workflow:
```bash
npx entkapp
```

### Headless Analyse-Modus
Ideal für CI/CD-Pipelines. Führt die Analyse ohne Prompts durch und gibt JSON aus:
```bash
npx entkapp --analyze
```

### Auto-Fix Modus
Behebt automatisch Abhängigkeitskonflikte und strukturelle Probleme:
```bash
npx entkapp --fix
```

### Zusätzliche Optionen
```bash
npx entkapp --cwd ./mein-projekt   # Analysiert ein spezifisches Verzeichnis
npx entkapp --verbose              # Aktiviert detailliertes Logging
npx entkapp --version              # Zeigt die Versionsnummer
npx entkapp --help                 # Zeigt das Hilfe-Panel
```

## 🧠 Fortgeschrittene Architektur

### Incremental Caching
`entkapp` verwendet eine persistente Graph-Status-Schicht (`.entkapp-cache`). Es berechnet SHA-256 Hashes von Dateipuffern, um das AST-Parsing für unveränderte Dateien zu überspringen.

### Parallel Analysis
Bei größeren Codebasen verteilt `entkapp` die Arbeitslast automatisch auf mehrere CPU-Threads mittels Node.js Worker Threads.

### Pluggable Architecture
Die Engine ist modular aufgebaut:
- **`EntkappEngine`**: Der zentrale Orchestrator.
- **`PluginRegistry`**: Verwaltet den Lebenszyklus der Framework-Plugins.
- **`ASTAnalyzer` / `OxcAnalyzer`**: Multi-pass AST-Walker für tiefgehende Analysen.
- **`SelfHealer`**: Transaktionales Refactoring mit Git-State-Capture und Rollback.

## 📄 Lizenz

Apache-2.0
