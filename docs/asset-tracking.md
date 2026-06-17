# Asset Tracking

## Overview

Asset Tracking in entkapp v4.2.0 allows you to manage static assets like images, videos, and fonts with the same precision as your source code. The engine analyzes how assets are referenced and identifies orphans that are no longer used.

## Features

- **Import Analysis**: Tracks assets imported via `import` or `require`.
- **String Reference Detection**: Finds asset paths referenced in string literals.
- **Public Folder Mapping**: Maps assets in the `public/` directory and tracks their usage.
- **Orphan Detection**: Identifies assets that are not referenced anywhere in the codebase.
- **Automated Cleanup**: Safely removes unused assets to reduce bundle size and repository bloat.

## Supported Extensions

By default, the following extensions are tracked:

- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.ico`
- **Video**: `.mp4`, `.webm`, `.ogg`
- **Audio**: `.mp3`, `.wav`, `.flac`
- **Fonts**: `.woff`, `.woff2`, `.ttf`, `.eot`, `.otf`
- **Data**: `.json`, `.csv`, `.xml`

## Configuration

Configure asset tracking in `entkapp/config.json`:

```json
{
  "assets": {
    "enabled": true,
    "directories": ["src/assets", "public"],
    "extensions": [".png", ".jpg", ".svg", ".webp"],
    "cleanup": false
  }
}
```

## Programmatic Usage

Create a custom asset tracker using the Plugin SDK:

```javascript
import { PluginSDK } from 'entkapp/src/api/PluginSDK.js';

const MyAssetTracker = PluginSDK.createAssetTrackingPlugin({
  name: 'custom-asset-tracker',
  extensions: ['.pdf', '.zip']
});
```

## How it Works

1. **Discovery**: The engine scans specified directories for files matching the asset extensions.
2. **Analysis**: It then scans the entire codebase (JS, TS, HTML, CSS) for references to these files.
3. **Mapping**: A map of `Asset -> [Referencing Files]` is created.
4. **Validation**: Assets with an empty reference list are marked as "Orphaned".

## Example

```javascript
// src/components/Logo.js
import logo from '../assets/logo.png'; // Explicit reference

export const Logo = () => <img src={logo} alt="Logo" />;

// src/styles/main.css
.header {
  background-image: url('../assets/header-bg.jpg'); /* String reference */
}
```

In this case, `logo.png` and `header-bg.jpg` are marked as used. If there is a `src/assets/old-banner.png` that is not mentioned in any file, it will be flagged as unused.

## Handling Dynamic Paths

If you reference assets dynamically, for example:

```javascript
const icon = `/icons/${name}.svg`;
```

The static analyzer might not be able to resolve the specific asset. You can handle this by:

1. **Pattern Matching**: Configure the engine to recognize specific path patterns.
2. **Manual Whitelisting**: Add assets to the `ignore` list in your configuration.

## Best Practices

1. **Use Imports**: Prefer `import` for assets over string paths, as it provides stronger guarantees for analysis.
2. **Organized Structure**: Keep assets in dedicated directories to make discovery more efficient.
3. **Meaningful Names**: Use descriptive filenames to avoid collisions and make tracking easier.

## Troubleshooting

### Assets in `public/` not detected
Ensure the `public` directory is included in the `directories` configuration and that your framework's public path mapping is correctly configured.

### Large Assets slowing down analysis
Asset tracking only analyzes the *references* to assets, not the content of the assets themselves. However, scanning very large directories can still take time. Use `ignore` patterns for directories that don't need tracking.
