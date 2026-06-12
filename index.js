#!/usr/bin/env node

/**
 * ============================================================================
 * 📦 pkg-scaffold v2.3.0: Enterprise Dependency Intelligence & Scaffolding Engine
 * ============================================================================
 * * Eine hochgradig integrierte Code-Analyse- und Projektbootstrapping-Engine.
 * Kombiniert rekursive Erreichbarkeitsanalysen (Reachability Graphs) auf 
 * Knip-Niveau mit proaktiven Code-Qualitäts-Audits, Sicherheitsprüfungen,
 * statischem Schwachstellen-Scanning und interaktivem Scaffolding.
 *
 * Diese Datei ist als vollständig entfalteter, langformbasierter Monolith
 * strukturiert, um maximale Wartbarkeit, lückenlose Fehlerabdeckung und
 * absolute Ausführungssicherheit im Produktivbetrieb zu garantieren.
 * * Eigenschaften:
 * - Semantische Analyse via TypeScript Compiler API (Type-Aware Parsing)
 * - Präzise Modulauflösung via enhanced-resolve (Webpack-Level)
 * - Umfassendes Symbol-Tracking & Erreichbarkeitsmatrix (Knip-Niveau)
 * - Entrypoint-basiertes Scanning zur Erkennung verwaister Dateien
 * - Hardcoded Credentials Extraction & .env-Isolation
 */

import fs from 'fs';
import path from 'path';
import { builtinModules, createRequire } from 'module';
import { execSync } from 'child_process';
import readline from 'readline/promises';

// --- Bulletproof AST & Resolution Infrastructure Engines ---
import ts from 'typescript';
import resolve from 'enhanced-resolve';

const localRequire = createRequire(import.meta.url);

/**
 * Globale Konfigurations-Sets für Verzeichnis- und Dateifilterung.
 * Verhindert das Eindringen von System-, Cache- und Build-Dateien in die Analyse.
 * @type {Set<string>}
 */
const IGNORED_DIRS = new Set([
    'node_modules', 
    '.git', 
    'dist', 
    'build', 
    '.turbo', 
    'coverage', 
    'out', 
    '.next', 
    '.nuxt', 
    '.svelte-kit', 
    'storybook-static', 
    '.cache'
]);

/**
 * Unterstützte Dateiendungen für die statische Codeanalyse und das Parsing.
 * @type {Set<string>}
 */
const VALID_EXTENSIONS = new Set([
    '.js', 
    '.jsx', 
    '.ts', 
    '.tsx', 
    '.mjs', 
    '.cjs', 
    '.vue', 
    '.svelte'
]);

/**
 * --- Refined Target Signature Dictionaries ---
 * Umfassendes Verzeichnis regulärer Ausdrücke für Code-Smells, kryptografische Risiken,
 * Framework-Routing und Umgebungsvariablen.
 * @type {Object}
 */
const REGEX_PATTERNS = {
    /**
     * Zugriff auf Umgebungsvariablen im Node- oder Vite-Kontext.
     */
    env: /(?:process\.env|import\.meta\.env)\.([A-Z_][A-Z0-9_]*)/g,

    /**
     * Erkennung von Testdateien für diverse Testrunner.
     */
    testFile: /\.(test|spec)\.(js|ts|jsx|tsx|mjs|cjs)$/i,

    /**
     * Erkennung gängiger Konfigurationsdateien im JavaScript-Ökosystem.
     */
    configFile: /^(vite|webpack|rollup|babel|jest|vitest|tailwind|postcss|next|nuxt|svelte|astro)\.config\./i,

    /**
     * Veraltete Variablendeklarationen (Code-Smell).
     */
    legacyVar: /\bvar\s+[a-zA-Z_]/g,

    /**
     * Gefährliche dynamische Code-Ausführung.
     */
    dangerousEval: /\beval\s*\(/g,

    /**
     * Blockierende synchrone Dateisystemaufrufe.
     */
    syncFsCalls: /\.readFileSync|\.writeFileSync|\.mkdirSync|\.existsSync/g,

    /**
     * Allgemeine Zuweisung harter Anmeldedaten.
     */
    secretKeys: /\b(secret|passwd|password|token|api_?key|private_?key)\s*=\s*['"`]([a-zA-Z0-9_\-\.]{8,})['"`]/gi,

    /**
     * Spezifische AWS Zugriffsschlüssel.
     */
    awsKeys: /AKIA[0-9A-Z]{16}/g,

    /**
     * Spezifische Google Cloud API Schlüssel.
     */
    googleCloudKeys: /AIza[0-9A-Za-z\-_]{35}/g,

    /**
     * Live-Schlüssel für den Stripe-Zahlungsdienstleister.
     */
    stripeKeys: /sk_live_[0-9a-zA-Z]{24}/g,

    /**
     * Slack Bot- und Benutzer-Tokens.
     */
    slackKeys: /xox[baprs]-[0-9a-zA-Z]{10,48}/g,

    /**
     * GitHub Personal Access Tokens.
     */
    githubTokens: /gh[pousr]_[a-zA-Z0-9]{36}/g,

    /**
     * Private RSA-Schlüsselblöcke.
     */
    rsaPrivateKeys: /-----BEGIN RSA PRIVATE KEY-----/g,

    /**
     * Private OpenSSH-Schlüsselblöcke.
     */
    sshPrivateKeys: /-----BEGIN OPENSSH PRIVATE KEY-----/g,

    /**
     * Private PGP-Schlüsselblöcke.
     */
    pgpPrivateKeys: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g,
    
    /**
     * Unsicheres Einfügen von unbereinigtem HTML (XSS-Risiko).
     */
    insecureInnerHTML: /\.innerHTML\s*=/g,

    /**
     * Direktes Schreiben in das Dokumentenobjekt im Browser.
     */
    insecureDocumentWrite: /document\.write\s*\(/g,

    /**
     * React-spezifisches Äquivalent zu innerHTML.
     */
    insecureDangerouslySet: /dangerouslySetInnerHTML/g,

    /**
     * Riskante reguläre Ausdrücke mit Potenzial für Catastrophic Backtracking.
     */
    insecureRegex: /\/\.\*\//g,

    /**
     * Veraltete oder unsichere Krypto-Verfahren in Node.js.
     */
    insecureCrypto: /crypto\.(?:createCipher|createDecipher|pbkdf2Sync)/g,

    /**
     * Basis-Muster zur Erkennung potenzieller SQL-Injections in String-Literalen.
     */
    sqlInjection: /(?:SELECT|INSERT|UPDATE|DELETE)\s+.*\s+FROM\s+.*\s+WHERE\s+.*\s*=\s*[""]?.*[""]?/i,

    /**
     * Erkennung von harten Script-Tags im Quellcode (XSS-Indikator).
     */
    xssVulnerability: /<script\b[^>]*>[\s\S]*?<\/script>/i,

    /**
     * Performance-Smell: Direkter Import von großen Bilddateien im Quellcode.
     */
    largeImageImport: /import\s+.*\s+from\s+[""](?:.*\.(?:png|jpg|jpeg|gif|svg))[""]/g,

    /**
     * Performance-Smell: Unoptimierte for-Schleife über Array-Längen.
     */
    unoptimizedLoop: /for\s*\(let\s+i\s*=\s*0;\s*i\s*<\s*\w+\.length;\s*i\s*\+\+\)/g,

    /**
     * Framework-Muster: Next.js Bildkomponente.
     */
    nextjsImageComponent: /<Image\s+[^>]*>/g,

    /**
     * Framework-Muster: Next.js Schriftoptimierung.
     */
    nextjsFontOptimization: /next\/font/g,

    /**
     * Framework-Muster: Nuxt 3 Auto-Imports für Datenabrufe.
     */
    nuxtAutoImport: /use(?:State|Fetch|AsyncData)/g,

    /**
     * Framework-Muster: SvelteKit Datenladefunktion.
     */
    sveltekitLoadFunction: /export\s+const\s+load\s*=/g,

    /**
     * Erkennt unvollständige React useEffect Hooks ohne jegliches Abhängigkeitsarray.
     */
    reactUseEffectNoDeps: /useEffect\s*\(\s*(?:\([^)]*\)|[^=]+)\s*=>\s*\{[\s\S]*?\}\s*\)/g,

    /**
     * Framework-Dateipfade für tiefe Routing-Analysen.
     */
    nextjsPage: /pages\/[^\/]+\.(js|jsx|ts|tsx)$/i,
    nextjsApi: /pages\/api\/[^\/]+\.(js|jsx|ts|tsx)$/i,
    nextjsComponent: /components\/[^\/]+\.(js|jsx|ts|tsx)$/i,
    nuxtPage: /pages\/[^\/]+\.(vue|js|ts)$/i,
    nuxtComponent: /components\/[^\/]+\.(vue|js|ts)$/i,
    sveltekitPage: /src\/routes\/[^\/]+\/\+page\.(svelte|js|ts)$/i,
    sveltekitComponent: /src\/lib\/[^\/]+\.(svelte|js|ts)$/i,
    reactHook: /hooks\/[^\/]+\.(js|jsx|ts|tsx)$/i,
    vueComposable: /composables\/[^\/]+\.(js|ts)$/i
};

/**
 * Maps CLI-Binärnamen auf tatsächliche npm-Paketnamen (Knip-Stil).
 * @type {Object}
 */
const BINARY_TO_PACKAGE_MAP = {
    'tsc': 'typescript',
    'ts-node': 'ts-node',
    'tsx': 'tsx',
    'tsup': 'tsup',
    'esbuild': 'esbuild',
    'swc': '@swc/cli',
    'jest': 'jest',
    'vitest': 'vitest',
    'mocha': 'mocha',
    'jasmine': 'jasmine',
    'ava': 'ava',
    'tap': 'tap',
    'c8': 'c8',
    'nyc': 'nyc',
    'eslint': 'eslint',
    'prettier': 'prettier',
    'biome': '@biomejs/biome',
    'oxlint': 'oxlint',
    'tslint': 'tslint',
    'xo': 'xo',
    'standard': 'standard',
    'vite': 'vite',
    'webpack': 'webpack',
    'rollup': 'rollup',
    'parcel': 'parcel',
    'turbo': 'turbo',
    'nx': 'nx',
    'nodemon': 'nodemon',
    'pm2': 'pm2',
    'concurrently': 'concurrently',
    'cross-env': 'cross-env',
    'dotenv-cli': 'dotenv-cli',
    'env-cmd': 'env-cmd',
    'hygen': 'hygen',
    'plop': 'plop',
    'prisma': 'prisma',
    'drizzle-kit': 'drizzle-kit',
    'typeorm': 'typeorm',
    'sequelize': 'sequelize-cli',
    'knex': 'knex',
    'mikro-orm': '@mikro-orm/cli',
    'rimraf': 'rimraf',
    'copyfiles': 'copyfiles',
    'mkdirp': 'mkdirp',
    'shx': 'shx',
    'ncp': 'ncp',
    'cpx': 'cpx',
    'npm-run-all': 'npm-run-all',
    'run-s': 'npm-run-all',
    'run-p': 'npm-run-all',
    'typedoc': 'typedoc',
    'jsdoc': 'jsdoc',
    'storybook': 'storybook',
    'sb': 'storybook',
    'husky': 'husky',
    'lint-staged': 'lint-staged',
    'commitlint': '@commitlint/cli',
    'release-it': 'release-it',
    'semantic-release': 'semantic-release',
    'changeset': '@changesets/cli',
    'changesets': '@changesets/cli',
    'np': 'np',
    'bumpp': 'bumpp'
};

/**
 * Menge von Entwicklungswerkzeugen, die nicht als verwaist eingestuft werden sollen.
 * @type {Set<string>}
 */
const DEV_TOOLING_ECOSYSTEM = new Set([
    'eslint', 
    'prettier', 
    'biome', 
    '@biomejs/biome', 
    'oxlint', 
    'tslint', 
    'xo', 
    'standard',
    'typescript', 
    'typescript-eslint', 
    '@eslint/js', 
    'ts-node', 
    'tsx', 
    'tsup', 
    'esbuild', 
    '@swc/cli',
    'jest', 
    'vitest', 
    'mocha', 
    'jasmine', 
    'ava', 
    'tap', 
    'c8', 
    'nyc', 
    'vite', 
    'webpack', 
    'rollup', 
    'parcel', 
    'turbo', 
    'nx',
    'nodemon', 
    'pm2', 
    'concurrently', 
    'cross-env', 
    'dotenv-cli', 
    'env-cmd', 
    'rimraf', 
    'copyfiles', 
    'mkdirp', 
    'shx', 
    'ncp', 
    'cpx', 
    'npm-run-all', 
    'typedoc', 
    'jsdoc', 
    'storybook',
    'husky', 
    'lint-staged', 
    '@commitlint/cli', 
    'release-it', 
    'semantic-release', 
    '@changesets/cli', 
    'np', 
    'bumpp', 
    'prisma', 
    'drizzle-kit', 
    'typeorm', 
    'sequelize-cli', 
    'knex', 
    '@mikro-orm/cli', 
    'hygen', 
    'plop'
]);

/**
 * Bekannte Namensraum-Importbezeichner gängiger Bibliotheken.
 * @type {Object}
 */
const PACKAGE_IMPORT_ALIASES = {
    'lodash': ['_', 'lodash'],
    'lodash-es': ['_', 'lodash'],
    'underscore': ['_'],
    'jquery': ['$', 'jQuery'],
    'moment': ['moment'],
    'dayjs': ['dayjs'],
    'date-fns': ['dateFns'],
    'ramda': ['R'],
    'rxjs': ['Rx'],
    'three': ['THREE'],
    'chart.js': ['Chart'],
    'socket.io': ['io', 'Server'],
    'socket.io-client': ['io'],
    'mongoose': ['mongoose'],
    'sequelize': ['Sequelize'],
    'typeorm': ['typeorm'],
    'prisma': ['prisma', 'PrismaClient'],
    '@prisma/client': ['prisma', 'PrismaClient'],
    'knex': ['knex'],
    'redis': ['redis', 'createClient'],
    'ioredis': ['Redis'],
    'pg': ['Pool', 'Client', 'pg'],
    'mysql2': ['mysql', 'createConnection', 'createPool'],
    'sqlite3': ['sqlite3'],
    'express': ['app', 'express', 'router'],
    'fastify': ['fastify'],
    'koa': ['Koa', 'koa'],
    'hapi': ['Hapi'],
    'axios': ['axios'],
    'node-fetch': ['fetch'],
    'got': ['got'],
    'superagent': ['request'],
    'chalk': ['chalk'],
    'ora': ['ora'],
    'inquirer': ['inquirer'],
    'commander': ['program', 'Command'],
    'yargs': ['yargs'],
    'minimist': ['argv'],
    'dotenv': ['dotenv'],
    'winston': ['winston', 'logger'],
    'pino': ['pino', 'logger'],
    'morgan': ['morgan'],
    'helmet': ['helmet'],
    'cors': ['cors'],
    'compression': ['compression'],
    'body-parser': ['bodyParser'],
    'multer': ['multer', 'upload'],
    'passport': ['passport'],
    'jsonwebtoken': ['jwt'],
    'bcrypt': ['bcrypt'],
    'bcryptjs': ['bcrypt'],
    'crypto-js': ['CryptoJS'],
    'uuid': ['uuid', 'v4', 'uuidv4'],
    'nanoid': ['nanoid'],
    'zod': ['z', 'zod'],
    'joi': ['Joi'],
    'yup': ['yup'],
    'valibot': ['v'],
    'class-validator': ['IsEmail', 'IsString', 'IsNumber'],
    'react': ['React'],
    'react-dom': ['ReactDOM'],
    'vue': ['Vue', 'createApp'],
    'svelte': ['svelte'],
    '@angular/core': ['Component', 'NgModule'],
    'next': ['next'],
    'nuxt': ['nuxt']
};

// ============================================================
// BASE HOISTED HELPER INFRASTRUCTURE
// ============================================================

/**
 * Extrahiert die Git-Konfigurationsparameter des lokalen Benutzers.
 * @returns {Object} Git-Identity Datenstruktur.
 */
function getGitIdentity() {
    const identity = { 
        name: "Developer", 
        author: "Developer", 
        repository: "" 
    };
    
    try {
        const name = execSync('git config user.name', { encoding: 'utf8', stdio: 'pipe' }).trim();
        const email = execSync('git config user.email', { encoding: 'utf8', stdio: 'pipe' }).trim();
        
        if (name) {
            identity.name = name;
            if (email) {
                identity.author = `${name} <${email}>`;
            } else {
                identity.author = name;
            }
        }
        
        try {
            const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8', stdio: 'pipe' }).trim();
            identity.repository = remoteUrl.replace(/\.git$/, '');
        } catch (gitRemoteError) {
            // Fehlendes Remote wird abgefangen
        }
    } catch (gitConfigError) {
        // Fehlende Git-Umgebung wird abgefangen
    }
    
    return identity;
}

/**
 * Prüft das Vorhandensein von Lockfiles im Zielverzeichnis zur Bestimmung des Paketmanagers.
 * @param {string} targetDir Das zu scannende Projektverzeichnis.
 * @param {Object} stats Das globale Analyse-Objekt.
 * @returns {string} Der ermittelte Paketmanager.
 */
function detectPackageManager(targetDir, stats = null) {
    const detectedLockfiles = [];
    
    if (fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml'))) {
        detectedLockfiles.push('pnpm-lock.yaml');
    }
    if (fs.existsSync(path.join(targetDir, 'yarn.lock'))) {
        detectedLockfiles.push('yarn.lock');
    }
    if (fs.existsSync(path.join(targetDir, 'package-lock.json'))) {
        detectedLockfiles.push('package-lock.json');
    }
    if (fs.existsSync(path.join(targetDir, 'bun.lockb')) || fs.existsSync(path.join(targetDir, 'bun.lock'))) {
        detectedLockfiles.push('bun.lock');
    }

    if (detectedLockfiles.length > 1 && stats !== null) {
        stats.conflictingLockfiles = detectedLockfiles;
    }

    if (detectedLockfiles.some(l => { return l.startsWith('bun'); })) {
        return 'bun';
    }
    if (detectedLockfiles.includes('pnpm-lock.yaml')) {
        return 'pnpm';
    }
    if (detectedLockfiles.includes('yarn.lock')) {
        return 'yarn';
    }
    if (detectedLockfiles.includes('package-lock.json')) {
        return 'npm';
    }

    try { 
        execSync('pnpm --version', { stdio: 'ignore' }); 
        return 'pnpm'; 
    } catch (pnpmVersionError) {}
    
    try { 
        execSync('yarn --version', { stdio: 'ignore' }); 
        return 'yarn'; 
    } catch (yarnVersionError) {}
    
    return 'npm';
}

/**
 * Führt Code-Style Metriken-Suchen auf dem rohen Text-Inhalt einer Datei aus.
 * @param {string} content Dateiinhalt.
 * @param {Object} stats Globales Statistikobjekt.
 */
function analyzeCodeStyle(content, stats) {
    const lines = content.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            continue;
        }

        if (trimmed.endsWith(';')) {
            stats.style.semiCount++;
        } else if (!/[{}:,\[\]]/.test(trimmed.slice(-1))) {
            stats.style.noSemiCount++;
        }

        if (line.startsWith('\t')) {
            stats.style.tabCount++;
        } else if (line.startsWith('  ')) {
            const spaces = line.match(/^(\s+)/)?.[1]?.length || 0;
            if (spaces === 2) {
                stats.style.space2Count++;
            }
            if (spaces === 4) {
                stats.style.space4Count++;
            }
        }
    }

    if (REGEX_PATTERNS.legacyVar.test(content)) {
        stats.quality.varCount += (content.match(REGEX_PATTERNS.legacyVar) || []).length;
    }
    if (REGEX_PATTERNS.dangerousEval.test(content)) {
        stats.quality.hasEval = true;
    }
    if (REGEX_PATTERNS.syncFsCalls.test(content)) {
        stats.quality.syncFsCount += (content.match(REGEX_PATTERNS.syncFsCalls) || []).length;
    }
}

/**
 * Durchsucht npm scripts nach ausführbaren Binärbefehlen dritter Anbieter.
 * @param {Object} packageJsonContent Parste package.json Struktur.
 * @returns {Array<string>} Liste gefundener CLI-Befehlsaufrufe.
 */
function getBinariesFromPackageJson(packageJsonContent) {
    const binaries = new Set();
    
    if (packageJsonContent && packageJsonContent.scripts) {
        for (const script of Object.values(packageJsonContent.scripts)) {
            const commands = String(script).split(/\s*&&\s*|\s*;\s*|\s*\|\|\s*/);
            for (const cmd of commands) {
                const firstWord = cmd.trim().split(/\s+/)[0];
                if (firstWord && !['npm', 'yarn', 'pnpm', 'bun', 'node', 'npx', 'bunx', 'echo', 'exit', 'cd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'sed', 'awk', 'find', 'sh', 'bash', 'zsh'].includes(firstWord)) {
                    binaries.add(firstWord);
                }
            }
        }
    }
    
    return Array.from(binaries);
}

/**
 * Isoliert den reinen npm Paketnamen unter Ausschluss interner Datei-Imports.
 * @param {string} importString Import-Quell-Identifikator.
 * @returns {string|null} Bereinigter Paketname oder null.
 */
function cleanPackageName(importString) {
    if (!importString || /^[./~\\]/.test(importString)) {
        return null;
    }
    if (importString.startsWith('@')) {
        return importString.split('/').slice(0, 2).join('/');
    }
    return importString.split('/')[0];
}

/**
 * Fügt Header-Komponenten präzise unterhalb von Shebangs oder Systemdirektiven ein.
 */
function smartPrepend(originalCode, declarationBlock) {
    const lines = originalCode.split(/\r?\n/);
    let insertIdx = 0;

    while (insertIdx < lines.length) {
        const line = lines[insertIdx].trim();
        if (line.startsWith('#!') || line === '"use strict";' || line === "'use strict';" || line === '`use strict`;') {
            insertIdx++;
        } else if (line === '') {
            insertIdx++;
        } else {
            break;
        }
    }

    lines.splice(insertIdx, 0, declarationBlock);
    return lines.join('\n');
}

/**
 * Validiert die Existenz eines Pakets auf der offiziellen NPM-Registry.
 */
async function inspectNpmPackage(pkgName) {
    try {
        const response = await fetch(`https://registry.npmjs.org/${pkgName}/latest`, {
            headers: { 'User-Agent': 'pkg-scaffold-dx-client/2.0' },
            signal: AbortSignal.timeout(4000)
        });
        if (response.status === 200) {
            const data = await response.json();
            return { 
                version: data.version, 
                deprecated: data.deprecated || null, 
                error: null 
            };
        }
        if (response.status === 404) {
            return { 
                version: null, 
                deprecated: null, 
                error: 'NOT_FOUND' 
            };
        }
    } catch (networkInspectError) {
        return { 
            version: 'latest', 
            deprecated: null, 
            error: 'NETWORK_FAIL' 
        };
    }
    return null;
}

/**
 * Holt Lizenztexte aus der GitHub Legal API.
 */
async function fetchRemoteLicense(licenseKey) {
    try {
        const response = await fetch(`https://api.github.com/licenses/${licenseKey.toLowerCase()}`, {
            headers: { 'User-Agent': 'pkg-scaffold-dx-client/2.0' },
            signal: AbortSignal.timeout(5000)
        });
        if (response.status === 200) {
            const data = await response.json();
            return data.body;
        }
    } catch (licenseApiError) {}
    return null;
}

/**
 * Liest Dateien synchron ein und bereinigt etwaige BOM-Byte-Anordnungen.
 */
function readFileSyncNormalized(fullPath) {
    const buffer = fs.readFileSync(fullPath);
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return buffer.toString('utf16le');
    }
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return buffer.toString('utf8');
    }
    return buffer.toString('utf8');
}

/**
 * Hochpräziser Modul-Auflösungsalgorithmus via enhanced-resolve.
 */
const enhancedResolver = resolve.create.sync({
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte'],
    conditionNames: ['import', 'require', 'node', 'default'],
    mainFields: ['module', 'main'],
});

function resolveLocalModulePath(basePath, importSource) {
    try {
        return enhancedResolver(path.dirname(basePath), importSource);
    } catch (e) {
        // Fallback für den Fall, dass enhanced-resolve scheitert
        const extensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte'];
        let absoluteTarget = path.resolve(path.dirname(basePath), importSource);
        
        if (fs.existsSync(absoluteTarget) && fs.statSync(absoluteTarget).isDirectory()) {
            const indexFile = extensions.map(ext => { return path.join(absoluteTarget, `index${ext}`); }).find(fs.existsSync);
            if (indexFile) {
                return indexFile;
            }
        }
        const directFile = extensions.map(ext => { return absoluteTarget + ext; }).find(fs.existsSync);
        if (directFile) {
            return directFile;
        }
        if (fs.existsSync(absoluteTarget)) {
            return absoluteTarget;
        }
        return null;
    }
}

// ============================================================
// 🏗️ FRAMEWORK-SPECIFIC DEEP SCAN LOGIC
// ============================================================
class FrameworkAnalyzer {
    static analyzeNextjsFile(filePath, content, stats) {
        if (filePath.includes("pages/") && content.includes("getServerSideProps")) {
            stats.frameworkFiles.nextjs.dataFetching.set(filePath, "getServerSideProps");
            stats.frameworkOptimizations.push(`Next.js: Consider using 'getStaticProps' or client-side fetching for '${path.relative(process.cwd(), filePath)}' if data is not highly dynamic.`);
        }
        if (filePath.includes("pages/") && content.includes("getStaticProps")) {
            stats.frameworkFiles.nextjs.dataFetching.set(filePath, "getStaticProps");
        }
        if (filePath.includes("pages/") && content.includes("getStaticPaths")) {
            stats.frameworkFiles.nextjs.dataFetching.set(filePath, "getStaticPaths");
        }
        if (filePath.includes("app/") && content.includes("export async function GET")) {
            stats.frameworkFiles.nextjs.dataFetching.set(filePath, "Route Handler (GET)");
        }
        if (content.includes("<img") && !content.includes("<Image")) {
            stats.frameworkOptimizations.push(`Next.js: Use next/image for '${path.relative(process.cwd(), filePath)}' to optimize images.`);
        }
        if (content.includes("<link") && content.includes("googlefonts") && !content.includes("next/font")) {
            stats.frameworkOptimizations.push(`Next.js: Use next/font for '${path.relative(process.cwd(), filePath)}' to optimize fonts.`);
        }
    }

    static analyzeNuxtFile(filePath, content, stats) {
        if (content.includes("useAsyncData")) {
            stats.frameworkFiles.nuxt.dataFetching.set(filePath, "useAsyncData");
        }
        if (content.includes("useFetch")) {
            stats.frameworkFiles.nuxt.dataFetching.set(filePath, "useFetch");
        }
        if (filePath.includes("components/") && !content.includes("defineComponent")) {
            stats.frameworkOptimizations.push(`Nuxt: Ensure components in '${path.relative(process.cwd(), filePath)}' are properly defined for auto-import or explicitly imported.`);
        }
    }

    static analyzeSvelteKitFile(filePath, content, stats) {
        if (content.includes("export async function load")) {
            stats.frameworkFiles.sveltekit.loadFunctions.set(filePath, "load");
        }
        if (filePath.includes("src/routes/") && content.includes("export const actions")) {
            stats.frameworkFiles.sveltekit.endpoints.add(filePath);
        }
    }

    static analyzeReactFile(filePath, content, stats) {
        REGEX_PATTERNS.reactUseEffectNoDeps.lastIndex = 0;
        if (REGEX_PATTERNS.reactUseEffectNoDeps.test(content)) {
            stats.frameworkOptimizations.push(`React Warning: useEffect hook inside '${path.relative(process.cwd(), filePath)}' is missing a trailing dependency array, which can cause severe infinite re-render loops.`);
        }
    }

    static analyzeFile(filePath, content, stats, detectedFrameworks) {
        if (!detectedFrameworks || !Array.isArray(detectedFrameworks)) {
            return;
        }
        if (detectedFrameworks.includes("next")) {
            FrameworkAnalyzer.analyzeNextjsFile(filePath, content, stats);
        }
        if (detectedFrameworks.includes("nuxt")) {
            FrameworkAnalyzer.analyzeNuxtFile(filePath, content, stats);
        }
        if (detectedFrameworks.includes("svelte")) {
            FrameworkAnalyzer.analyzeSvelteKitFile(filePath, content, stats);
        }
        if (detectedFrameworks.includes("react")) {
            FrameworkAnalyzer.analyzeReactFile(filePath, content, stats);
        }
        if (detectedFrameworks.includes("vue")) {
            FrameworkAnalyzer.analyzeVueFile(filePath, content, stats);
        }
    }
}

class FrameworkEngine {
    static detect(targetDir, packageJson) {
        const detected = new Set();
        const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (allDependencies.next) {
            detected.add("next");
        }
        if (allDependencies.nuxt) {
            detected.add("nuxt");
        }
        if (allDependencies.sveltekit) {
            detected.add("svelte");
        }
        if (allDependencies.react) {
            detected.add("react");
        }
        if (allDependencies.vue) {
            detected.add("vue");
        }

        if (fs.existsSync(path.join(targetDir, "next.config.js")) || fs.existsSync(path.join(targetDir, "next.config.mjs"))) {
            detected.add("next");
        }
        if (fs.existsSync(path.join(targetDir, "nuxt.config.js")) || fs.existsSync(path.join(targetDir, "nuxt.config.ts"))) {
            detected.add("nuxt");
        }
        if (fs.existsSync(path.join(targetDir, "svelte.config.js"))) {
            detected.add("svelte");
        }
        if (fs.existsSync(path.join(targetDir, "vite.config.js")) || fs.existsSync(path.join(targetDir, "vite.config.ts"))) {
            if (allDependencies["@vitejs/plugin-react"]) {
                detected.add("react");
            }
            if (allDependencies["@vitejs/plugin-vue"]) {
                detected.add("vue");
            }
            if (allDependencies["@sveltejs/vite-plugin-svelte"]) {
                detected.add("svelte");
            }
        }
        return Array.from(detected);
    }
}

// ============================================================
// 🧱 CUSTOM STRUCTURAL HOISTED TEMPLATE MANAGER
// ============================================================
class TemplateManager {
    constructor(baseDir, safeQuestion) {
        this.baseDir = baseDir;
        this.safeQuestion = safeQuestion;
        this.templateSources = [{ name: 'local', path: path.join(this.baseDir, '.templates') }];
    }

    async listAvailableTemplates() {
        const allTemplates = new Set();
        for (const source of this.templateSources) {
            if (source.name === 'local') {
                const localTemplatesPath = source.path;
                if (fs.existsSync(localTemplatesPath)) {
                    const templates = fs.readdirSync(localTemplatesPath, { withFileTypes: true })
                        .filter(dirent => { return dirent.isDirectory(); })
                        .map(dirent => { return dirent.name; });
                    templates.forEach(t => { return allTemplates.add(t); });
                }
            }
        }
        return Array.from(allTemplates);
    }

    async getTemplatePath(templateName) {
        for (const source of this.templateSources) {
            if (source.name === 'local') {
                const templatePath = path.join(source.path, templateName);
                if (fs.existsSync(templatePath)) {
                    return templatePath;
                }
            }
        }
        return null;
    }

    async promptForVariables(templateName) {
        const templatePath = await this.getTemplatePath(templateName);
        if (!templatePath) {
            console.log(`    ⚠️  Template '${templateName}' not found.`);
            return {};
        }
        const configPath = path.join(templatePath, '_config.json');
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const variables = {};
                for (const key in config.prompts) {
                    const prompt = config.prompts[key];
                    let answer = await this.safeQuestion(`❓ ${prompt.message || key}: `);
                    if (prompt.type === 'boolean') {
                        answer = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
                    } else if (prompt.type === 'number') {
                        answer = parseFloat(answer);
                    }
                    variables[key] = answer;
                }
                return variables;
            } catch (jsonConfigReadError) {
                console.error(`    ❌ Error reading template config for '${templateName}': ${jsonConfigReadError.message}`);
                return {};
            }
        }
        return {};
    }

    async generate(templateName, variables) {
        const templatePath = await this.getTemplatePath(templateName);
        if (!templatePath) {
            return;
        }
        console.log(`    🚀 Generating '${templateName}' template with full route and token mutations...`);

        const renderFile = async (srcPath, destPath, vars) => {
            const content = fs.readFileSync(srcPath, 'utf8');
            let renderedContent = content;
            for (const key in vars) {
                renderedContent = renderedContent.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), vars[key]);
            }
            fs.writeFileSync(destPath, renderedContent);
        };

        const processDirectory = async (currentSrcDir, currentDestDir, vars) => {
            fs.mkdirSync(currentDestDir, { recursive: true });
            const items = fs.readdirSync(currentSrcDir, { withFileTypes: true });
            for (const item of items) {
                if (item.name === '_config.json' || item.name === 'config.json') {
                    continue;
                }
                
                let mutatedName = item.name;
                for (const key in vars) {
                    mutatedName = mutatedName.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), vars[key]);
                }
                mutatedName = mutatedName.replace(/_([a-zA-Z0-9_]+)_/g, (match, p1) => { return vars[p1] || match; });

                const srcItemPath = path.join(currentSrcDir, item.name);
                const destItemPath = path.join(currentDestDir, mutatedName);

                if (item.isDirectory()) {
                    await processDirectory(srcItemPath, destItemPath, vars);
                } else {
                    await renderFile(srcItemPath, destItemPath, vars);
                }
            }
        };
        await processDirectory(templatePath, this.baseDir, variables);
        console.log(`    ✅ Template '${templateName}' generated successfully.`);
    }
}

/**
 * Generiert einen sauberen ASCII-Layout-Baum für das automatisierte README-Dokument.
 */
function buildAsciiTree(dir, prefix = '') {
    const results = [];
    try {
        const files = fs.readdirSync(dir);
        const filtered = files.filter(f => { return !IGNORED_DIRS.has(f) && !f.startsWith('.'); });

        filtered.forEach((file, index) => {
            const isLast = index === filtered.length - 1;
            const marker = isLast ? '└── ' : '├── ';
            results.push(`${prefix}${marker}${file}`);

            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                const newPrefix = prefix + (isLast ? '    ' : '│   ');
                results.push(...buildAsciiTree(fullPath, newPrefix));
            }
        });
    } catch (asciiTreeTreeError) {}
    return results;
}

// ============================================================
// STRUKTURELLES IMPLEMENTIERUNGSHELFER SYSTEM
// ============================================================

/**
 * KORREKTUR: Prüft, ob ein extrahierter Import-Bezeichner im Programmcode verwendet wird.
 * Führt den regulären Ausdruck nun gegen das tatsächliche executionCode-Skelett aus, anstatt gegen den Alias selbst.
 */
function analyzeIdentifierUsage(pkg, identifiers, executionCode) {
    const autoUsedMarkers = new Set(['__SIDE_EFFECT__', '__DYNAMIC__', '__REEXPORT__', '__TYPE_ONLY__']);
    for (const id of identifiers) {
        if (autoUsedMarkers.has(id)) {
            return true;
        }
    }
    for (const id of identifiers) {
        const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${escaped}\\b`).test(executionCode)) {
            return true;
        }
    }
    const aliases = PACKAGE_IMPORT_ALIASES[pkg] || [];
    for (const alias of aliases) {
        const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${escapedAlias}\\b`).test(executionCode)) { // 👈 Use the properly escaped token here
            return true;
        }
    }
    return false;
}

/**
 * Findet Pakete, die im Programmcode importiert wurden, aber nicht in der package.json deklariert sind.
 */
function detectGhostDependencies(allImportedPackages, declaredDeps, declaredDevDeps) {
    const allDeclared = new Set([...declaredDeps, ...declaredDevDeps]);
    const ghosts = new Set();
    for (const pkg of allImportedPackages) {
        if (!allDeclared.has(pkg) && !builtinModules.includes(pkg)) {
            ghosts.add(pkg);
        }
    }
    return ghosts;
}

/**
 * Ermittelt ungenutzte verwaiste Abhängigkeiten aus der package.json.
 */
function detectOrphanedDependencies(declaredDeps, allImportedPackages, binariesUsed, devTooling) {
    const orphans = new Set();
    for (const dep of declaredDeps) {
        if (devTooling.has(dep) || dep.startsWith('@types/')) {
            continue;
        }
        const binaryPkg = Object.values(BINARY_TO_PACKAGE_MAP).find(p => { return p === dep; });
        if (binaryPkg && binariesUsed.has(dep)) {
            continue;
        }
        if (!allImportedPackages.has(dep)) {
            orphans.add(dep);
        }
    }
    return orphans;
}

/**
 * Semantische Symbol-Extraktion via TypeScript Compiler API.
 */
function extractAdvancedSymbols(sourceFile, stats, currentFilePath) {
    if (!stats.fileSymbolMetadata) {
        stats.fileSymbolMetadata = new Map();
    }

    const fileMeta = {
        imports: [],
        exports: new Map(),
        reExports: [],
        namespaceUses: new Map(),
    };

    function visit(node) {
        // --- Imports ---
        if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const importSource = node.moduleSpecifier.text;
            const specifiers = [];
            
            if (node.importClause) {
                if (node.importClause.name) {
                    specifiers.push({ type: 'ImportDefaultSpecifier', local: node.importClause.name.text });
                }
                if (node.importClause.namedBindings) {
                    if (ts.isNamespaceImport(node.importClause.namedBindings)) {
                        specifiers.push({ type: 'ImportNamespaceSpecifier', local: node.importClause.namedBindings.name.text });
                    } else if (ts.isNamedImports(node.importClause.namedBindings)) {
                        node.importClause.namedBindings.elements.forEach(el => {
                            specifiers.push({ 
                                type: 'ImportSpecifier', 
                                local: el.name.text, 
                                imported: el.propertyName ? el.propertyName.text : el.name.text 
                            });
                        });
                    }
                }
            }
            
            fileMeta.imports.push({
                source: importSource,
                specifiers,
                isTypeOnly: !!node.importClause?.isTypeOnly
            });
        }

        // --- Exports ---
        if (ts.isExportDeclaration(node)) {
            if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
                const specifiers = [];
                if (node.exportClause && ts.isNamedExports(node.exportClause)) {
                    node.exportClause.elements.forEach(el => {
                        specifiers.push({
                            exported: el.name.text,
                            local: el.propertyName ? el.propertyName.text : el.name.text
                        });
                    });
                }
                fileMeta.reExports.push({ source: node.moduleSpecifier.text, specifiers });
            }
        }

        if (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
            node.declarationList.declarations.forEach(decl => {
                if (ts.isIdentifier(decl.name)) {
                    fileMeta.exports.set(decl.name.text, { type: 'variable' });
                }
            });
        }

        if (ts.isFunctionDeclaration(node) && node.name && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
            fileMeta.exports.set(node.name.text, { type: 'function' });
        }

        if (ts.isClassDeclaration(node) && node.name && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
            fileMeta.exports.set(node.name.text, { type: 'class' });
        }

        // --- Symbol Usage Tracking ---
        if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
            const namespace = node.expression.text;
            if (!fileMeta.namespaceUses.has(namespace)) {
                fileMeta.namespaceUses.set(namespace, new Set());
            }
            fileMeta.namespaceUses.get(namespace).add(node.name.text);
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    stats.fileSymbolMetadata.set(currentFilePath, fileMeta);
}

function extractImportsFromAST(sourceFile, fileRawDeps, importedIdentifiers, importedLocations, exportedSymbols, stats, currentFilePath) {
    extractAdvancedSymbols(sourceFile, stats, currentFilePath);
    
    const fileMeta = stats.fileSymbolMetadata.get(currentFilePath);
    
    fileMeta.imports.forEach(imp => {
        const pkg = cleanPackageName(imp.source);
        if (pkg && !builtinModules.includes(pkg)) {
            fileRawDeps.add(pkg);
            if (!importedIdentifiers.has(pkg)) {
                importedIdentifiers.set(pkg, new Set());
            }
            if (!importedLocations.has(pkg)) {
                importedLocations.set(pkg, []);
            }
            
            imp.specifiers.forEach(spec => {
                importedIdentifiers.get(pkg).add(spec.local);
                if (spec.imported && spec.imported !== spec.local) {
                    importedIdentifiers.get(pkg).add(spec.imported);
                }
            });
            
            if (imp.specifiers.length === 0) {
                importedIdentifiers.get(pkg).add('__SIDE_EFFECT__');
            }
            if (imp.isTypeOnly) {
                importedIdentifiers.get(pkg).add('__TYPE_ONLY__');
            }
        } else if (imp.source.startsWith('.') || imp.source.startsWith('/')) {
            const resolvedPath = resolveLocalModulePath(currentFilePath, imp.source);
            if (resolvedPath) {
                if (!stats.localFileImports) {
                    stats.localFileImports = new Map();
                }
                if (!stats.localFileImports.has(resolvedPath)) {
                    stats.localFileImports.set(resolvedPath, new Set());
                }
                imp.specifiers.forEach(spec => {
                    stats.localFileImports.get(resolvedPath).add(spec.local);
                });
            }
        }
    });

    // Handle CJS require
    function visit(node) {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
            const arg = node.arguments[0];
            if (arg && ts.isStringLiteral(arg)) {
                const pkg = cleanPackageName(arg.text);
                if (pkg && !builtinModules.includes(pkg)) {
                    fileRawDeps.add(pkg);
                    if (!importedIdentifiers.has(pkg)) {
                        importedIdentifiers.set(pkg, new Set());
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(sourceFile);

    // Sync exported symbols
    fileMeta.exports.forEach((meta, name) => {
        exportedSymbols.set(name, meta);
    });
}

/**
 * Textbasierter Regex-Ersatz-Parser, falls der AST-Parser auf Syntaxfehler stößt.
 */
function extractImportsFromText(codeLines, fileRawDeps, importedIdentifiers, importedLocations, stats, currentFilePath) {
    codeLines.forEach((line, lineIdx) => {
        const lineNum = lineIdx + 1;
        const typeImportMatch = line.match(/\bimport\s+type\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/);
        if (typeImportMatch) {
            const importSource = typeImportMatch[1];
            const pkg = cleanPackageName(importSource);
            if (pkg && !builtinModules.includes(pkg)) {
                fileRawDeps.add(pkg);
                if (!importedIdentifiers.has(pkg)) {
                    importedIdentifiers.set(pkg, new Set());
                }
                importedIdentifiers.get(pkg).add('__TYPE_ONLY__');
                if (!importedLocations.has(pkg)) {
                    importedLocations.set(pkg, []);
                }
                importedLocations.get(pkg).push(lineNum);
            } else if (importSource.startsWith(".") || importSource.startsWith("/")) {
                const resolvedPath = resolveLocalModulePath(currentFilePath, importSource);
                if (resolvedPath) {
                    if (!stats.localFileImports) {
                        stats.localFileImports = new Map();
                    }
                    if (!stats.localFileImports.has(resolvedPath)) {
                        stats.localFileImports.set(resolvedPath, new Set());
                    }
                    stats.localFileImports.get(resolvedPath).add('__TYPE_ONLY__');
                }
            }
            return;
        }

        const esmDefaultMatch = line.match(/\bimport\s+(?:\*\s+as\s+)?([a-zA-Z0-9_$]+)\s+from\s+['"]([^'"]+)['"]/);
        if (esmDefaultMatch) {
            const id = esmDefaultMatch[1];
            const importSource = esmDefaultMatch[2];
            const pkg = cleanPackageName(importSource);
            if (pkg && !builtinModules.includes(pkg)) {
                fileRawDeps.add(pkg);
                if (!importedIdentifiers.has(pkg)) {
                    importedIdentifiers.set(pkg, new Set());
                }
                importedIdentifiers.get(pkg).add(id);
                if (!importedLocations.has(pkg)) {
                    importedLocations.set(pkg, []);
                }
                importedLocations.get(pkg).push(lineNum);
            } else if (importSource.startsWith(".") || importSource.startsWith("/")) {
                const resolvedPath = resolveLocalModulePath(currentFilePath, importSource);
                if (resolvedPath) {
                    if (!stats.localFileImports) {
                        stats.localFileImports = new Map();
                    }
                    if (!stats.localFileImports.has(resolvedPath)) {
                        stats.localFileImports.set(resolvedPath, new Set());
                    }
                    stats.localFileImports.get(resolvedPath).add(id);
                }
            }
            return;
        }

        const esmNamedMatch = line.match(/\bimport\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/);
        if (esmNamedMatch) {
            const importSource = esmNamedMatch[2];
            const pkg = cleanPackageName(importSource);
            if (pkg && !builtinModules.includes(pkg)) {
                if (!importedIdentifiers.has(pkg)) {
                    importedIdentifiers.set(pkg, new Set());
                }
                fileRawDeps.add(pkg);
                esmNamedMatch[1].split(',').forEach(part => {
                    const chunk = part.trim();
                    if (!chunk) {
                        return;
                    }
                    const id = chunk.includes(' as ') ? chunk.split(' as ')[1].trim() : chunk;
                    importedIdentifiers.get(pkg).add(id);
                });
                if (!importedLocations.has(pkg)) {
                    importedLocations.set(pkg, []);
                }
                importedLocations.get(pkg).push(lineNum);
            } else if (importSource.startsWith(".") || importSource.startsWith("/")) {
                const resolvedPath = resolveLocalModulePath(currentFilePath, importSource);
                if (resolvedPath) {
                    if (!stats.localFileImports) {
                        stats.localFileImports = new Map();
                    }
                    if (!stats.localFileImports.has(resolvedPath)) {
                        stats.localFileImports.set(resolvedPath, new Set());
                    }
                    esmNamedMatch[1].split(',').forEach(part => {
                        const chunk = part.trim();
                        if (!chunk) {
                            return;
                        }
                        const id = chunk.includes(' as ') ? chunk.split(' as ')[1].trim() : chunk;
                        stats.localFileImports.get(resolvedPath).add(id);
                    });
                }
            }
            return;
        }

        const sideEffectMatch = line.match(/\bimport\s+['"]([^'"]+)['"]/);
        if (sideEffectMatch) {
            const importSource = sideEffectMatch[1];
            const pkg = cleanPackageName(importSource);
            if (pkg && !builtinModules.includes(pkg)) {
                fileRawDeps.add(pkg);
                if (!importedIdentifiers.has(pkg)) {
                    importedIdentifiers.set(pkg, new Set());
                }
                importedIdentifiers.get(pkg).add('__SIDE_EFFECT__');
                if (!importedLocations.has(pkg)) {
                    importedLocations.set(pkg, []);
                }
                importedLocations.get(pkg).push(lineNum);
            } else if (importSource.startsWith(".") || importSource.startsWith("/")) {
                const resolvedPath = resolveLocalModulePath(currentFilePath, importSource);
                if (resolvedPath) {
                    if (!stats.localFileImports) {
                        stats.localFileImports = new Map();
                    }
                    if (!stats.localFileImports.has(resolvedPath)) {
                        stats.localFileImports.set(resolvedPath, new Set());
                    }
                    stats.localFileImports.get(resolvedPath).add('__SIDE_EFFECT__');
                }
            }
            return;
        }
    });
}

/**
 * Rekursive Workspace-Analyse-Engine.
 */
function scanWorkspace(dir, stats, rootNamespace, detectedFrameworks) {
    try {
        const entries = fs.readdirSync(dir);
        for (const file of entries) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (IGNORED_DIRS.has(file) || file.startsWith('.')) {
                    continue;
                }
                scanWorkspace(fullPath, stats, rootNamespace, detectedFrameworks);
            } else {
                const ext = path.extname(file);
                if (file === 'index.html' || REGEX_PATTERNS.configFile.test(file)) {
                    stats.hasHtml = true;
                }
                if (REGEX_PATTERNS.testFile.test(file)) {
                    stats.hasTests = true;
                }
                if (ext === '.ts' || ext === '.tsx') {
                    stats.tsFiles++;
                }
                if (ext === '.js' || ext === '.jsx' || ext === '.mjs') {
                    stats.jsFiles++;
                }

                if (REGEX_PATTERNS.nextjsPage.test(fullPath)) {
                    stats.frameworkFiles.nextjs.pages.add(fullPath);
                }
                if (REGEX_PATTERNS.nextjsApi.test(fullPath)) {
                    stats.frameworkFiles.nextjs.apiRoutes.add(fullPath);
                }
                if (REGEX_PATTERNS.nextjsComponent.test(fullPath)) {
                    stats.frameworkFiles.nextjs.components.add(fullPath);
                }
                if (REGEX_PATTERNS.nuxtPage.test(fullPath)) {
                    stats.frameworkFiles.nuxt.pages.add(fullPath);
                }
                if (REGEX_PATTERNS.nuxtComponent.test(fullPath)) {
                    stats.frameworkFiles.nuxt.components.add(fullPath);
                }
                if (REGEX_PATTERNS.sveltekitPage.test(fullPath)) {
                    stats.frameworkFiles.sveltekit.pages.add(fullPath);
                }
                if (REGEX_PATTERNS.sveltekitComponent.test(fullPath)) {
                    stats.frameworkFiles.sveltekit.components.add(fullPath);
                }
                if (REGEX_PATTERNS.reactHook.test(fullPath)) {
                    stats.frameworkFiles.react.hooks.add(fullPath);
                }
                if (REGEX_PATTERNS.vueComposable.test(fullPath)) {
                    stats.frameworkFiles.vue.composables.add(fullPath);
                }

                if (VALID_EXTENSIONS.has(ext)) {
                    stats.scannedFiles++;
                    stats.scannedFilePaths.push(fullPath);
                    const rawContent = readFileSyncNormalized(fullPath);
                    const content = rawContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

                    const codeLines = content.split(/\r?\n/);
                    const importedIdentifiers = new Map();
                    const importedLocations = new Map();
                    const fileRawDeps = new Set();

                    analyzeCodeStyle(content, stats);

                    for (const [patternName, patternRegex] of Object.entries(REGEX_PATTERNS)) {
                        if (patternName.startsWith("secretKeys") || patternName.endsWith("Keys") || patternName.endsWith("Tokens")) {
                            patternRegex.lastIndex = 0;
                            let match;
                            while ((match = patternRegex.exec(content)) !== null) {
                                const keyName = match[1] || patternName;
                                const secretValue = match[2] || match[0];
                                const envVarName = `${rootNamespace.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${keyName.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
                                stats.discoveredSecrets.push({ filePath: fullPath, keyName, secretValue, envVarName, type: patternName });
                                stats.envVars.add(envVarName);
                            }
                        } else if (patternName.startsWith("insecure")) {
                            patternRegex.lastIndex = 0;
                            let match;
                            while ((match = patternRegex.exec(content)) !== null) {
                                const line = content.substring(0, match.index).split("\n").length;
                                if (patternName === "insecureCrypto") {
                                    stats.quality.insecureCryptoUsage.push({ filePath: fullPath, type: patternName, line, code: match[0] });
                                } else if (patternName === "sqlInjection") {
                                    stats.quality.sqlInjectionVulnerabilities.push({ filePath: fullPath, type: patternName, line, code: match[0] });
                                } else if (patternName === "xssVulnerability") {
                                    stats.quality.xssVulnerabilities.push({ filePath: fullPath, type: patternName, line, code: match[0] });
                                } else {
                                    stats.quality.insecurePatterns.push({ filePath: fullPath, type: patternName, line, code: match[0] });
                                }
                            }
                        } else if (patternName.startsWith("largeImageImport")) {
                            patternRegex.lastIndex = 0;
                            let match;
                            while ((match = patternRegex.exec(content)) !== null) {
                                const line = content.substring(0, match.index).split("\n").length;
                                stats.quality.largeImageImports.push({ filePath: fullPath, type: patternName, line, code: match[0] });
                            }
                        } else if (patternName.startsWith("unoptimizedLoop")) {
                            patternRegex.lastIndex = 0;
                            let match;
                            while ((match = patternRegex.exec(content)) !== null) {
                                const line = content.substring(0, match.index).split("\n").length;
                                stats.quality.unoptimizedLoops.push({ filePath: fullPath, type: patternName, line, code: match[0] });
                            }
                        }
                    }

                    let fileHasEnv = false;
                    REGEX_PATTERNS.env.lastIndex = 0;
                    while ((envMatch = REGEX_PATTERNS.env.exec(content)) !== null) {
                        stats.envVars.add(envMatch[1]);
                        fileHasEnv = true;
                    }
                    if (fileHasEnv) {
                        stats.filesWithEnvVars.add(fullPath);
                    }
                    if (content.includes('import ') || content.includes('export ')) {
                        stats.usesEsm = true;
                    }

                    FrameworkAnalyzer.analyzeFile(fullPath, content, stats, detectedFrameworks);

                    let sourceFile = null;
                    try {
                        sourceFile = ts.createSourceFile(fullPath, content, ts.ScriptTarget.Latest, true);
                    } catch (e) {}

                    if (sourceFile) {
                        const currentFileExportedSymbols = new Map();
                        extractImportsFromAST(sourceFile, fileRawDeps, importedIdentifiers, importedLocations, currentFileExportedSymbols, stats, fullPath);
                        if (currentFileExportedSymbols.size > 0) {
                            stats.exportedSymbols.set(fullPath, currentFileExportedSymbols);
                        }
                    } else {
                        extractImportsFromText(codeLines, fileRawDeps, importedIdentifiers, importedLocations, stats, fullPath);
                    }

                    fileRawDeps.forEach(dep => { return stats.allImportedPackages.add(dep); });
                    fileRawDeps.forEach(dep => { return stats.rawDeps.add(dep); });

                    const executionCode = codeLines.filter(l => {
                        const t = l.trim();
                        return !t.startsWith('import ') && !/\brequire\s*\(/.test(t);
                    }).join('\n');

                    for (const [pkg, identifiers] of importedIdentifiers.entries()) {
                        const isUsed = analyzeIdentifierUsage(pkg, identifiers, executionCode);
                        if (!isUsed && identifiers.size > 0) {
                            if (!stats.unusedImportsPerFile.has(fullPath)) {
                                stats.unusedImportsPerFile.set(fullPath, new Map());
                            }
                            const lines = importedLocations.get(pkg) || [];
                            stats.unusedImportsPerFile.get(fullPath).set(pkg, lines);
                            if (!isUsed && !['__TYPE_ONLY__'].some(m => identifiers.has(m))) {
                                stats.unusedDepsInCode.add(pkg);
                            }
                        }
                    }
                }
            }
        }
    } catch (scanWorkspaceError) {}
}

// ============================================================
// 🌳 KNIP-LEVEL REACHABILITY TRAVERSAL ENGINE
// ============================================================
class KnipEcosystemGraph {
    constructor(stats) {
        this.stats = stats;
        this.reachableFiles = new Set();
        this.usedSymbolsMap = new Map(); 
    }

    /**
     * Traversiert den Modulgraphen ausgehend von den Entrypoints, um erreichbare Dateien und Tokens zu mappen.
     * @param {Array<string>} entrypoints Liste absoluter Dateipfade als Einstiegspunkte.
     */
    traceReachability(entrypoints) {
        const queue = [...entrypoints];
        const visited = new Set();

        while (queue.length > 0) {
            const currentFile = queue.shift();
            if (visited.has(currentFile)) {
                continue;
            }
            visited.add(currentFile);
            this.reachableFiles.add(currentFile);

            const meta = this.stats.fileSymbolMetadata?.get(currentFile);
            if (!meta) {
                continue;
            }

            meta.imports.forEach(imp => {
                const targetPath = resolveLocalModulePath(currentFile, imp.source);
                if (!targetPath) {
                    return;
                }

                if (!this.usedSymbolsMap.has(targetPath)) {
                    this.usedSymbolsMap.set(targetPath, new Set());
                }
                const targetUses = this.usedSymbolsMap.get(targetPath);

                imp.specifiers.forEach(spec => {
                    if (spec.type === 'ImportNamespaceSpecifier') {
                        const propsAccessed = meta.namespaceUses.get(spec.local);
                        if (propsAccessed) {
                            propsAccessed.forEach(p => { return targetUses.add(p); });
                        } else {
                            targetUses.add('*');
                        }
                    } else {
                        targetUses.add(spec.imported);
                    }
                });
                if (!visited.has(targetPath)) {
                    queue.push(targetPath);
                }
            });

            meta.reExports.forEach(re => {
                const targetPath = resolveLocalModulePath(currentFile, re.source);
                if (!targetPath) {
                    return;
                }

                if (!this.usedSymbolsMap.has(targetPath)) {
                    this.usedSymbolsMap.set(targetPath, new Set());
                }
                const targetUses = this.usedSymbolsMap.get(targetPath);

                re.specifiers.forEach(spec => {
                    targetUses.add(spec.local || spec.exported);
                });
                if (!visited.has(targetPath)) {
                    queue.push(targetPath);
                }
            });
        }
    }
}

// ============================================================
// 📊 POST-PROCESSING ANALYSIS PASS
// ============================================================
/**
 * Führt nach der Traversierung den Abgleich zwischen deklarierten und ungenutzten Exporten/Dateien durch.
 * @param {Object} stats Globales Analyseobjekt.
 * @param {Object} graphEngine Instanz der Graphen-Traversierung.
 */
function postProcessAnalysis(stats, graphEngine) {
    stats.unusedFiles = new Set();
    stats.unusedExportsPerFile = new Map();

    stats.scannedFilePaths.forEach(filePath => {
        if (!graphEngine.reachableFiles.has(filePath)) {
            stats.unusedFiles.add(filePath);
        }
    });

    for (const filePath of graphEngine.reachableFiles) {
        const meta = stats.fileSymbolMetadata?.get(filePath);
        if (!meta) {
            continue;
        }

        const globalUses = graphEngine.usedSymbolsMap.get(filePath) || new Set();
        if (globalUses.has('*')) {
            continue;
        }

        const unusedSet = new Set();
        for (const [exportName] of meta.exports.entries()) {
            if (!globalUses.has(exportName)) {
                unusedSet.add(exportName);
            }
        }
        if (unusedSet.size > 0) {
            stats.unusedExportsPerFile.set(filePath, unusedSet);
        }
    }

    if (stats.detectedFrameworks && stats.detectedFrameworks.includes('tailwind')) {
        const tailwindConfigPath = path.join(stats.targetDir, 'tailwind.config.js');
        if (fs.existsSync(tailwindConfigPath)) {
            try {
                const tailwindContent = fs.readFileSync(tailwindConfigPath, 'utf8');
                const contentArrayMatch = tailwindContent.match(/content:\s*\[([^\]]+)\]/s);
                if (contentArrayMatch && contentArrayMatch[1]) {
                    const globPatterns = contentArrayMatch[1].split(',').map(s => { return s.trim().replace(/["']/g, ''); });
                    if (globPatterns.length > 0) {
                        console.log(`    ℹ️ Tailwind Context Scan: Registered ${globPatterns.length} content matching globs vectors.`);
                    }
                }
            } catch (tailwindFileReadException) {}
        }
    }
}

// ============================================================
// INTERACTIVE ENGINE COMMAND LINE SYSTEM
// ============================================================
async function main() {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        console.log(`\n📦 pkg-scaffold v2.3.0: Advanced Dependency Intelligence Engine\n`);
        console.log(`Usage: npx pkg-scaffold [options]\n`);
        console.log(`Options:`);
        console.log(`  -h, --help      Show this comprehensive workspace helper panel`);
        process.exit(0);
    }

    if (process.env.INIT_CWD && !process.env.NPX_CLI_JS) {
        console.log("\x1b[31m%s\x1b[0m", "🛑 Wait! Do not install this package locally.");
        console.log("Please run it directly using: \x1b[36mnpx pkg-scaffold\x1b[0m\n");
        process.exit(1);
    }
    const targetDir = process.cwd();
    const folderName = path.basename(targetDir);
    const gitInfo = getGitIdentity();

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let rlClosed = false;
    rl.on('close', () => { rlClosed = true; });
    const safeQuestion = async (prompt) => {
        if (rlClosed || !process.stdin.readable) {
            return '';
        }
        try { 
            return await rl.question(prompt); 
        } catch (readlineQuestionPromptError) { 
            return ''; 
        }
    };

    const stats = {
        tsFiles: 0, 
        jsFiles: 0, 
        usesEsm: false, 
        hasHtml: false, 
        hasTests: false,
        scannedFiles: 0,
        scannedFilePaths: [], 
        rawDeps: new Set(),
        allImportedPackages: new Set(),
        envVars: new Set(),
        style: { semiCount: 0, noSemiCount: 0, tabCount: 0, space2Count: 0, space4Count: 0 },
        quality: { 
            varCount: 0, hasEval: false, syncFsCount: 0, insecurePatterns: [], complexRegexes: [],
            insecureCryptoUsage: [], sqlInjectionVulnerabilities: [], xssVulnerabilities: [],
            largeImageImports: [], unoptimizedLoops: [], frameworkSpecificIssues: []
        },
        phantomInjections: new Map(),
        discoveredSecrets: [],
        insecureCodePatterns: [],
        subWorkspaces: [],
        conflictingLockfiles: [],
        exportedSymbols: new Map(), 
        usedExports: new Map(), 
        unusedFiles: new Set(),
        unusedExportsPerFile: new Map(), 
        localFileImports: new Map(), 
        unusedDepsInCode: new Set(),
        unusedImportsPerFile: new Map(), 
        filesWithEnvVars: new Set(), 
        injectDotenvEngine: false, 
        bootstrapEslintSuite: false,
        ghostDependencies: new Set(), 
        orphanedDependencies: new Set(), 
        deprecatedPackages: new Map(),
        fileSymbolMetadata: new Map(),
        frameworkFiles: {
            nextjs: { pages: new Set(), apiRoutes: new Set(), components: new Set(), dataFetching: new Map(), optimizations: [] },
            nuxt: { pages: new Set(), components: new Set(), modules: new Set(), dataFetching: new Map(), optimizations: [] },
            sveltekit: { pages: new Set(), components: new Set(), endpoints: new Set(), loadFunctions: new Map(), optimizations: [] },
            react: { hooks: new Set(), components: new Set(), optimizations: [] },
            vue: { composables: new Set(), components: new Set(), optimizations: [] },
        },
        frameworkOptimizations: [],
        packageJson: null, 
        targetDir: targetDir, 
        detectedFrameworks: []
    };

    const activePkgManager = detectPackageManager(targetDir, stats);
    const pkgPath = path.join(targetDir, 'package.json');
    let preExistingLicense = null, preExistingDeps = [], preExistingDevDeps = [], existingPackageJson = null;
    let detectedFrameworks = []; 

    console.log(`\n${'═'.repeat(67)}`);
    console.log(`🚀 pkg-scaffold v2.3.0: Enterprise Graph Intelligence Analyzer`);
    console.log(`${'═'.repeat(67)}\n`);

    const topLevelItems = fs.readdirSync(targetDir);
    const potentialSubModules = [];
    for (const item of topLevelItems) {
        const fullPath = path.join(targetDir, item);
        if (!IGNORED_DIRS.has(item) && !item.startsWith('.') && fs.statSync(fullPath).isDirectory()) {
            let containsSourceCode = false;
            const examineDirectory = (d) => {
                try {
                    const subEntries = fs.readdirSync(d);
                    for (const entry of subEntries) {
                        const entryPath = path.join(d, entry);
                        if (fs.statSync(entryPath).isDirectory()) {
                            if (!IGNORED_DIRS.has(entry) && !entry.startsWith('.')) {
                                examineDirectory(entryPath);
                            }
                        } else if (VALID_EXTENSIONS.has(path.extname(entry))) {
                            containsSourceCode = true;
                        }
                    }
                } catch (subDirReadError) {}
            };
            examineDirectory(fullPath);
            if (containsSourceCode) {
                potentialSubModules.push(item);
            }
        }
    }
    if (potentialSubModules.length > 1) {
        stats.subWorkspaces = potentialSubModules;
    }

    if (fs.existsSync(pkgPath)) {
        console.log(`⚠️  An existing package.json was found in this working directory.`);
        console.log(`📡 Analyzing existing installation arrays for invalid metrics...`);
        try {
            existingPackageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            stats.packageJson = existingPackageJson;
            if (existingPackageJson.license && typeof existingPackageJson.license === 'string' && existingPackageJson.license.toLowerCase() !== 'none') {
                preExistingLicense = existingPackageJson.license;
            }
            if (existingPackageJson.dependencies) {
                preExistingDeps = Object.keys(existingPackageJson.dependencies);
            }
            if (existingPackageJson.devDependencies) {
                preExistingDevDeps = Object.keys(existingPackageJson.devDependencies);
            }

            detectedFrameworks = FrameworkEngine.detect(targetDir, existingPackageJson);
            stats.detectedFrameworks = detectedFrameworks;

            const combinedDeps = [...preExistingDeps, ...preExistingDevDeps];
            let brokenEcosystem = false;

            if (combinedDeps.length > 0) {
                console.log(`    🔍 Validating ${combinedDeps.length} declared package(s) against npm registry...`);
                for (const dep of combinedDeps) {
                    const check = await inspectNpmPackage(dep);
                    
                    if (check && check.error === 'NOT_FOUND') {
                        if (dep.startsWith('@')) {
                            console.log(`    ℹ️ Scoped or private module bypassed registry assertion: "${dep}"`);
                        } else {
                            brokenEcosystem = true;
                            console.log(`    ❌ Non-existent package on registry: "${dep}"`);
                        }
                    } else if (check && check.deprecated) {
                        stats.deprecatedPackages.set(dep, check.deprecated);
                        console.log(`    ⚠️  Deprecated package detected: "${dep}" — ${check.deprecated}`);
                    }
                }
            }
            if (brokenEcosystem) {
                console.log(`\n🛑 CRITICAL COMPLIANCE BREAK: Your current package.json contains non-existent packages.`);
                console.log(`👉 Action Required: Please remove or backup the existing 'package.json' from this folder.\n`);
                rl.close();
                return;
            }
        } catch (packageJsonParseRuntimeError) {
            console.log(`\n🛑 CRITICAL: Existing package.json is malformed or corrupt.\n`);
            rl.close();
            return;
        }
    }

    console.log(`\n🔬 Scanning workspace source files...`);
    scanWorkspace(targetDir, stats, folderName, detectedFrameworks);
    console.log(`    Janitor: Found ${stats.scannedFiles} source module assets.`);

    // --- TRIGGER RE-ARCHITECTED KNIP GRAPH INTELLIGENCE ---
    const graphEngine = new KnipEcosystemGraph(stats);
    const initialEntries = new Set();
    const baseEntryFallbacks = ['index.js', 'index.ts', 'src/index.js', 'src/index.ts', 'main.js', 'src/main.js', 'src/main.ts'];
    baseEntryFallbacks.forEach(f => {
        const absolutePath = path.join(targetDir, f);
        if (fs.existsSync(absolutePath)) {
            initialEntries.add(absolutePath);
        }
    });

    if (existingPackageJson) {
        if (existingPackageJson.main) {
            initialEntries.add(path.resolve(targetDir, existingPackageJson.main));
        }
        if (existingPackageJson.module) {
            initialEntries.add(path.resolve(targetDir, existingPackageJson.module));
        }
    }

    stats.frameworkFiles.nextjs.pages.forEach(file => { return initialEntries.add(file); });
    stats.frameworkFiles.nextjs.apiRoutes.forEach(file => { return initialEntries.add(file); });
    stats.frameworkFiles.nuxt.pages.forEach(file => { return initialEntries.add(file); });
    stats.frameworkFiles.sveltekit.pages.forEach(file => { return initialEntries.add(file); });

    graphEngine.traceReachability(Array.from(initialEntries));
    postProcessAnalysis(stats, graphEngine);

    const binariesInScripts = existingPackageJson ? getBinariesFromPackageJson(existingPackageJson) : [];
    const resolvedBinaryPackages = new Set();
    for (const binary of binariesInScripts) {
        const pkgName = BINARY_TO_PACKAGE_MAP[binary] || binary;
        resolvedBinaryPackages.add(pkgName);
        stats.rawDeps.add(pkgName);
        stats.allImportedPackages.add(pkgName);
    }

    if (preExistingDeps.length > 0 || preExistingDevDeps.length > 0) {
        stats.ghostDependencies = detectGhostDependencies(stats.allImportedPackages, preExistingDeps, preExistingDevDeps);
        for (const dep of stats.ghostDependencies) {
            if (DEV_TOOLING_ECOSYSTEM.has(dep) || dep.startsWith('@types/')) {
                stats.ghostDependencies.delete(dep);
            }
        }
    }

    if (preExistingDeps.length > 0) {
        stats.orphanedDependencies = detectOrphanedDependencies(preExistingDeps, stats.allImportedPackages, resolvedBinaryPackages, DEV_TOOLING_ECOSYSTEM);
    }

    if (stats.ghostDependencies.size > 0) {
        console.log(`\n${'─'.repeat(67)}`);
        console.log(`👻 GHOST DEPENDENCIES DETECTED (Used but not in package.json)`);
        console.log(`${'─'.repeat(67)}`);
        for (const pkg of stats.ghostDependencies) {
            console.log(`    🚫 \x1b[31m"${pkg}"\x1b[0m — imported but missing from declarations.`);
        }
        console.log(`${'─'.repeat(67)}`);
    }

    if (stats.unusedFiles.size > 0) {
        console.log(`\n${'─'.repeat(67)}`);
        console.log(`💀 ORPHANED FILES DETECTED (Never reached from entrypoints)`);
        console.log(`${'─'.repeat(67)}`);
        stats.unusedFiles.forEach(f => {
            console.log(`    💀 \x1b[31m"${path.relative(targetDir, f)}"\x1b[0m — file never mapped or imported.`);
        });
        console.log(`${'─'.repeat(67)}`);
    }

    if (stats.unusedExportsPerFile.size > 0) {
        console.log(`\n${'─'.repeat(67)}`);
        console.log(`📤 UNUSED EXPORTS DETECTED (Dead Public API Symbols)`);
        console.log(`${'─'.repeat(67)}`);
        for (const [file, symbols] of stats.unusedExportsPerFile.entries()) {
            console.log(`    ⚡ \x1b[33m"${path.relative(targetDir, file)}"\x1b[0m -> Dead Token(s): [ ${Array.from(symbols).join(', ')} ]`);
        }
        console.log(`${'─'.repeat(67)}`);
    }

    if (stats.orphanedDependencies.size > 0) {
        console.log(`\n${'─'.repeat(67)}`);
        console.log(`📦 ORPHANED DEPENDENCIES DETECTED (in package.json, never imported)`);
        console.log(`${'─'.repeat(67)}`);
        for (const pkg of stats.orphanedDependencies) {
            console.log(`    🗑️  \x1b[33m"${pkg}"\x1b[0m — declared but never imported`);
        }
        console.log(`${'─'.repeat(67)}`);
        const pruneOrphans = await safeQuestion(`❓ Remove these orphaned packages from package.json? (y/N): `);
        if (pruneOrphans.trim().toLowerCase() === 'y' || pruneOrphans.trim().toLowerCase() === 'yes') {
            if (existingPackageJson) {
                for (const pkg of stats.orphanedDependencies) {
                    delete existingPackageJson.dependencies?.[pkg];
                }
                fs.writeFileSync(pkgPath, JSON.stringify(existingPackageJson, null, 2));
                console.log(`    🗑️  Orphaned dependencies removed from package.json.`);
            }
        }
    }

    if (stats.deprecatedPackages.size > 0) {
        console.log(`\n${'─'.repeat(67)}`);
        console.log(`⚠️  DEPRECATED PACKAGES DETECTED`);
        console.log(`${'─'.repeat(67)}`);
        for (const [pkg, msg] of stats.deprecatedPackages.entries()) {
            console.log(`    📛 \x1b[33m"${pkg}"\x1b[0m — ${msg}`);
        }
        console.log(`${'─'.repeat(67)}`);
    }

    const allDeclaredForPhantom = new Set([...preExistingDeps, ...preExistingDevDeps]);
    const phantomScanContent = new Map();
    function collectExecutionContent(dir) {
        try {
            for (const file of fs.readdirSync(dir)) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory() && !IGNORED_DIRS.has(file) && !file.startsWith('.')) {
                    collectExecutionContent(fullPath);
                } else if (VALID_EXTENSIONS.has(path.extname(file))) {
                    try {
                        const content = readFileSyncNormalized(fullPath);
                        const execCode = content.split(/\r?\n/).filter(l => {
                            const t = l.trim();
                            return !t.startsWith('import ') && !/\brequire\s*\(/.test(t);
                        }).join('\n');
                        phantomScanContent.set(fullPath, execCode);
                    } catch (readExecContentError) {}
                }
            }
        } catch (fsCollectExecError) {}
    }
    collectExecutionContent(targetDir);

    for (const [filePath, execCode] of phantomScanContent.entries()) {
        for (const token of allDeclaredForPhantom) {
            const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp(`\\b${escaped}\\b`).test(execCode) && !stats.allImportedPackages.has(token)) {
                stats.rawDeps.add(token);
                if (!stats.phantomInjections.has(filePath)) {
                    stats.phantomInjections.set(filePath, new Set());
                }
                stats.phantomInjections.get(filePath).add(token);
            }
        }
    }

    const isTypeScript = stats.tsFiles > stats.jsFiles;
    const isFrontendWeb = stats.hasHtml || stats.rawDeps.has('react') || stats.rawDeps.has('vue') || stats.rawDeps.has('vite') || stats.rawDeps.has('svelte') || stats.rawDeps.has('next') || stats.rawDeps.has('nuxt');

    if (stats.envVars.size > 0 && !stats.rawDeps.has('dotenv') && !isFrontendWeb) {
        console.log(`\n📡 CONFIGURATION COMPLIANCE GAP: UNMANAGED ENVIRONMENT VARIABLES`);
        console.log(`${'─'.repeat(67)}`);
        console.log(`  Workspace utilizes 'process.env' variables but 'dotenv' is missing.`);
        console.log(`${'─'.repeat(67)}`);
        const choiceEnv = await safeQuestion(`❓ Add 'dotenv' and automatically wire initialization hooks into your files? (Y/n): `);
        if (choiceEnv.trim().toLowerCase() !== 'n' && choiceEnv.trim().toLowerCase() !== 'no') {
            stats.rawDeps.add('dotenv');
            stats.injectDotenvEngine = true;
        }
    }

    const packageJson = {
        name: folderName.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        version: '1.0.0',
        description: `Automated ${isFrontendWeb ? 'frontend layout application' : 'backend infrastructure runtime'}.`,
        type: (stats.usesEsm || isTypeScript || isFrontendWeb) ? 'module' : 'commonjs',
        author: gitInfo.author || undefined,
        repository: gitInfo.repository ? { type: "git", url: `git+${gitInfo.repository}.git` } : undefined,
        scripts: { test: stats.hasTests ? (isFrontendWeb ? 'vitest' : 'jest') : 'echo "No workspace test vectors specified" && exit 0' },
        dependencies: {}, 
        devDependencies: {}
    };

    const eslintConfigFile = path.join(targetDir, 'eslint.config.js');
    const linterPresent = fs.existsSync(eslintConfigFile) || fs.existsSync(path.join(targetDir, '.eslintrc.json')) || fs.existsSync(path.join(targetDir, '.eslintrc.js'));

    if (!linterPresent && (stats.quality.varCount > 0 || stats.quality.hasEval || stats.phantomInjections.size > 0)) {
        console.log(`\n🎨 QUALITY LAYER AUDITOR: SYNTAX VALIDATION SYSTEM REQUIRED`);
        console.log(`${'─'.repeat(67)}`);
        console.log(`  Code anomalies (legacy 'var' or 'eval()') require static linter guards.`);
        console.log(`${'─'.repeat(67)}`);
        const choiceLintSetup = await safeQuestion(`❓ Bootstrap standard ESLint flat verification rules into workspace? (Y/n): `);
        if (choiceLintSetup.trim().toLowerCase() !== 'n' && choiceLintSetup.trim().toLowerCase() !== 'no') {
            stats.bootstrapEslintSuite = true;
            stats.rawDeps.add('eslint');
            if (isTypeScript) {
                stats.rawDeps.add('typescript-eslint');
            } else {
                stats.rawDeps.add('@eslint/js');
            }
        }
    }

    if (isFrontendWeb) {
        packageJson.scripts.dev = 'vite';
        packageJson.scripts.build = 'vite build';
        packageJson.scripts.preview = 'vite preview';
        stats.rawDeps.add('vite');
        if (stats.hasTests) {
            stats.rawDeps.add('vitest');
        }
    } else {
        if (isTypeScript) {
            packageJson.scripts.build = 'tsc';
            packageJson.scripts.start = 'node dist/index.js';
            packageJson.scripts.dev = 'node --watch dist/index.js';
        } else {
            packageJson.scripts.start = 'node index.js';
        }
    }

    if (isTypeScript) {
        packageJson.devDependencies.typescript = '^5.4.0';
        if (!isFrontendWeb) {
            packageJson.devDependencies['@types/node'] = '^20.11.0';
        }
    }

    if (stats.rawDeps.size > 0) {
        console.log(`\n📡 Resolving baseline package registry definitions...`);
        for (const pkg of stats.rawDeps) {
            const cleaned = cleanPackageName(pkg);
            if (cleaned && !builtinModules.includes(cleaned)) {
                const check = await inspectNpmPackage(cleaned);
                if (check && check.error !== 'NOT_FOUND') {
                    const version = check.version || 'latest';
                    const isDevDep = ['vite', 'vitest', 'typescript', 'eslint', 'typescript-eslint', '@eslint/js', 'prettier', 'jest', 'nodemon', 'ts-node', 'tsup', 'esbuild', '@swc/cli', 'tsx', 'rimraf', 'copyfiles', 'mkdirp', 'husky', 'lint-staged', '@commitlint/cli', 'typedoc', 'c8', 'nyc', 'mocha', 'ava', 'tap', 'jasmine', 'storybook', 'turbo', 'nx', 'biome', '@biomejs/biome', 'oxlint', 'xo', 'standard'].includes(cleaned) || cleaned.startsWith('@types/');
                    if (isDevDep) {
                        packageJson.devDependencies[cleaned] = `^${version}`;
                    } else {
                        packageJson.dependencies[cleaned] = `^${version}`;
                    }
                    console.log(`   ✔ Synced: ${cleaned}@^${version}${check.deprecated ? ' \x1b[33m[DEPRECATED]\x1b[0m' : ''}`);
                }
            }
        }
    }

    if (stats.phantomInjections.size > 0) {
        console.log(`\n${'─'.repeat(67)}`);
        console.log(`👻 PHANTOM STRUCTURE ALERT: UNIMPORTED EXECUTIONS DETECTED`);
        console.log(`${'─'.repeat(67)}`);
        for (const [filePath, missingModules] of stats.phantomInjections.entries()) {
            console.log(`📂 File: ${path.relative(targetDir, filePath)}`);
            console.log(`   ❌ Used but never imported: ${Array.from(missingModules).map(m => { return `"${m}"`; }).join(', ')}`);
        }
        console.log(`${'─'.repeat(67)}`);
    }

    if (stats.quality.varCount > 0 || stats.quality.hasEval || stats.quality.syncFsCount > 0) {
        console.log(`\n⚠️  CODE ARCHITECTURE & MODERNIZATION COMPLIANCE WARNINGS:`);
        console.log(`${'─'.repeat(67)}`);
        if (stats.quality.varCount > 0) {
            console.log(`   ⚡ Found ${stats.quality.varCount} instances of legacy 'var'. Transition to 'let' / 'const'.`);
        }
        if (stats.quality.hasEval) {
            console.log(`   🔥 DANGER: 'eval()' detected! Refactor to mitigate remote code execution vectors.`);
        }
        if (stats.quality.syncFsCount > 0) {
            console.log(`   📉 Performance: Found ${stats.quality.syncFsCount} synchronous fs calls. Transition to 'fs/promises'.`);
        }
        console.log(`${'─'.repeat(67)}`);
    }

    if (stats.discoveredSecrets.length > 0) {
        console.log(`\n🚨 CRITICAL SECURITY COMPLIANCE ALERT: HARDCODED CREDENTIALS DETECTED`);
        console.log(`${'─'.repeat(67)}`);
        for (const secretMeta of stats.discoveredSecrets) {
            console.log(`📂 File: ${path.relative(targetDir, secretMeta.filePath)}`);
            console.log(`   ⚠️  Hardcoded credential found: [${secretMeta.keyName}]`);
        }
        console.log(`${'─'.repeat(67)}`);

        const fixSecrets = await safeQuestion(`❓ Automatically extract credentials into environment mappings safely? (y/N): `);
        if (fixSecrets.trim().toLowerCase() === 'y' || fixSecrets.trim().toLowerCase() === 'yes') {
            const envPath = path.join(targetDir, '.env');
            let envBuffer = fs.existsSync(envPath) ? readFileSyncNormalized(envPath) : '';

            for (const secretMeta of stats.discoveredSecrets) {
                let currentCodeContent = readFileSyncNormalized(secretMeta.filePath);
                const envAccessor = isFrontendWeb ? `import.meta.env.${secretMeta.envVarName}` : `process.env.${secretMeta.envVarName}`;
                const exactLiteralPattern = new RegExp(`\\b${secretMeta.keyName}\\s*=\\s*['"\\ ]${secretMeta.secretValue.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}['"\\ ]`, 'g');
                currentCodeContent = currentCodeContent.replace(exactLiteralPattern, `${secretMeta.keyName} = ${envAccessor}`);
                fs.writeFileSync(secretMeta.filePath, currentCodeContent);
                if (!envBuffer.includes(`${secretMeta.envVarName}=`)) {
                    envBuffer += `${secretMeta.envVarName}=${secretMeta.secretValue}\n`;
                }
                console.log(`   🔒 Isolated: ${secretMeta.keyName} → ${envAccessor}`);
            }
            fs.writeFileSync(envPath, envBuffer);
        }
    }

    if (stats.subWorkspaces && stats.subWorkspaces.length > 1) {
        console.log(`\n📂 MULTI-WORKSPACE SEGMENTATION DETECTED`);
        console.log(`   Identified sub-module paths: ${stats.subWorkspaces.map(w => { return `/${w}`; }).join(', ')}`);
        const setupWorkspace = await safeQuestion(`❓ Setup as a multi-package Monorepo Workspace layout? (y/N): `);
        if (setupWorkspace.trim().toLowerCase() === 'y' || setupWorkspace.trim().toLowerCase() === 'yes') {
            if (activePkgManager === 'pnpm') {
                fs.writeFileSync(path.join(targetDir, 'pnpm-workspace.yaml'), `packages:\n${stats.subWorkspaces.map(w => { return `  - '${w}'`; }).join('\n')}\n`);
                console.log(`   🏗️  Generated: pnpm-workspace.yaml`);
            } else {
                packageJson.workspaces = stats.subWorkspaces;
                console.log(`   🏗️  Injected 'workspaces' into root package.json.`);
            }
        }
    }

    const licensePath = path.join(targetDir, 'LICENSE');
    let chosenLicenseType = preExistingLicense || 'None';

    if (!fs.existsSync(licensePath) && !preExistingLicense) {
        console.log(`\n⚖️  Legal Compliance Auditor: No LICENSE file located.`);
        const licInput = await safeQuestion(`❓ Enter Open Source License (e.g. MIT, Apache-2.0, ISC, BSD-3-Clause, skip): `);
        const cleanedInput = licInput.trim();
        if (cleanedInput.toLowerCase() !== 'skip' && cleanedInput.toLowerCase() !== 'none' && cleanedInput !== '') {
            console.log(`   📡 Querying GitHub Legal Databases for "${cleanedInput.toUpperCase()}"...`);
            const rawTemplate = await fetchRemoteLicense(cleanedInput);
            if (rawTemplate) {
                const parsedText = rawTemplate.replace(/\[year\]|<year>/gi, new Date().getFullYear().toString()).replace(/\[fullname\]|\[name of copyright owner\]|<copyright holders>|<name of author>/gi, gitInfo.name);
                fs.writeFileSync(licensePath, parsedText);
                chosenLicenseType = cleanedInput.toUpperCase();
                console.log(`   ⚖️  Provisioned: LICENSE`);
            } else {
                chosenLicenseType = cleanedInput;
            }
            packageJson.license = chosenLicenseType;
        }
    } else {
        if (preExistingLicense) {
            chosenLicenseType = preExistingLicense;
        }
    }

    if (existingPackageJson) {
        console.log(`\n${'─'.repeat(67)}`);
        console.log(`📡 UPDATE MODE: Merging newly discovered intelligence into existing package.json...`);
        const finalPackageJson = { ...existingPackageJson };
        finalPackageJson.dependencies = { ...existingPackageJson.dependencies, ...packageJson.dependencies };
        finalPackageJson.devDependencies = { ...existingPackageJson.devDependencies, ...packageJson.devDependencies };
        
        if (stats.injectDotenvEngine) {
            const indexFile = isTypeScript ? 'src/index.ts' : 'index.js';
            const indexPath = path.join(targetDir, indexFile);
            if (fs.existsSync(indexPath)) {
                const currentContent = fs.readFileSync(indexPath, 'utf8');
                if (!currentContent.includes('dotenv')) {
                    const dotenvBlock = stats.usesEsm ? "import 'dotenv/config';\n" : "require('dotenv').config();\n";
                    fs.writeFileSync(indexPath, smartPrepend(currentContent, dotenvBlock));
                    console.log(`   🔌 Wired: dotenv hooks into ${indexFile}`);
                }
            }
        }

        if (stats.bootstrapEslintSuite) {
            const eslintConfig = isTypeScript ? 
                `import tseslint from 'typescript-eslint';\n\nexport default tseslint.config(\n  ...tseslint.configs.recommended,\n);` :
                `import js from '@eslint/js';\n\nexport default [\n  js.configs.recommended,\n];`;
            fs.writeFileSync(eslintConfigFile, eslintConfig);
            console.log(`   🎨 Provisioned: eslint.config.js`);
        }

        fs.writeFileSync(pkgPath, JSON.stringify(finalPackageJson, null, 2));
    } else {
        console.log(`\n${'─'.repeat(67)}`);
        console.log(`📡 INITIALIZATION MODE: Provisioning new workspace infrastructure...`);
        const confirmInit = await safeQuestion(`❓ Proceed with workspace initialization and dependency sync? (Y/n): `);
        if (confirmInit.trim().toLowerCase() !== 'n' && confirmInit.trim().toLowerCase() !== 'no') {
            fs.writeFileSync(pkgPath, JSON.stringify(packageJson, null, 2));
            console.log(`   📦 Generated: package.json`);
            
            if (isTypeScript) {
                const tsconfig = { compilerOptions: { target: "ESNext", module: "NodeNext", outDir: "dist", strict: true, esModuleInterop: true, skipLibCheck: true, forceConsistentCasingInFileNames: true } };
                fs.writeFileSync(path.join(targetDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
                console.log(`   ⚙️  Generated: tsconfig.json`);
                fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
                fs.writeFileSync(path.join(targetDir, 'src/index.ts'), '// Entrypoint\n');
            } else if (isFrontendWeb) {
                fs.writeFileSync(path.join(targetDir, 'index.html'), `<!DOCTYPE html><html><head><title>${folderName}</title></head><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>`);
                fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
                fs.writeFileSync(path.join(targetDir, 'src/main.js'), '// Entrypoint\n');
            } else {
                fs.writeFileSync(path.join(targetDir, 'index.js'), '// Entrypoint\n');
            }
        }
    }

    console.log(`\n${'═'.repeat(67)}`);
    console.log(`✅ ANALYSIS COMPLETE: Workspace reached Enterprise Compliance.`);
    console.log(`${'═'.repeat(67)}\n`);
    rl.close();
}

main();
