#!/usr/bin/env node

/**
 * ============================================================================
 * 🏁 loui CLI Entry Point
 * ============================================================================
 * Handles option compilation, environment orchestration, option validation,
 * and initiates the primary operational pipeline loop.
 */

import { Command } from 'commander';
import ansis from 'ansis';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import readline from 'readline/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

async function bootstrap() {
  try {
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJsonContent = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    program
      .name('entkapp')
      .description(ansis.cyan('The Ultimate Enterprise Codebase Janitor with OXC integration, type-aware analysis, and automated structural healing.'))
      .version(packageJsonContent.version || '5.3.1');

    program
      .option('-c, --cwd <path>', 'Specify the execution context root directory', process.cwd())
      .option('-d, --debug', 'Developer`s comprehensive telemetry debug diagnostics', false)
      .option('--fix', 'Enable atomic code updates, structural file pruning, and active type sanitization', false)
      .option('--tsconfig <filename>', 'Specify path to custom layout configurations', 'tsconfig.json')
      .option('--test-command <command>', 'Integrated continuous safety test validation script execution path', 'npm test')
      .option('--workspace', 'Enable high-density workspace workspace/monorepo cluster mesh evaluation parsing', false)
      .option('--verbose', 'Toggle expanded trace telemetry for debug operational diagnostics', false)
      .option('--visualize', 'Generate an interactive execution graph visualization', false)
      .option('-r, --run', 'Execute the primary operational pipeline loop', false)
      .option('-y, --yes', 'Skip confirmation prompts and execute planned structural modifications automatically', false)
      .option('--timeout <ms>', 'Set execution timeout in milliseconds', '30000');

    program.parse(process.argv);
    const options = program.opts();

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    // --- Onboarding Check (Skipped in Non-Interactive Mode) ---
    // FIX: Ensure options.cwd is always a string, never undefined
    const targetCwd = path.resolve(options.cwd || process.cwd());
    const pkgJsonPath = path.join(targetCwd, 'package.json');
    const configDirPath = path.join(targetCwd, 'entkapp');

    let pkgJson;
    try {
      pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
    } catch (e) {}

    let configInstalled = false;
    if (!options.yes && !options.run) {
      // 1. Ask to install script
      if (pkgJson && !pkgJson.scripts?.['entkapp:run']) {
        const answer = await rl.question(ansis.bold.yellow('❓ No "entkapp:run" script found in package.json. Install it? (y/n): '));
        if (answer.toLowerCase() === 'y') {
          pkgJson.scripts = pkgJson.scripts || {};
          pkgJson.scripts['entkapp:run'] = 'npx entkapp --fix';
          await fs.writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
          console.log(ansis.green('✅ "entkapp:run" script added to package.json.'));
        }
      }

      // 2. Ask to install config folder
      try {
        await fs.access(configDirPath);
        configInstalled = true;
      } catch (e) {
        const answer = await rl.question(ansis.bold.yellow('❓ No "/entkapp" configuration folder found. Create it with defaults? (y/n): '));
        if (answer.toLowerCase() === 'y') {
          await fs.mkdir(configDirPath, { recursive: true });
          await fs.mkdir(path.join(configDirPath, 'plugins'), { recursive: true });
          const defaultConfig = {
            interface: "CLI",
            useBuiltinPlugins: true,
            useCustomPlugins: true,

            options: { verbose: false, fastMode: true, selfHealing: true },
            enabledPlugins: ["nextjs", "nuxt", "remix", "sveltekit", "astro"]
          };
          await fs.writeFile(path.join(configDirPath, 'config.json'), JSON.stringify(defaultConfig, null, 2));
          console.log(ansis.green('✅ "/entkapp" folder? and default config created.'));
          configInstalled = true;
        }
      }

      if (pkgJson?.scripts?.['entkapp:run'] || configInstalled) {
        console.log(ansis.bold.cyan('\n🚀 Setup complete! To start the engine, run:'));
        console.log(ansis.white(`   - npx entkapp -r`));
        console.log(ansis.white(`   - npm run entkapp:run\n`));
      }
    }

    rl.close();

    // Load local config if available
    let localConfig = {};
    try {
      const { ConfigLoader } = await import('../src/resolution/ConfigLoader.js');
      const loader = new ConfigLoader(targetCwd);
      localConfig = await loader.loadConfig();
    } catch (e) {}

    // Merge options with local config
    const finalInterface = localConfig.interface || 'CLI';
    if (finalInterface === 'GUI') {
      console.log(ansis.bold.magenta('🎨 GUI Mode Detected. Starting Web Interface...'));
      return;
    }

    // Only proceed to execution if -r/--run is provided
    if (!options.run) {
      return;
    }

    // --- Timeout Handling ---
    const timeoutMs = parseInt(options.timeout);
    const timeoutTimer = setTimeout(() => {
      console.error(ansis.bold.red(`\n🚨 Execution Timeout: The process exceeded the limit of ${timeoutMs}ms.`));
      process.exit(1);
    }, timeoutMs);
    timeoutTimer.unref(); // Allow process to exit if work finishes

    console.log(ansis.bold.green(`\n📦 entkapp v${packageJsonContent.version || '5.3.1'} Engine Activation`));
    console.log(ansis.dim('------------------------------------------------------------'));
    console.log(`${ansis.bold('Target Workspace Root :')} ${ansis.blue(targetCwd)}`);
    console.log(`${ansis.bold('Refactoring Mode     :')} ${options.fix ? ansis.yellow('Active Fixing & Self-Healing Enabled') : ansis.gray('Dry-Run Reporting Only')}`);
    console.log(`${ansis.bold('Validation Sandbox   :')} ${ansis.magenta(options.testCommand)}`);
    console.log(ansis.dim('------------------------------------------------------------\n'));

    const { RefactoringEngine } = await import('../src/index.js');

    const engine = new RefactoringEngine({
      cwd: targetCwd,
      autoFix: options.fix,
      tsconfig: options.tsconfig,
      testCommand: options.testCommand,
      workspace: options.workspace,
      verbose: options.verbose,
      skipConfirm: options.yes,
      // Pass through local config settings
      entryPoints: localConfig.entryPoints,
      exclude: localConfig.exclude,
      rules: localConfig.rules,
      debug: options.debug,
      visualize: options.visualize,
    });

    await engine.run();
    
    clearTimeout(timeoutTimer);
    console.log(ansis.bold.green('\n✨ Core cycle execution completed successfully. Structural layout is clean.'));
    process.exit(0);

  } catch (criticalBootError) {
    console.error(ansis.bold.red(`\n🚨 Critical Lifecycle Boot Instability: ${criticalBootError.message}`));
    if (criticalBootError.stack) {
      console.error(ansis.dim(criticalBootError.stack));
    }
    process.exit(1);
  }
}

bootstrap();
