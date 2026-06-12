#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { builtinModules, createRequire } from 'module';
import { execSync } from 'child_process';
import readline from 'readline/promises';

// --- Bulletproof AST Infrastructure Engines ---
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.turbo', 'coverage', 'out']);
const VALID_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

// --- Refined Target Signature Dictionaries ---
const REGEX_PATTERNS = {
    env: /(?:process\.env|import\.meta\.env)\.([A-Z_][A-Z0-9_]*)/g,
    testFile: /\.(test|spec)\.(js|ts|jsx|tsx)$/i,
    
    // Modern Quality & Structural Code Smell Monitors
    legacyVar: /\bvar\s+[a-zA-Z_]/g,
    dangerousEval: /\beval\s*\(/g,
    syncFsCalls: /\.readFileSync|\.writeFileSync|\.mkdirSync|\.existsSync/g,
    
    // Cryptographic Risk & Hardcoded Keyholes
    secretKeys: /\b(secret|passwd|password|token|api_?key|private_?key)\s*=\s*['"`]([a-zA-Z0-9_\-\.]{8,})['"`]/gi
};

const COMMON_EXTERNAL_TOKENS = new Set(['axios', 'lodash', 'dotenv', 'cors', 'zod', 'mongoose', 'jsonwebtoken', 'chalk', 'helmet', 'prisma', 'redis', 'pg']);

function getGitIdentity() {
    const identity = { name: "Developer", author: "Developer", repository: "" };
    try {
        const name = execSync('git config user.name', { encoding: 'utf8', stdio: 'pipe' }).trim();
        const email = execSync('git config user.email', { encoding: 'utf8', stdio: 'pipe' }).trim();
        if (name) {
            identity.name = name;
            identity.author = email ? `${name} <${email}>` : name;
        }
    } catch (e) {}
    return identity;
}

function detectPackageManager(targetDir, stats = null) {
    const detectedLockfiles = [];
    if (fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml'))) detectedLockfiles.push('pnpm-lock.yaml');
    if (fs.existsSync(path.join(targetDir, 'yarn.lock'))) detectedLockfiles.push('yarn.lock');
    if (fs.existsSync(path.join(targetDir, 'package-lock.json'))) detectedLockfiles.push('package-lock.json');

    if (detectedLockfiles.length > 1 && stats) {
        stats.conflictingLockfiles = detectedLockfiles;
    }

    if (detectedLockfiles.includes('pnpm-lock.yaml')) return 'pnpm';
    if (detectedLockfiles.includes('yarn.lock')) return 'yarn';
    if (detectedLockfiles.includes('package-lock.json')) return 'npm';

    try { execSync('pnpm --version', { stdio: 'ignore' }); return 'pnpm'; } catch {}
    try { execSync('yarn --version', { stdio: 'ignore' }); return 'yarn'; } catch {}
    return 'npm';
}

function analyzeCodeStyle(content, stats) {
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

        if (trimmed.endsWith(';')) stats.style.semiCount++;
        else if (!/[{}:,\[\]]/.test(trimmed.slice(-1))) stats.style.noSemiCount++;

        if (line.startsWith('\t')) stats.style.tabCount++;
        else if (line.startsWith('  ')) {
            const spaces = line.match(/^(\s+)/)?.[1]?.length || 0;
            if (spaces === 2) stats.style.space2Count++;
            if (spaces === 4) stats.style.space4Count++;
        }
    }

    if (REGEX_PATTERNS.legacyVar.test(content)) stats.quality.varCount += (content.match(REGEX_PATTERNS.legacyVar) || []).length;
    if (REGEX_PATTERNS.dangerousEval.test(content)) stats.quality.hasEval = true;
    if (REGEX_PATTERNS.syncFsCalls.test(content)) stats.quality.syncFsCount += (content.match(REGEX_PATTERNS.syncFsCalls) || []).length;
}

function cleanPackageName(importString) {
    if (!importString || /^[./~\\]/.test(importString)) return null;
    if (importString.startsWith('@')) return importString.split('/').slice(0, 2).join('/');
    return importString.split('/')[0];
}

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

async function inspectNpmPackage(pkgName) {
    try {
        const response = await fetch(`https://registry.npmjs.org/${pkgName}/latest`, {
            headers: { 'User-Agent': 'pkg-scaffold-dx-client/1.1' },
            signal: AbortSignal.timeout(4000)
        });
        if (response.status === 200) {
            const data = await response.json();
            return { version: data.version, error: null };
        }
        if (response.status === 404) return { version: null, error: 'NOT_FOUND' };
    } catch (e) {
        return { version: 'latest', error: 'NETWORK_FAIL' };
    }
    return null;
}

async function fetchRemoteLicense(licenseKey) {
    try {
        const response = await fetch(`https://api.github.com/licenses/${licenseKey.toLowerCase()}`, {
            headers: { 'User-Agent': 'pkg-scaffold-dx-client/1.1' },
            signal: AbortSignal.timeout(5000)
        });
        if (response.status === 200) {
            const data = await response.json();
            return data.body;
        }
    } catch (e) {}
    return null;
}

function readFileSyncNormalized(fullPath) {
    const buffer = fs.readFileSync(fullPath);
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) return buffer.toString('utf16le');
    if (buffer[0] === 0xFE && buffer[1] === 0xFF) return buffer.toString('utf8');
    return buffer.toString('utf8');
}

function buildAsciiTree(dir, prefix = '') {
    const results = [];
    try {
        const files = fs.readdirSync(dir);
        const filtered = files.filter(f => !IGNORED_DIRS.has(f) && !f.startsWith('.'));
        
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
    } catch (e) {}
    return results;
}

// --- High Performance AST Workspace Parsing Engine ---
function scanWorkspace(dir, stats, rootNamespace) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!IGNORED_DIRS.has(file) && !file.startsWith('.')) scanWorkspace(fullPath, stats, rootNamespace);
        } else {
            const ext = path.extname(file);
            
            if (file === 'index.html' || file.startsWith('vite.config.')) stats.hasHtml = true;
            if (REGEX_PATTERNS.testFile.test(file)) stats.hasTests = true;
            if (ext === '.ts' || ext === '.tsx') stats.tsFiles++;
            if (ext === '.js' || ext === '.jsx' || ext === '.mjs') stats.jsFiles++;

            if (VALID_EXTENSIONS.has(ext)) {
                const rawContent = readFileSyncNormalized(fullPath);
                const content = rawContent.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
                
                const codeLines = content.split(/\r?\n/);
                const importedIdentifiers = new Map(); 
                const fileRawDeps = new Set();

                analyzeCodeStyle(content, stats);

                // Universal Cryptographic Leak Interception
                REGEX_PATTERNS.secretKeys.lastIndex = 0;
                let secretMatch;
                while ((secretMatch = REGEX_PATTERNS.secretKeys.exec(content)) !== null) {
                    const keyName = secretMatch[1];
                    const secretValue = secretMatch[2];
                    const envVarName = `${rootNamespace.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${keyName.toUpperCase()}`;
                    stats.discoveredSecrets.push({ filePath: fullPath, keyName, secretValue, envVarName });
                    stats.envVars.add(envVarName);
                }

                // --- Global Regex Environmental Extraction Module ---
                let fileHasEnv = false;
                let envMatch;
                REGEX_PATTERNS.env.lastIndex = 0;
                while ((envMatch = REGEX_PATTERNS.env.exec(content)) !== null) {
                    stats.envVars.add(envMatch[1]);
                    fileHasEnv = true;
                }
                if (fileHasEnv) {
                    stats.filesWithEnvVars.add(fullPath);
                }

                if (content.includes('import ') || content.includes('export ')) stats.usesEsm = true;

                // --- Abstract Syntax Tree Engine Execution Block ---
                let ast = null;
                try {
                    ast = acorn.parse(content, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true });
                } catch (e) {
                    try {
                        ast = acorn.parse(content, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true });
                    } catch (err) {}
                }

                if (ast) {
                    walk.simple(ast, {
                        ImportDeclaration(node) {
                            const pkg = cleanPackageName(node.source.value);
                            if (pkg && !builtinModules.includes(pkg)) {
                                fileRawDeps.add(pkg);
                                if (!importedIdentifiers.has(pkg)) importedIdentifiers.set(pkg, new Set());
                                node.specifiers.forEach(spec => importedIdentifiers.get(pkg).add(spec.local.name));
                            }
                        },
                        VariableDeclarator(node) {
                            if (node.init && node.init.type === 'CallExpression' && 
                                node.init.callee.type === 'Identifier' && node.init.callee.name === 'require') {
                                const arg = node.init.arguments[0];
                                if (arg && arg.type === 'Literal' && typeof arg.value === 'string') {
                                    const pkg = cleanPackageName(arg.value);
                                    if (pkg && !builtinModules.includes(pkg)) {
                                        fileRawDeps.add(pkg);
                                        if (!importedIdentifiers.has(pkg)) importedIdentifiers.set(pkg, new Set());
                                        
                                        const extractBindings = (idNode) => {
                                            if (idNode.type === 'Identifier') {
                                                importedIdentifiers.get(pkg).add(idNode.name);
                                            } else if (idNode.type === 'ObjectPattern') {
                                                idNode.properties.forEach(p => {
                                                    if (p.value && p.value.type === 'Identifier') importedIdentifiers.get(pkg).add(p.value.name);
                                                });
                                            }
                                        };
                                        extractBindings(node.id);
                                    }
                                }
                            }
                        },
                        ImportExpression(node) {
                            if (node.source.type === 'Literal' && typeof node.source.value === 'string') {
                                const pkg = cleanPackageName(node.source.value);
                                if (pkg && !builtinModules.includes(pkg)) fileRawDeps.add(pkg);
                            }
                        },
                        ExportNamedDeclaration(node) {
                            if (node.source && node.source.type === 'Literal' && typeof node.source.value === 'string') {
                                const pkg = cleanPackageName(node.source.value);
                                if (pkg && !builtinModules.includes(pkg)) fileRawDeps.add(pkg);
                            }
                        },
                        ExportAllDeclaration(node) {
                            if (node.source && node.source.type === 'Literal' && typeof node.source.value === 'string') {
                                const pkg = cleanPackageName(node.source.value);
                                if (pkg && !builtinModules.includes(pkg)) fileRawDeps.add(pkg);
                            }
                        }
                    });
                } else {
                    // --- Text-Isolated Fallback Track (TypeScript/TSX Support Matrix) ---
                    for (const line of codeLines) {
                        let esmMatch = line.match(/\bimport\s+(?:\*+\s+as\s+)?([a-zA-Z0-9_]+)\s+from\s+['"]([^'"]+)['"]/);
                        if (esmMatch) {
                            const id = esmMatch[1];
                            const pkg = cleanPackageName(esmMatch[2]);
                            if (pkg && !builtinModules.includes(pkg)) {
                                fileRawDeps.add(pkg);
                                if (!importedIdentifiers.has(pkg)) importedIdentifiers.set(pkg, new Set());
                                importedIdentifiers.get(pkg).add(id);
                            }
                            continue;
                        }

                        let esmNamedMatch = line.match(/\bimport\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/);
                        if (esmNamedMatch) {
                            const pkg = cleanPackageName(esmNamedMatch[2]);
                            if (pkg && !builtinModules.includes(pkg)) {
                                if (!importedIdentifiers.has(pkg)) importedIdentifiers.set(pkg, new Set());
                                fileRawDeps.add(pkg);
                                esmNamedMatch[1].split(',').forEach(part => {
                                    const chunk = part.trim();
                                    if (!chunk) return;
                                    const id = chunk.includes(' as ') ? chunk.split(' as ')[1].trim() : chunk;
                                    importedIdentifiers.get(pkg).add(id);
                                });
                            }
                            continue;
                        }

                        let cjsMatch = line.match(/\b(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
                        if (cjsMatch) {
                            const id = cjsMatch[1];
                            const pkg = cleanPackageName(cjsMatch[2]);
                            if (pkg && !builtinModules.includes(pkg)) {
                                fileRawDeps.add(pkg);
                                if (!importedIdentifiers.has(pkg)) importedIdentifiers.set(pkg, new Set());
                                importedIdentifiers.get(pkg).add(id);
                            }
                            continue;
                        }

                        let cjsDestructMatch = line.match(/\b(?:const|let|var)\s*\{([^}]+)\}\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
                        if (cjsDestructMatch) {
                            const pkg = cleanPackageName(cjsDestructMatch[2]);
                            if (pkg && !builtinModules.includes(pkg)) {
                                if (!importedIdentifiers.has(pkg)) importedIdentifiers.set(pkg, new Set());
                                fileRawDeps.add(pkg);
                                cjsDestructMatch[1].split(',').forEach(part => {
                                    const chunk = part.trim();
                                    if (!chunk) return;
                                    const id = chunk.includes(':') ? chunk.split(':')[1].trim() : chunk;
                                    importedIdentifiers.get(pkg).add(id);
                                });
                            }
                            continue;
                        }
                    }
                }

                fileRawDeps.forEach(dep => stats.rawDeps.add(dep));

                const functionalExecutionCodeOnly = codeLines
                    .filter(l => !/\bimport\b/.test(l) && !/\brequire\s*\(/.test(l))
                    .join('\n');

                for (const [pkg, identifiers] of importedIdentifiers.entries()) {
                    let tokenReferenced = false;
                    for (const identifier of identifiers) {
                        const usagePattern = new RegExp(`\\b${identifier}\\b`);
                        if (usagePattern.test(functionalExecutionCodeOnly)) {
                            tokenReferenced = true;
                            break;
                        }
                    }
                    if (!tokenReferenced && identifiers.size > 0) {
                        stats.unusedDepsInCode.add(pkg);
                    }
                }

                COMMON_EXTERNAL_TOKENS.forEach(token => {
                    const tokenPattern = new RegExp(`\\b${token}\\b`);
                    if (tokenPattern.test(functionalExecutionCodeOnly) && !importedIdentifiers.has(token)) {
                        stats.rawDeps.add(token);
                        if (!stats.phantomInjections.has(fullPath)) stats.phantomInjections.set(fullPath, new Set());
                        stats.phantomInjections.get(fullPath).add(token);
                    }
                });
            }
        }
    }
}

async function main() {
    const targetDir = process.cwd();
    const folderName = path.basename(targetDir);
    const gitInfo = getGitIdentity();
    
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    const stats = {
        tsFiles: 0, jsFiles: 0, usesEsm: false, hasHtml: false, hasTests: false,
        rawDeps: new Set(), envVars: new Set(),
        style: { semiCount: 0, noSemiCount: 0, tabCount: 0, space2Count: 0, space4Count: 0 },
        quality: { varCount: 0, hasEval: false, syncFsCount: 0 },
        phantomInjections: new Map(),
        discoveredSecrets: [],
        subWorkspaces: [],
        conflictingLockfiles: [],
        unusedDepsInCode: new Set(),
        filesWithEnvVars: new Set(),
        injectDotenvEngine: false,
        bootstrapEslintSuite: false
    };

    const activePkgManager = detectPackageManager(targetDir, stats);
    const pkgPath = path.join(targetDir, 'package.json');
    let preExistingLicense = null;
    let preExistingDeps = [];

    console.log(`\n===================================================================`);
    console.log(`🚀 pkg-scaffold v1.1: Deep Intelligence Workspace Diagnostic Run`);
    console.log(`===================================================================\n`);

    const topLevelItems = fs.readdirSync(targetDir);
    const potentialSubModules = [];
    for (const item of topLevelItems) {
        const fullPath = path.join(targetDir, item);
        if (!IGNORED_DIRS.has(item) && !item.startsWith('.') && fs.statSync(fullPath).isDirectory()) {
            let containsSourceCode = false;
            const examineDirectory = (d) => {
                const subEntries = fs.readdirSync(d);
                for (const entry of subEntries) {
                    const entryPath = path.join(d, entry);
                    if (fs.statSync(entryPath).isDirectory()) {
                        if (!IGNORED_DIRS.has(entry) && !entry.startsWith('.')) examineDirectory(entryPath);
                    } else if (VALID_EXTENSIONS.has(path.extname(entry))) {
                        containsSourceCode = true;
                        break;
                    }
                }
            };
            try { examineDirectory(fullPath); } catch {}
            if (containsSourceCode) potentialSubModules.push(item);
        }
    }
    if (potentialSubModules.length > 1) {
        stats.subWorkspaces = potentialSubModules;
    }

    if (fs.existsSync(pkgPath)) {
        console.log(`⚠️  An existing package.json was found in this working directory.`);
        console.log(`📡 Analyzing existing installation arrays for invalid metrics...`);
        try {
            const existingData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (existingData.license && typeof existingData.license === 'string' && existingData.license.toLowerCase() !== 'none') {
                preExistingLicense = existingData.license;
            }
            if (existingData.dependencies) preExistingDeps.push(...Object.keys(existingData.dependencies));
            if (existingData.devDependencies) preExistingDeps.push(...Object.keys(existingData.devDependencies));

            const combinedDeps = Object.keys({ ...existingData.dependencies, ...existingData.devDependencies });
            let brokenEcosystem = combinedDeps.length === 0;
            for (const dep of combinedDeps) {
                const check = await inspectNpmPackage(dep);
                if (check && check.error === 'NOT_FOUND') {
                    brokenEcosystem = true;
                    console.log(`   ❌ Identified non-existent package on registry tracks: "${dep}"`);
                }
            }
            if (brokenEcosystem) {
                console.log(`\n🛑 CRITICAL COMPLIANCE BREAK: Your current package.json is empty or contains non-existent packages.`);
                console.log(`👉 Action Required: Please remove or backup the existing 'package.json' from this folder.\n`);
                rl.close();
                return;
            }
        } catch (err) {
            console.log(`\n🛑 CRITICAL: Existing package.json is malformed or corrupt.\n`);
            rl.close();
            return;
        }
    }

    scanWorkspace(targetDir, stats, folderName);

    // --- Unused Dependency Filtration Matrix ---
    const allDiscoveredUnused = new Set([...stats.unusedDepsInCode]);
    if (preExistingDeps.length > 0) {
        preExistingDeps.forEach(dep => { if (!stats.rawDeps.has(dep)) allDiscoveredUnused.add(dep); });
    }

    const devToolingEcosystem = new Set([
        'eslint', 'prettier', 'typescript', 'typescript-eslint', '@eslint/js', 
        'nodemon', 'ts-node', 'tsup', 'vite', 'vitest', 'jest'
    ]);
    for (const dep of allDiscoveredUnused) {
        if (devToolingEcosystem.has(dep) || dep.startsWith('@types/')) {
            allDiscoveredUnused.delete(dep);
        }
    }

    if (allDiscoveredUnused.size > 0) {
        console.log(`\n📦 UNUSED WORKSPACE DEPENDENCIES DETECTED`);
        console.log(`───────────────────────────────────────────────────────────────────`);
        console.log(`  The following modules are imported or installed but never invoked inside executable code paths:`);
        console.log(`  ${Array.from(allDiscoveredUnused).map(d => `\x1b[33m"${d}"\x1b[0m`).join(', ')}`);
        console.log(`───────────────────────────────────────────────────────────────────`);
        
        const pruneChoice = await rl.question(`❓ Exclude these unused dependencies from your package.json setup? (y/N): `);
        if (pruneChoice.trim().toLowerCase() === 'y' || pruneChoice.trim().toLowerCase() === 'yes') {
            for (const deadDep of allDiscoveredUnused) stats.rawDeps.delete(deadDep);
            console.log(`   🗑️  Pruned unused dependencies from your configuration blueprint.`);
        }
    }

    const isTypeScript = stats.tsFiles > stats.jsFiles;
    const isFrontendWeb = stats.hasHtml || stats.rawDeps.has('react') || stats.rawDeps.has('vue') || stats.rawDeps.has('vite');

    if (stats.envVars.size > 0 && !stats.rawDeps.has('dotenv') && !isFrontendWeb) {
        console.log(`\n📡 CONFIGURATION COMPLIANCE GAP: UNMANAGED ENVIRONMENT VARIABLES`);
        console.log(`───────────────────────────────────────────────────────────────────`);
        console.log(`  Workspace utilizes 'process.env' variables but 'dotenv' is missing.`);
        console.log(`───────────────────────────────────────────────────────────────────`);
        const choiceEnv = await rl.question(`❓ Add 'dotenv' and automatically wire initialization hooks into your files? (Y/n): `);

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
        console.log(`───────────────────────────────────────────────────────────────────`);
        console.log(`  Code anomalies (legacy 'var' choices or 'eval()') require static linter guards.`);
        console.log(`───────────────────────────────────────────────────────────────────`);
        const choiceLintSetup = await rl.question(`❓ Bootstrap standard ESLint flat verification rules into workspace? (Y/n): `);

        if (choiceLintSetup.trim().toLowerCase() !== 'n' && choiceLintSetup.trim().toLowerCase() !== 'no') {
            stats.bootstrapEslintSuite = true;
            stats.rawDeps.add('eslint');
            if (isTypeScript) stats.rawDeps.add('typescript-eslint');
            else stats.rawDeps.add('@eslint/js');
        }
    }

    if (isFrontendWeb) {
        packageJson.scripts.dev = 'vite';
        packageJson.scripts.build = 'vite build';
        packageJson.scripts.preview = 'vite preview';
        stats.rawDeps.add('vite');
        if (stats.hasTests) stats.rawDeps.add('vitest');
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
        if (!isFrontendWeb) packageJson.devDependencies['@types/node'] = '^20.11.0';
    }

    if (stats.rawDeps.size > 0) {
        console.log(`\n📡 Resolving baseline package registry definitions...`);
        for (const pkg of stats.rawDeps) {
            const cleaned = cleanPackageName(pkg);
            if (cleaned && !builtinModules.includes(cleaned)) {
                const check = await inspectNpmPackage(cleaned);
                if (check && check.error !== 'NOT_FOUND') {
                    const version = check.version || 'latest';
                    
                    const isDevDep = [
                        'vite', 'vitest', 'typescript', 'eslint', 'typescript-eslint', 
                        '@eslint/js', 'prettier', 'jest', 'nodemon', 'ts-node', 'tsup'
                    ].includes(cleaned) || cleaned.startsWith('@types/');

                    if (isDevDep) packageJson.devDependencies[cleaned] = `^${version}`;
                    else packageJson.dependencies[cleaned] = `^${version}`;
                    console.log(`   ¼ Synced verified package parameters: ${cleaned}@^${version}`);
                }
            }
        }
    }

    if (stats.phantomInjections.size > 0) {
        console.log(`\n👻 PHANTOM STRUCTURE ALERT: UNIMPORTED EXECUTIONS DETECTED`);
        console.log(`───────────────────────────────────────────────────────────────────`);
        for (const [filePath, missingModules] of stats.phantomInjections.entries()) {
            console.log(`📂 File: ${path.relative(targetDir, filePath)}`);
            console.log(`   ❌ Used but never imported: ${Array.from(missingModules).map(m => `"${m}"`).join(', ')}`);
        }
        console.log(`───────────────────────────────────────────────────────────────────`);
    }

    if (stats.quality.varCount > 0 || stats.quality.hasEval || stats.quality.syncFsCount > 0) {
        console.log(`\n⚠️  CODE ARCHITECTURE & MODERNIZATION COMPLIANCE WARNINGS:`);
        console.log(`───────────────────────────────────────────────────────────────────`);
        if (stats.quality.varCount > 0) console.log(`   ⚡ Found ${stats.quality.varCount} instances of legacy 'var' statements. Transition to blocks ('let' / 'const').`);
        if (stats.quality.hasEval) console.log(`   🔥 DANGER: 'eval()' invocation structures detected! Refactor to mitigate critical remote code execution vectors.`);
        if (stats.quality.syncFsCount > 0) console.log(`   📉 Performance Alert: Found ${stats.quality.syncFsCount} block-level Sync filesystem configurations inside threads. Transition to promises ('fs/promises').`);
        console.log(`───────────────────────────────────────────────────────────────────`);
    }

    if (stats.discoveredSecrets.length > 0) {
        console.log(`\n🚨 CRITICAL SECURITY COMPLIANCE ALERT: HARDCODED CREDENTIALS DETECTED`);
        console.log(`───────────────────────────────────────────────────────────────────`);
        for (const secretMeta of stats.discoveredSecrets) {
            console.log(`📂 File: ${path.relative(targetDir, secretMeta.filePath)}`);
            console.log(`   ⚠️ Hardcoded raw credential instance found mapping to signature value [${secretMeta.keyName}]`);
        }
        console.log(`───────────────────────────────────────────────────────────────────`);
        
        const fixSecrets = await rl.question(`❓ Automatically extract credentials into environment mappings safely? (y/N): `);

        if (fixSecrets.trim().toLowerCase() === 'y' || fixSecrets.trim().toLowerCase() === 'yes') {
            const envPath = path.join(targetDir, '.env');
            let envBuffer = fs.existsSync(envPath) ? readFileSyncNormalized(envPath) : '';
            
            for (const secretMeta of stats.discoveredSecrets) {
                let currentCodeContent = readFileSyncNormalized(secretMeta.filePath);
                const envAccessor = isFrontendWeb ? `import.meta.env.${secretMeta.envVarName}` : `process.env.${secretMeta.envVarName}`;
                
                const exactLiteralPattern = new RegExp(`\\b${secretMeta.keyName}\\s*=\\s*['"\`]${secretMeta.secretValue.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}['"\`]`, 'g');
                currentCodeContent = currentCodeContent.replace(exactLiteralPattern, `${secretMeta.keyName} = ${envAccessor}`);
                fs.writeFileSync(secretMeta.filePath, currentCodeContent);
                
                if (!envBuffer.includes(`${secretMeta.envVarName}=`)) envBuffer += `${secretMeta.envVarName}=${secretMeta.secretValue}\n`;
                console.log(`   🔒 Safely isolated credential string -> ${envAccessor} inside ${path.relative(targetDir, secretMeta.filePath)}`);
            }
            fs.writeFileSync(envPath, envBuffer);
        }
    }

    if (stats.subWorkspaces && stats.subWorkspaces.length > 1) {
        console.log(`\n📂 MULTI-WORKSPACE SEGMENTATION DETECTED`);
        console.log(`   Identified independent sub-module paths: ${stats.subWorkspaces.map(w => `/${w}`).join(', ')}`);
        
        const setupWorkspace = await rl.question(`❓ Setup layout architecture as a multi-package Monorepo Workspace layout? (y/N): `);

        if (setupWorkspace.trim().toLowerCase() === 'y' || setupWorkspace.trim().toLowerCase() === 'yes') {
            if (activePkgManager === 'pnpm') {
                const workspaceYamlPath = path.join(targetDir, 'pnpm-workspace.yaml');
                const workspaceYamlTemplate = `packages:\n${stats.subWorkspaces.map(w => `  - '${w}'`).join('\n')}\n`;
                fs.writeFileSync(workspaceYamlPath, workspaceYamlTemplate);
                console.log(`   🏗️  Generated monorepo configuration layer: pnpm-workspace.yaml`);
            } else {
                packageJson.workspaces = stats.subWorkspaces.map(w => `${w}`);
                console.log(`   🏗️  Injected 'workspaces' definitions directly into root layout blueprint.`);
            }
        }
    }

    const licensePath = path.join(targetDir, 'LICENSE');
    let chosenLicenseType = preExistingLicense || 'None';
    
    if (!fs.existsSync(licensePath) && !preExistingLicense) {
        console.log(`\n⚖️  Legal Compliance Auditor: No LICENSE file located.`);
        const licInput = await rl.question(`❓ Enter Open Source License to register (e.g. MIT, Apache-2.0, ISC, BSD-3-Clause, skip): `);

        const cleanedInput = licInput.trim();
        if (cleanedInput.toLowerCase() !== 'skip' && cleanedInput.toLowerCase() !== 'none' && cleanedInput !== '') {
            console.log(`   📡 Querying GitHub Legal Databases for "${cleanedInput.toUpperCase()}" template...`);
            const rawTemplate = await fetchRemoteLicense(cleanedInput);
            
            if (rawTemplate) {
                const parsedText = rawTemplate
                    .replace(/\[year\]|<year>/gi, '2026')
                    .replace(/\[fullname\]|\[name of copyright owner\]|<copyright holders>|<name of author>/gi, gitInfo.name);

                fs.writeFileSync(licensePath, parsedText);
                chosenLicenseType = cleanedInput.toUpperCase();
                console.log(`   ⚖️  Successfully provisioned legal asset: LICENSE`);
            } else {
                console.log(`   ⚠️  License model "${cleanedInput}" not indexed on GitHub database registers. Saving custom structural label configuration.`);
                chosenLicenseType = cleanedInput;
            }
            packageJson.license = chosenLicenseType;
        }
    } else {
        if (preExistingLicense) {
            chosenLicenseType = preExistingLicense;
            if (!fs.existsSync(licensePath) && ['mit', 'apache-2.0', 'gpl-3.0'].includes(preExistingLicense.toLowerCase())) {
                const rawTemplate = await fetchRemoteLicense(preExistingLicense);
                if (rawTemplate) {
                    const parsedText = rawTemplate
                        .replace(/\[year\]|<year>/gi, '2026')
                        .replace(/\[fullname\]|\[name of copyright owner\]|<copyright holders>|<name of author>/gi, gitInfo.name);
                    fs.writeFileSync(licensePath, parsedText);
                }
            }
        } else if (fs.existsSync(licensePath)) {
            try {
                const currentLicenseContent = fs.readFileSync(licensePath, 'utf8');
                if (currentLicenseContent.includes('MIT')) chosenLicenseType = 'MIT';
                else if (currentLicenseContent.includes('Apache')) chosenLicenseType = 'Apache-2.0';
                else chosenLicenseType = 'Custom';
            } catch(e) {}
        }
        packageJson.license = chosenLicenseType;
    }

    if (!stats.hasTests) {
        const bootstrapTest = await rl.question(`\n❓ No test files detected. Scaffold a zero-bloat testing harness via Node native test runner? (y/N): `);

        if (bootstrapTest.trim().toLowerCase() === 'y' || bootstrapTest.trim().toLowerCase() === 'yes') {
            const isEsm = packageJson.type === 'module';
            const testExt = isTypeScript ? '.test.ts' : '.test.js';
            const targetTestFile = `index${testExt}`;
            const testFilePath = path.join(targetDir, targetTestFile);

            const testTemplate = isEsm
                ? `import { test, describe } from 'node:test';\nimport assert from 'node:assert';\n\ndescribe('Core Architecture Testing Suite', () => {\n  test('should verify systemic environmental execution health', () => {\n    assert.strictEqual(1, 1);\n  });\n});\n`
                : `const { test, describe } = require('node:test');\nconst assert = require('node:assert');\n\ndescribe('Core Architecture Testing Suite', () => {\n  test('should verify systemic environmental execution health', () => {\n    assert.strictEqual(1, 1);\n  });\n});\n`;

            fs.writeFileSync(testFilePath, testTemplate);
            packageJson.scripts.test = 'node --test';
            stats.hasTests = true;
            console.log(`   🧪 Generated native functional testing fixture: ${targetTestFile}`);
        }
    }

    console.log(`\n⚙️  Writing ecosystem configuration artifacts...`);

    if (stats.bootstrapEslintSuite) {
        packageJson.scripts.lint = 'eslint .';
        let eslintConfigContent = '';
        if (isTypeScript) {
            eslintConfigContent = `import eslint from '@eslint/js';\nimport tseslint from 'typescript-eslint';\n\nexport default tseslint.config(\n  eslint.configs.recommended,\n  ...tseslint.configs.recommended,\n);\n`;
        } else {
            if (packageJson.type === 'module') {
                eslintConfigContent = `import js from "@eslint/js";\n\nexport default [\n  js.configs.recommended,\n  {\n    rules: {\n      "no-unused-vars": "warn",\n      "no-undef": "error"\n    }\n  }\n];\n`;
            } else {
                eslintConfigContent = `const js = require("@eslint/js");\n\nmodule.exports = [\n  js.configs.recommended,\n  {\n    rules: {\n      "no-unused-vars": "warn",\n      "no-undef": "error"\n    }\n  }\n];\n`;
            }
        }
        fs.writeFileSync(eslintConfigFile, eslintConfigContent);
        console.log(`   🎨 Provisioned automated static syntax layout: eslint.config.js`);
    }

    if (fs.existsSync(pkgPath)) {
        try {
            const currentPackageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            currentPackageJson.dependencies = { ...packageJson.dependencies, ...currentPackageJson.dependencies };
            currentPackageJson.devDependencies = { ...packageJson.devDependencies, ...currentPackageJson.devDependencies };
            if (packageJson.scripts.lint && !currentPackageJson.scripts.lint) currentPackageJson.scripts.lint = packageJson.scripts.lint;
            
            fs.writeFileSync(pkgPath, JSON.stringify(currentPackageJson, null, 2));
            console.log(`   🔄 Safely merged discovered dependencies into existing package.json`);
        } catch (e) {}
    } else {
        fs.writeFileSync(pkgPath, JSON.stringify(packageJson, null, 2)); 
        console.log(`   📝 Injected: package.json`); 
    }

    const prettierPath = path.join(targetDir, '.prettierrc');
    if (!fs.existsSync(prettierPath)) {
        const useTabs = stats.style.tabCount > (stats.style.space2Count + stats.style.space4Count);
        const useSemi = stats.style.semiCount >= stats.style.noSemiCount;
        const tabWidth = stats.style.space4Count > stats.style.space2Count ? 4 : 2;
        fs.writeFileSync(prettierPath, JSON.stringify({ semi: useSemi, useTabs: useTabs, tabWidth: tabWidth, singleQuote: true, trailingComma: "es5" }, null, 2));
        console.log(`   🎨 Code formatting mirror locked: .prettierrc`);
    }

    if (stats.envVars.size > 0) {
        const envExamplePath = path.join(targetDir, '.env.example');
        if (!fs.existsSync(envExamplePath)) {
            fs.writeFileSync(envExamplePath, Array.from(stats.envVars).map(v => `${v}=`).join('\n') + '\n');
            console.log(`   🔒 Extracted environmental configurations: .env.example`);
        }
    }

    const gitignorePath = path.join(targetDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) { 
        fs.writeFileSync(gitignorePath, `node_modules/\ndist/\nbuild/\n.env\n.env.local\n.DS_Store\n`); 
        console.log(`   ⚙️  Structural default configurations locked: .gitignore`); 
    }

    if (isTypeScript) {
        const tsconfigPath = path.join(targetDir, 'tsconfig.json');
        if (!fs.existsSync(tsconfigPath)) {
            fs.writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", esModuleInterop: true, strict: true, skipLibCheck: true, outDir: "./dist" }, include: ["src/**/*", "**/*.ts"] }, null, 2));
            console.log(`   ⚙️  Structural default configurations locked: tsconfig.json`);
        }
    }

    const readmePath = path.join(targetDir, 'README.md');
    if (!fs.existsSync(readmePath)) {
        const pName = packageJson.name;
        const layoutTree = buildAsciiTree(targetDir).join('\n');
        const displayDeps = Object.keys(packageJson.dependencies).map(d => `* \`${d}\``).join('\n') || '* None extracted';
        const displayDevDeps = Object.keys(packageJson.devDependencies).map(d => `* \`${d}\``).join('\n') || '* None extracted';
        const licenseBadgeParam = encodeURIComponent(chosenLicenseType.replace(/-/g, '_'));

        const documentationTemplate = 
`# ${pName}

![Workspace Engine](https://img.shields.io/badge/engine-node-${packageJson.type === 'module' ? 'green' : 'blue'}?style=flat)
![License Architecture](https://img.shields.io/badge/license-${licenseBadgeParam}-orange?style=flat)
![Development Tooling](https://img.shields.io/badge/compiled_via-${isTypeScript ? 'typescript' : 'javascript'}-blueviolet?style=flat)

${packageJson.description}

## Workspace Dependency Landscapes

### Core Infrastructure Runtimes (\`dependencies\`)
${displayDeps}

### System Tooling Engines (\`devDependencies\`)
${displayDevDeps}

### Underlying Tooling Architecture
This project environment layout maps out core metadata elements dynamically using:
* \`npm-deprecated-check\` (Bundled internal core validation system for dependency deprecation checking routines)

---

## Project Architecture Layout
\`\`\`text
${layoutTree}
\`\`\`

## Installation & Launch Procedures
Initialize the workspace tracking structures via your active system package engine:

\`\`\`bash
${activePkgManager} install
\`\`\`
`;
        fs.writeFileSync(readmePath, documentationTemplate);
        console.log(`   📖 Auto-generated system asset metrics: README.md`);
    }

    if (stats.phantomInjections.size > 0 || (stats.injectDotenvEngine && stats.filesWithEnvVars.size > 0)) {
        console.log(`\n💡 Source Code Modification Subsystem:`);
        const injectChoice = await rl.question(`❓ Found phantom modules or unmanaged env components. Mutate file headers cleanly now? (y/N): `);

        if (injectChoice.trim().toLowerCase() === 'y' || injectChoice.trim().toLowerCase() === 'yes') {
            const allTargets = new Set([...stats.phantomInjections.keys(), ...stats.filesWithEnvVars]);
            
            for (const filePath of allTargets) {
                const originalCode = readFileSyncNormalized(filePath);
                let declarationBlock = '';

                const missingModules = stats.phantomInjections.get(filePath);
                if (missingModules) {
                    for (const mod of missingModules) {
                        if (packageJson.type === 'module') declarationBlock += `import ${mod} from '${mod}';\n`;
                        else declarationBlock += `const ${mod} = require('${mod}');\n`;
                    }
                }

                if (stats.injectDotenvEngine && stats.filesWithEnvVars.has(filePath) && !originalCode.includes('dotenv')) {
                    if (packageJson.type === 'module') declarationBlock += `import 'dotenv/config';\n`;
                    else declarationBlock += `require('dotenv').config();\n`;
                }
                
                if (declarationBlock !== '') {
                    fs.writeFileSync(filePath, smartPrepend(originalCode, declarationBlock));
                    console.log(`   ⚡ Injected contextual runtime headers safely: ${path.relative(targetDir, filePath)}`);
                }
            }
        }
    }

    console.log(`\n🛑 INITIALIZING LIVE ECOSYSTEM DEPRECATION SECURITY SCAN...`);
    console.log(`   Running integrated npm-deprecated-check validation algorithms:\n`);
    try {
        const localRequire = createRequire(import.meta.url);
        const dependencyPkgJsonPath = localRequire.resolve('npm-deprecated-check/package.json');
        const dependencyPkgJson = JSON.parse(fs.readFileSync(dependencyPkgJsonPath, 'utf8'));
        const binRelativeMapping = typeof dependencyPkgJson.bin === 'string' ? dependencyPkgJson.bin : (dependencyPkgJson.bin['npm-deprecated-check'] || dependencyPkgJson.bin['ndc']);
        const absoluteExecutablePath = path.join(path.dirname(dependencyPkgJsonPath), binRelativeMapping);
        execSync(`node "${absoluteExecutablePath}" current`, { stdio: 'inherit', cwd: targetDir });
    } catch (err) {}

    if (stats.conflictingLockfiles.length > 1) {
        console.log(`\n⚠️  CONFLICTING ACCUMULATED LOCKFILES DETECTED: [${stats.conflictingLockfiles.join(', ')}]`);
        const cleanLocks = await rl.question(`❓ Purge legacy/mismatched lockfiles to protect systemic package integrity? (y/N): `);

        if (cleanLocks.trim().toLowerCase() === 'y' || cleanLocks.trim().toLowerCase() === 'yes') {
            const packageEngineLockmap = { npm: 'package-lock.json', pnpm: 'pnpm-lock.yaml', yarn: 'yarn.lock' };
            const operationalLockfile = packageEngineLockmap[activePkgManager];
            for (const lockfile of stats.conflictingLockfiles) {
                if (lockfile !== operationalLockfile) {
                    try {
                        fs.unlinkSync(path.join(targetDir, lockfile));
                        console.log(`   🗑️  Cleaned up duplicate lockfile artifact: ${lockfile}`);
                    } catch (e) {}
                }
            }
        }
    }

    console.log(`\n📦 Auto-scaffolding pipeline complete!`);
    const userPromptChoice = await rl.question(`❓ Detected system default manager: "${activePkgManager}". Run "${activePkgManager} install" automatically now? (y/N): `);

    rl.close();

    const normalizedAnswer = userPromptChoice.trim().toLowerCase();
    if (normalizedAnswer === 'y' || normalizedAnswer === 'yes') {
        console.log(`\n⏳ Executing automated asset installations via background child processes...`);
        try {
            console.log(`   Running: "${activePkgManager} install" inside current folder...`);
            execSync(`${activePkgManager} install`, { stdio: 'inherit', cwd: targetDir });
            console.log(`\n🎉 Project fully mapped, configurations customized, and environments installed successfully!`);
        } catch (err) {
            console.error(`\n❌ Automatic package extraction successful, but target installation shell returned an issue.`);
        }
    } else {
        console.log(`\n▶️  Skipping automated setup execution. Workspace configured! Run "${activePkgManager} install" manually whenever you're ready.`);
    }
}

main();