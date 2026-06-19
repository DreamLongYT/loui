import fs from 'fs';
import path from 'path';

export class EntryPointDetector {
    constructor(targetDir, packageJson, stats) {
        this.targetDir = targetDir;
        this.packageJson = packageJson || {};
        this.stats = stats;
    }

    /**
     * Ermittelt alle potenziellen Entry-Points eines Projekts.
     * @returns {Set<string>} Set von absoluten Pfaden.
     */
    detect() {
        const entries = new Set();

        // 1. package.json Standards
        this._addFromPackageJson(entries);

        // 2. Framework-spezifische Pfade
        this._addFromFrameworks(entries);

        // 3. Fallbacks / Konventionen
        this._addFromConventions(entries);

        return entries;
    }

    _addFromPackageJson(entries) {
        const fields = ['main', 'module', 'browser', 'bin'];
        fields.forEach(field => {
            const val = this.packageJson[field];
            if (typeof val === 'string') {
                this._addIfExist(entries, val);
            } else if (typeof val === 'object' && val !== null) {
                Object.values(val).forEach(v => {
                    if (typeof v === 'string') this._addIfExist(entries, v);
                });
            }
        });

        // Exports field (modern Node.js)
        if (this.packageJson.exports) {
            this._parseExports(this.packageJson.exports, entries);
        }
    }

    _parseExports(exports, entries) {
        if (typeof exports === 'string') {
            this._addIfExist(entries, exports);
        } else if (typeof exports === 'object' && exports !== null) {
            for (const key in exports) {
                const val = exports[key];
                if (typeof val === 'string') {
                    this._addIfExist(entries, val);
                } else if (typeof val === 'object') {
                    this._parseExports(val, entries);
                }
            }
        }
    }

    _addFromFrameworks(entries) {
        if (!this.stats || !this.stats.detectedFrameworks) return;

        const frameworks = this.stats.detectedFrameworks;

        if (frameworks.includes('next')) {
            this._scanDir(path.join(this.targetDir, 'pages'), entries);
            this._scanDir(path.join(this.targetDir, 'app'), entries, ['page.tsx', 'page.js', 'route.ts', 'route.js']);
        }

        if (frameworks.includes('nuxt')) {
            this._scanDir(path.join(this.targetDir, 'pages'), entries);
        }

        if (frameworks.includes('svelte')) {
            this._scanDir(path.join(this.targetDir, 'src/routes'), entries);
        }
    }

    _addFromConventions(entries) {
        const fallbacks = [
            'index.js', 'index.ts', 'index.jsx', 'index.tsx',
            'src/index.js', 'src/index.ts', 'src/index.jsx', 'src/index.tsx',
            'main.js', 'main.ts', 'src/main.js', 'src/main.ts',
            'app.js', 'app.ts', 'src/app.js', 'src/app.ts',
            'server.js', 'server.ts', 'src/server.js', 'src/server.ts'
        ];
        fallbacks.forEach(f => this._addIfExist(entries, f));

        // If no entries found yet, and we are in a simple src structure, 
        // protect common top-level files in src/
        if (entries.size === 0) {
            const commonSrcFiles = ['src/app.ts', 'src/main.ts', 'src/index.ts', 'src/app.js', 'src/main.js', 'src/index.js'];
            commonSrcFiles.forEach(f => this._addIfExist(entries, f));
        }
    }

    _addIfExist(entries, relativePath) {
        // Bereinige Pfad (entferne ./ etc)
        const cleanPath = relativePath.replace(/^(\.\/|\/)/, '');
        const absolutePath = path.resolve(this.targetDir, cleanPath);
        
        // Prüfe verschiedene Erweiterungen falls keine angegeben
        const extensions = ['', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
        for (const ext of extensions) {
            const p = absolutePath + ext;
            if (fs.existsSync(p) && fs.statSync(p).isFile()) {
                entries.add(p);
                return;
            }
        }
    }

    _scanDir(dir, entries, specificFiles = null) {
        if (!fs.existsSync(dir)) return;
        
        const files = fs.readdirSync(dir, { recursive: true });
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isFile()) {
                if (specificFiles) {
                    if (specificFiles.includes(path.basename(file))) {
                        entries.add(fullPath);
                    }
                } else if (/\.(js|ts|jsx|tsx|vue|svelte)$/.test(file)) {
                    entries.add(fullPath);
                }
            }
        });
    }
}
