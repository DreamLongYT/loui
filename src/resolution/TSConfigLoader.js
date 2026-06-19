import fs from 'fs';
import path from 'path';
import ts from 'typescript';

export class TSConfigLoader {
    constructor(targetDir) {
        this.targetDir = targetDir;
    }

    /**
     * Lädt und parst die tsconfig.json.
     * @returns {Object|null} Parsed config oder null.
     */
    load() {
        const configPath = path.join(this.targetDir, 'tsconfig.json');
        if (!fs.existsSync(configPath)) return null;

        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const result = ts.parseConfigFileTextWithComments(configPath, content);
            
            if (result.error) {
                return null;
            }

            const parsed = ts.parseJsonConfigFileContent(
                result.config,
                ts.sys,
                this.targetDir
            );

            return parsed;
        } catch (e) {
            return null;
        }
    }

    /**
     * Erstellt eine Mapping-Funktion für Aliases aus der tsconfig.
     * @param {Object} parsedConfig 
     * @returns {Function} Mapper function.
     */
    getAliasMapper(parsedConfig) {
        if (!parsedConfig || !parsedConfig.options || !parsedConfig.options.paths) {
            return (source) => source;
        }

        const { paths, baseUrl } = parsedConfig.options;
        const base = baseUrl ? path.resolve(this.targetDir, baseUrl) : this.targetDir;

        return (source) => {
            for (const pattern in paths) {
                const regexPattern = pattern.replace(/\*/, '(.*)');
                const regex = new RegExp(`^${regexPattern}$`);
                const match = source.match(regex);

                if (match) {
                    const replacements = paths[pattern];
                    for (const replacement of replacements) {
                        const resolvedReplacement = replacement.replace(/\*/, match[1]);
                        const fullPath = path.resolve(base, resolvedReplacement);
                        
                        // Prüfe ob Datei existiert
                        const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
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
}
