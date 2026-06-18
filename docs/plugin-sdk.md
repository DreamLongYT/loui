# Plugin SDK Guide

## Overview

Das Plugin SDK bietet Dienstprogramme und Helfer für die Entwicklung benutzerdefinierter Plugins, die die Analyse- und Heilungsfunktionen von entkapp erweitern. Plugins ermöglichen es Ihnen, Unterstützung für neue Frameworks, Sprachen und Analysemuster hinzuzufügen.

## Quick Start

```javascript
import { PluginSDK } from 'entkapp/src/api/PluginSDK.js';

const MyPlugin = PluginSDK.createPlugin({
  name: 'my-custom-plugin',
  configFiles: ['my-config.json'],
  
  async analyze(node, filePath, context) {
    // Ihre Analyselogik hier
    // Beispiel: Erkennen Sie, ob eine bestimmte Funktion aufgerufen wird
    if (node.rawStringReferences.has('mySpecialFunction')) {
      context.report({ type: 'CUSTOM_ANALYSIS', message: 'mySpecialFunction wurde gefunden', file: filePath });
    }
  },
  
  async transform(code, filePath, context) {
    // Ihre Transformationslogik hier
    // Beispiel: Ersetzen Sie 'oldFunction' durch 'newFunction'
    return code.replace(/oldFunction/g, 'newFunction');
  }
});

export default MyPlugin;
```

## Erstellen benutzerdefinierter Plugins

### Grundlegende Plugin-Struktur

Ein entkapp-Plugin ist ein JavaScript-Modul, das ein Objekt exportiert, das mit `PluginSDK.createPlugin` erstellt wurde. Dieses Objekt definiert die Metadaten und die Logik Ihres Plugins.

```javascript
import { PluginSDK } from 'entkapp/src/api/PluginSDK.js';

const MyFrameworkPlugin = PluginSDK.createPlugin({
  name: 'my-framework',
  
  // Konfigurationsdateien, die anzeigen, dass dieses Framework aktiv ist
  // Wenn eine dieser Dateien im Projekt-Root gefunden wird, wird das Plugin aktiviert.
  configFiles: ['my-framework.config.js', 'my-framework.json'],
  
  // Routenmuster für Dateien, die dieses Plugin analysieren soll
  // Nur Dateien, die diesen Regex-Mustern entsprechen, werden an die `analyze`-Methode übergeben.
  routePatterns: [/\.(tsx?|jsx?)$/],
  
  // Symbole, die implizit vom Framework benötigt werden (z.B. globale Variablen, magische Strings)
  // Diese werden als 
