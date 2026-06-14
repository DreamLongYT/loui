import path from 'path';
import fs from 'fs/promises';
import { BasePlugin } from '../BasePlugin.js';

/**
 * TypeScript Plugin for pkg-scaffold.
 * Handles tsconfig.json detection and TypeScript-specific entry points.
 */
export class TypeScriptPlugin extends BasePlugin {
    get name() {
        return 'typescript';
    }

    getConfigFiles() {
        return ['tsconfig.json', 'tsconfig.base.json', 'tsconfig.eslint.json'];
    }

    getRoutePatterns() {
        // Common TypeScript entry points and declaration files
        return [
            /src\/index\.ts$/,
            /src\/main\.ts$/,
            /src\/lib\.ts$/,
            /.*\.d\.ts$/
        ];
    }

    getRequiredSystemContracts() {
        // TypeScript specific implicit exports or requirements
        return ['default'];
    }

    /**
     * Custom Getter for v3.2.0: Get the compiler version from the project.
     */
    async getCompilerVersion() {
        try {
            const packageJsonPath = path.join(this.context.cwd, 'package.json');
            const content = await fs.readFile(packageJsonPath, 'utf8');
            const pkg = JSON.parse(content);
            return pkg.devDependencies?.typescript || pkg.dependencies?.typescript || 'unknown';
        } catch {
            return 'not installed';
        }
    }

    async isActive(baseDir) {
        for (const file of this.getConfigFiles()) {
            try {
                await fs.access(path.join(baseDir, file));
                return true;
            } catch {}
        }
        return false;
    }
}
