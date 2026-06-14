import { loadAdditionalPlugins } from "./ecosystems/PluginLoader.js";
import path from 'path';
import fs from 'fs/promises';
import { pathToFileURL } from 'url';
import { KnipAdapter } from './KnipAdapter.js';

/**
 * Advanced Plugin Registry supporting Builtin, Custom, and Knip-style plugins.
 * Version 4.0.0: Enhanced with Modern Frameworks, Backend Services, and Standalone Knip Integration.
 */
export class PluginRegistry {
    constructor(context) {
        this.context = context;
        this.plugins = new Map();
        this.config = null;
        this.knipAdapter = new KnipAdapter(context);
    }

    async init(projectRoot) {
        const configPath = path.join(projectRoot, 'pkg-scaffold', 'config.json');
        try {
            const configRaw = await fs.readFile(configPath, 'utf8');
            this.config = JSON.parse(configRaw);
        } catch (e) {
            this.config = {
                useBuiltinPlugins: true,
                useCustomPlugins: true,
                supportKnipPlugins: true
            };
        }

        if (this.config.useBuiltinPlugins) {
            await this.loadBuiltinPlugins();
        }

        if (this.config.useCustomPlugins) {
            await this.loadCustomPlugins(projectRoot);
        }

        if (this.config.supportKnipPlugins) {
            await this.initKnipAdapter(projectRoot);
        }
    }

    async loadBuiltinPlugins() {
        // Core Ecosystems
        const { NextJsPlugin } = await import('./ecosystems/NextJsPlugin.js');
        const { NuxtPlugin, RemixPlugin, SvelteKitPlugin, AstroPlugin } = await import('./ecosystems/GenericPlugins.js');
        const { TypeScriptPlugin } = await import('./ecosystems/TypeScriptPlugin.js');
        
        // Modern Frameworks (New in v4.0)
        const { ReactPlugin, VuePlugin, SveltePlugin, AngularPlugin } = await import('./ecosystems/ModernFrameworks.js');
        
        // Backend Services (New in v4.0)
        const { GraphQLPlugin, DatabasePlugin } = await import('./ecosystems/BackendServices.js');

        // Extended tooling plugins (New in v4.1)
        const {
            TailwindPlugin, PostcssPlugin, JestPlugin, VitestPlugin,
            PlaywrightPlugin, CypressPlugin, StorybookPlugin,
            EslintPlugin, PrettierPlugin, HuskyPlugin, LintStagedPlugin,
            CommitlintPlugin, BabelPlugin, RollupPlugin, WebpackPlugin,
            GithubActionsPlugin
        } = await import('./ecosystems/MorePlugins.js');

        const builtins = [
            new NextJsPlugin(this.context),
            new NuxtPlugin(this.context),
            new RemixPlugin(this.context),
            new SvelteKitPlugin(this.context),
            new AstroPlugin(this.context),
            new TypeScriptPlugin(this.context),
            new ReactPlugin(this.context),
            new VuePlugin(this.context),
            new SveltePlugin(this.context),
            new AngularPlugin(this.context),
            new GraphQLPlugin(this.context),
            new DatabasePlugin(this.context),
            // Extended tooling plugins
            new TailwindPlugin(this.context),
            new PostcssPlugin(this.context),
            new JestPlugin(this.context),
            new VitestPlugin(this.context),
            new PlaywrightPlugin(this.context),
            new CypressPlugin(this.context),
            new StorybookPlugin(this.context),
            new EslintPlugin(this.context),
            new PrettierPlugin(this.context),
            new HuskyPlugin(this.context),
            new LintStagedPlugin(this.context),
            new CommitlintPlugin(this.context),
            new BabelPlugin(this.context),
            new RollupPlugin(this.context),
            new WebpackPlugin(this.context),
            new GithubActionsPlugin(this.context)
        ];

        builtins.forEach(p => {
            if (!this.config.enabledPlugins || this.config.enabledPlugins.includes(p.name)) {
                this.register(p);
            }
        });
    }

    async loadCustomPlugins(projectRoot) {
        const pluginsDir = path.join(projectRoot, 'pkg-scaffold', 'plugins');
        try {
            const files = await fs.readdir(pluginsDir);
            for (const file of files) {
                if (file.endsWith('.js') || file.endsWith('.mjs')) {
                    const pluginModule = await import(pathToFileURL(path.join(pluginsDir, file)).href);
                    const PluginClass = pluginModule.default || pluginModule;
                    const pluginInstance = new PluginClass(this.context);

                    const version = pluginInstance.get('version');
                    if (version && this.context.verbose) {
                        console.log(`[PluginRegistry] Loaded ${pluginInstance.name} v${version}`);
                    }
                    this.register(pluginInstance);
                }
            }
        } catch (e) {
            // No custom plugins or dir missing
        }
    }

    async initKnipAdapter(projectRoot) {
        this.context.knipCompatible = true;
        await this.knipAdapter.discoverPlugins(projectRoot);
        const knipPlugins = this.knipAdapter.getPlugins();
        knipPlugins.forEach(p => this.register(p));
    }

    register(plugin) {
        this.plugins.set(plugin.name, plugin);
    }

    getPlugins() {
        return Array.from(this.plugins.values());
    }

    getPlugin(name) {
        return this.plugins.get(name);
    }

    async getActivePlugins(baseDir) {
        const active = [];
        for (const plugin of this.plugins.values()) {
            if (await plugin.isActive(baseDir)) {
                active.push(plugin);
            }
        }
        return active;
    }
}
