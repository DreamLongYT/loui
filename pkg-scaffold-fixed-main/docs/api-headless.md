# Headless API Documentation

## Overview

The Headless API provides a programmatic interface to integrate pkg-scaffold into custom workflows, CI/CD pipelines, and third-party tools. It offers full control over analysis and refactoring operations with an event-driven architecture for real-time feedback.

## Installation

```bash
npm install pkg-scaffold
```

## Quick Start

```javascript
import { HeadlessAPI } from 'pkg-scaffold/src/api/HeadlessAPI.js';

const api = new HeadlessAPI();

// Initialize with your project
await api.initialize('/path/to/project', {
  autoFix: true,
  verbose: true
});

// Run analysis
const results = await api.analyze();
console.log(results);

// Apply refactoring
const refactoringResults = await api.applyRefactoring({
  deleteDeadFiles: true,
  removeUnusedExports: true,
  removeUnusedDependencies: true
});
```

## API Reference

### Constructor

```javascript
const api = new HeadlessAPI(options);
```

**Parameters:**
- `options` (Object, optional): Initial configuration options

### Methods

#### `initialize(projectRoot, config)`

Initialize the API with a project context.

**Parameters:**
- `projectRoot` (string): Root directory of the project
- `config` (Object, optional): Configuration options
  - `autoFix` (boolean): Enable automatic fixing (default: true)
  - `skipConfirm` (boolean): Skip confirmation prompts (default: false)
  - `verbose` (boolean): Enable verbose logging (default: false)
  - `tsconfigPath` (string): Path to tsconfig.json
  - `workspaceEnabled` (boolean): Enable monorepo support (default: false)

**Returns:** `Promise<void>`

**Example:**
```javascript
await api.initialize('/path/to/project', {
  autoFix: true,
  verbose: true,
  workspaceEnabled: true
});
```

#### `analyze()`

Analyze the codebase without making changes.

**Returns:** `Promise<Object>` - Analysis results containing:
- `structuralIssuesDetected` (Object)
  - `deadFiles` (Array): Unused files
  - `deadExports` (Array): Unused exports
  - `unusedDependencies` (Array): Unused dependencies
- `metrics` (Object): Analysis metrics

**Example:**
```javascript
const results = await api.analyze();
console.log(`Found ${results.structuralIssuesDetected.deadFiles.length} dead files`);
```

#### `getImpactAnalysis(filePath, symbol)`

Get detailed impact analysis for a specific file or export.

**Parameters:**
- `filePath` (string): Path to the file
- `symbol` (string, optional): Specific export symbol to analyze

**Returns:** `Promise<Object>` - Impact analysis containing:
- `file` (string): File path
- `symbol` (string): Export symbol
- `directDependents` (Array): Files that depend on this
- `dependencies` (Array): Files this depends on
- `internalExports` (Array): Exported symbols
- `externalPackages` (Array): External packages used
- `refactorSafety` (Object): Safety assessment for refactoring

**Example:**
```javascript
const impact = await api.getImpactAnalysis('src/utils.js', 'formatDate');
console.log(`This export is used by ${impact.directDependents.length} files`);
```

#### `applyRefactoring(changes)`

Apply refactoring changes with automatic rollback on test failure.

**Parameters:**
- `changes` (Object, optional):
  - `deleteDeadFiles` (boolean): Delete unused files (default: true)
  - `removeUnusedExports` (boolean): Remove unused exports (default: true)
  - `removeUnusedDependencies` (boolean): Remove unused dependencies (default: true)

**Returns:** `Promise<Object>` - Refactoring results containing:
- `filesDeleted` (Array): Deleted files
- `exportsRemoved` (Array): Removed exports
- `dependenciesRemoved` (Array): Removed dependencies
- `errors` (Array): Errors encountered

**Example:**
```javascript
const results = await api.applyRefactoring({
  deleteDeadFiles: true,
  removeUnusedExports: true
});

console.log(`Deleted ${results.filesDeleted.length} files`);
console.log(`Removed ${results.exportsRemoved.length} exports`);
if (results.errors.length > 0) {
  console.error('Errors:', results.errors);
}
```

#### `getMetrics()`

Get current analysis metrics.

**Returns:** Object containing:
- `totalFilesScanned` (number): Total files analyzed
- `cacheHits` (number): Cache hits during analysis
- `cacheMisses` (number): Cache misses during analysis

**Example:**
```javascript
const metrics = api.getMetrics();
console.log(`Scanned ${metrics.totalFilesScanned} files`);
console.log(`Cache hit rate: ${(metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100).toFixed(2)}%`);
```

#### `getPlugins()`

Get all registered plugins.

**Returns:** Array of plugin instances

**Example:**
```javascript
const plugins = api.getPlugins();
plugins.forEach(p => console.log(`Plugin: ${p.name}`));
```

#### `getAnalysisResults()`

Get analysis results from the last analysis run.

**Returns:** Object - Analysis results (same as returned by `analyze()`)

#### `isProcessing()`

Check if API is currently running.

**Returns:** boolean

**Example:**
```javascript
if (api.isProcessing()) {
  console.log('Analysis in progress...');
}
```

## Events

The API emits events throughout its lifecycle. Use the `on()` method to listen:

```javascript
api.on('analysis:start', () => console.log('Analysis started'));
api.on('analysis:complete', (results) => console.log('Analysis complete', results));
```

### Available Events

#### Analysis Events
- `initialize:start` - Initialization started
- `initialize:complete` - Initialization completed
- `initialize:error` - Initialization failed
- `analysis:start` - Analysis started
- `analysis:file-discovery-start` - File discovery started
- `analysis:file-discovery-complete` - File discovery completed
- `analysis:framework-detection-start` - Framework detection started
- `analysis:framework-detection-complete` - Framework detection completed
- `analysis:file-processing-start` - File processing started
- `analysis:file-processing-progress` - File processing progress
- `analysis:graph-linking-start` - Graph linking started
- `analysis:graph-linking-complete` - Graph linking completed
- `analysis:complete` - Analysis completed
- `analysis:error` - Analysis failed

#### Refactoring Events
- `refactoring:start` - Refactoring started
- `refactoring:file-deleted` - File deleted
- `refactoring:export-removed` - Export removed
- `refactoring:dependency-removed` - Dependency removed
- `refactoring:error` - Refactoring error
- `refactoring:complete` - Refactoring completed

#### Error Events
- `impact-analysis:error` - Impact analysis failed

## Complete Example

```javascript
import { HeadlessAPI } from 'pkg-scaffold/src/api/HeadlessAPI.js';

async function optimizeProject() {
  const api = new HeadlessAPI();

  // Set up event listeners
  api.on('analysis:file-processing-progress', (progress) => {
    console.log(`Processing: ${progress.percentage}%`);
  });

  api.on('refactoring:file-deleted', (data) => {
    console.log(`✓ Deleted: ${data.file}`);
  });

  api.on('refactoring:export-removed', (data) => {
    console.log(`✓ Removed export: ${data.symbol} from ${data.file}`);
  });

  api.on('refactoring:error', (data) => {
    console.error(`✗ Error: ${data.error.message}`);
  });

  try {
    // Initialize
    await api.initialize('/path/to/project', {
      autoFix: true,
      verbose: true
    });

    // Analyze
    const results = await api.analyze();
    console.log('\n=== Analysis Results ===');
    console.log(`Dead files: ${results.structuralIssuesDetected.deadFiles.length}`);
    console.log(`Dead exports: ${results.structuralIssuesDetected.deadExports.length}`);
    console.log(`Unused dependencies: ${results.structuralIssuesDetected.unusedDependencies.length}`);

    // Get impact analysis for a specific file
    if (results.structuralIssuesDetected.deadFiles.length > 0) {
      const firstDeadFile = results.structuralIssuesDetected.deadFiles[0];
      const impact = await api.getImpactAnalysis(firstDeadFile);
      console.log(`\nImpact of ${firstDeadFile}:`);
      console.log(`- Direct dependents: ${impact.directDependents.length}`);
    }

    // Apply refactoring
    console.log('\n=== Applying Refactoring ===');
    const refactoringResults = await api.applyRefactoring({
      deleteDeadFiles: true,
      removeUnusedExports: true,
      removeUnusedDependencies: true
    });

    console.log('\n=== Refactoring Results ===');
    console.log(`Files deleted: ${refactoringResults.filesDeleted.length}`);
    console.log(`Exports removed: ${refactoringResults.exportsRemoved.length}`);
    console.log(`Dependencies removed: ${refactoringResults.dependenciesRemoved.length}`);

    if (refactoringResults.errors.length > 0) {
      console.log('\nErrors encountered:');
      refactoringResults.errors.forEach(err => {
        console.error(`- ${err.type}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

optimizeProject();
```

## Error Handling

The API throws errors for common issues:

```javascript
try {
  await api.initialize('/invalid/path');
} catch (error) {
  console.error('Initialization failed:', error.message);
}

try {
  const results = await api.applyRefactoring();
} catch (error) {
  if (error.message.includes('not initialized')) {
    console.error('API not initialized. Call initialize() first.');
  }
}
```

## Performance Considerations

- **Large Codebases**: The API uses worker pools for parallel processing of files > 10 files
- **Caching**: Results are cached to speed up subsequent runs
- **Memory**: For very large projects, consider analyzing in chunks or using the streaming API

## Troubleshooting

### "API not initialized" Error
```javascript
// Make sure to call initialize() before other methods
await api.initialize(projectRoot);
```

### "No analysis results available" Error
```javascript
// Call analyze() before applyRefactoring()
await api.analyze();
await api.applyRefactoring();
```

### Events Not Firing
```javascript
// Register event listeners before calling methods
api.on('analysis:complete', (results) => {
  console.log('Done!', results);
});
await api.analyze();
```

## Migration from CLI

If you're migrating from the CLI to the Headless API:

```javascript
// CLI equivalent: npx pkg-scaffold --fix --yes
const api = new HeadlessAPI();
await api.initialize(process.cwd(), {
  autoFix: true,
  skipConfirm: true
});
await api.analyze();
await api.applyRefactoring();
```
