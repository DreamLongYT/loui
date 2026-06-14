import fs from 'fs/promises';
import path from 'path';

/**
 * Base class for all pkg-scaffold plugins.
 * Defines the contract for ecosystem detection and entry point mapping.
 * Version 3.2.0: Added support for dynamic custom getters.
 */
export class BasePlugin {
    constructor(context) {
        this.context = context;
        this.customGetters = new Map();
    }

    /**
     * Unique identifier for the plugin (e.g., 'nextjs').
     */
    get name() {
        throw new Error('Plugin must implement name getter');
    }

    /**
     * Returns a list of configuration files that indicate this ecosystem is active.
     */
    getConfigFiles() {
        return [];
    }

    /**
     * Returns regex patterns for files that should be treated as entry points.
     */
    getRoutePatterns() {
        return [];
    }

    /**
     * Returns symbols that are implicitly required/exported by the framework.
     */
    getRequiredSystemContracts() {
        return ['default'];
    }

    /**
     * Version 3.2.0: Dynamic getter for custom plugin properties.
     * @param {string} key - The property key to retrieve
     * @returns {any} The value of the custom property
     */
    get(key) {
        const methodName = `get${key.charAt(0).toUpperCase() + key.slice(1)}`;
        if (typeof this[methodName] === 'function') {
            return this[methodName]();
        }
        return this.customGetters.get(key);
    }

    /**
     * Optional: Logic to detect if the plugin should be active in the given directory.
     */
    async isActive(baseDir) {
        const configFiles = this.getConfigFiles();
        for (const file of configFiles) {
            try {
                await fs.access(path.join(baseDir, file));
                return true;
            } catch {
                continue;
            }
        }
        return false;
    }
}
