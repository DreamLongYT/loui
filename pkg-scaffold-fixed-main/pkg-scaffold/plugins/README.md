# pkg-scaffold Plugins

This directory is for your custom plugins. pkg-scaffold will automatically load any `.js` or `.mjs` files placed here if `useCustomPlugins` is set to `true` in your `config.json`.

## Supported Ecosystems (Built-in)

- **Next.js**: Handles pages, API routes, and App Router conventions.
- **Nuxt**: Supports auto-imports and server routes.
- **Remix**: Maps loaders, actions, and root exports.
- **SvelteKit**: Tracks `+page`, `+layout`, and server-side scripts.
- **Astro**: Analyzes `.astro` files and static paths.

## Knip Compatibility

pkg-scaffold supports Knip-style plugins. You can drop Knip plugins into this folder, and the engine will attempt to wrap them for use within the pkg-scaffold ecosystem.

## Documentation

For a detailed guide on how to build your own plugins, please refer to the [Plugin Development Guide](../../docs/guide.md#plugin-development).
