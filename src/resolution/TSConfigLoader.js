import fs from 'fs';
import path from 'path';
import ts from 'typescript';

export class TSConfigLoader {
    constructor(targetDir) {
        this.targetDir = targetDir;
    }

    /**
     * Lädt und parst die tsconfig.json.
     * Unterstützt JSONC (Kommentare), extends, und project references.
     * @param {string} [filename='tsconfig.json'] - Name der tsconfig-Datei
     * @returns {Object|null} Parsed config oder null.
     */
    load(filename = 'tsconfig.json') {
        const configPath = path.join(this.targetDir, filename);
        if (!fs.existsSync(configPath)) return null;

        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const readResult = ts.readConfigFile(configPath, ts.sys.readFile);
            
            if (readResult.error) {
                return null;
            }

            const parsed = ts.parseJsonConfigFileContent(
                readResult.config,
                ts.sys,
                this.targetDir
            );

            // Attach raw config for reference inspection
            parsed._rawConfig = readResult.config;

            return parsed;
        } catch (e) {
            return null;
        }
    }

    /**
     * Extracts project references from tsconfig (composite monorepo support).
     * @returns {string[]} Array of referenced tsconfig paths
     */
    getProjectReferences(filename = 'tsconfig.json') {
        const configPath = path.join(this.targetDir, filename);
        if (!fs.existsSync(configPath)) return [];

        try {
            const content = fs.readFileSync(configPath, 'utf8');
            // Strip comments
            const stripped = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
            const raw = JSON.parse(stripped);
            const refs = raw.references || [];
            return refs.map(ref => {
                const refPath = path.resolve(this.targetDir, ref.path);
                // If it's a directory, look for tsconfig.json inside
                if (fs.existsSync(refPath) && fs.statSync(refPath).isDirectory()) {
                    return path.join(refPath, 'tsconfig.json');
                }
                return refPath;
            });
        } catch (e) {
            return [];
        }
    }

    /**
     * Extracts the "extends" chain from tsconfig.
     * @returns {string[]} Array of extended tsconfig paths
     */
    getExtendsChain(filename = 'tsconfig.json') {
        const configPath = path.join(this.targetDir, filename);
        if (!fs.existsSync(configPath)) return [];

        const chain = [];
        let currentPath = configPath;

        for (let i = 0; i < 10; i++) { // limit depth to avoid infinite loops
            try {
                const content = fs.readFileSync(currentPath, 'utf8');
                const stripped = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
                const raw = JSON.parse(stripped);
                if (!raw.extends) break;
                const extendedPath = path.resolve(path.dirname(currentPath), raw.extends);
                const resolvedPath = extendedPath.endsWith('.json') ? extendedPath : extendedPath + '.json';
                if (!fs.existsSync(resolvedPath)) break;
                chain.push(resolvedPath);
                currentPath = resolvedPath;
            } catch (e) {
                break;
            }
        }

        return chain;
    }

    /**
     * Erstellt eine Mapping-Funktion für Aliases aus der tsconfig.
     * Berücksichtigt baseUrl, paths und project references.
     * @param {Object} parsedConfig 
     * @returns {Function} Mapper function.
     */
    getAliasMapper(parsedConfig) {
        if (!parsedConfig || !parsedConfig.options) {
            return (source) => source;
        }

        const { paths, baseUrl } = parsedConfig.options;
        const base = baseUrl ? path.resolve(this.targetDir, baseUrl) : this.targetDir;

        return (source) => {
            // If no paths configured, still try baseUrl resolution
            if (!paths) {
                if (baseUrl && !source.startsWith('.') && !source.startsWith('/') && !source.startsWith('@')) {
                    const candidate = path.resolve(base, source);
                    const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
                    for (const ext of extensions) {
                        if (fs.existsSync(candidate + ext)) return candidate + ext;
                    }
                }
                return source;
            }

            for (const pattern in paths) {
                const regexPattern = pattern.replace(/\*/g, '(.*)');
                const regex = new RegExp(`^${regexPattern}$`);
                const match = source.match(regex);

                if (match) {
                    const replacements = paths[pattern];
                    for (const replacement of replacements) {
                        const resolvedReplacement = replacement.replace(/\*/g, match[1] || '');
                        const fullPath = path.resolve(base, resolvedReplacement);
                        
                        // Check with common extensions
                        const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
                        for (const ext of extensions) {
                            if (fs.existsSync(fullPath + ext)) {
                                return fullPath + ext;
                            }
                        }
                    }
                }
            }
            return source;
        };
    }

    /**
     * Returns all include/exclude glob patterns from tsconfig.
     */
    getIncludeExcludePatterns(parsedConfig) {
        if (!parsedConfig || !parsedConfig._rawConfig) return { include: [], exclude: [] };
        return {
            include: parsedConfig._rawConfig.include || [],
            exclude: parsedConfig._rawConfig.exclude || []
        };
    }
}
