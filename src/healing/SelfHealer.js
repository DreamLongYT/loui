import { spawn } from 'child_process';
import path from 'path';

/**
 * Self-Healing Test Orchestration & Regression Scanner
 * Runs validation suites, intercepts stack traces, and controls transaction rollbacks.
 */
export class SelfHealer {
  constructor(context, transactionManager, gitSandbox) {
    this.context = context;
    this.transactionManager = transactionManager;
    this.gitSandbox = gitSandbox;
    this.executionTimeout = 45000; // 45-second execution timeout wall
  }

  /**
   * Validates the stability of staged code changes by running your project's test suite.
   * @param {Function} refactorTask - The function containing code changes to evaluate
   */
  async runSelfHealingLifecycle(refactorTask) {
    console.log('🛡️  Initializing transaction safety sandbox...');
    
    // Step 1: Open the transaction boundaries
    await this.gitSandbox.establishIsolationCheckpoint();
    await this.transactionManager.begin();

    try {
      // Step 2: Execute the codebase pruning transformations
      await refactorTask();

      // Step 3: Stage changes inside our Git tracking context
      await this.gitSandbox.checkpointChanges();

      console.log('🧪 Running testing suites to verify workspace integrity...');
      const validationPassed = await this.verifyProjectHealthStatus();

      if (validationPassed) {
        console.log('✨ Build stable. Merging verified code improvements.');
        await this.transactionManager.commit();
        await this.gitSandbox.acceptAndMergeOptimizations();
        return true;
      } else {
        console.warn('⚠️  Regression flagged during validation. Triggering self-healing rollback...');
        await this.revertWorkspaceToSafeState();
        return false;
      }
    } catch (pipelineError) {
      console.error(`🚨 Critical Exception Intercepted: ${pipelineError.message}`);
      await this.revertWorkspaceToSafeState();
      return false;
    }
  }

  /**
   * Spawns testing processes to detect exit code alerts or compiler trace metrics.
   * @returns {Promise<boolean>} True if the test suite runs with an exit code of 0
   */
  verifyProjectHealthStatus() {
    return new Promise((resolve) => {
      const commandTokens = this.context.testCommand.split(' ');
      const executionBinary = commandTokens.shift();
      
      const processBuffer = [];
      const testProcess = spawn(executionBinary, commandTokens, {
        cwd: this.context.cwd,
        shell: true
      });

      // Implement an execution timeout monitor to prevent hanging test suites from blocking the pipeline
      const timeoutWatch = setTimeout(() => {
        console.warn('⏱️  Test execution exceeded timeout limit. Terminating subprocess...');
        testProcess.kill('SIGKILL');
      }, this.executionTimeout);

      testProcess.stdout.on('data', (data) => {
        processBuffer.push(data);
        if (this.context.verbose) {
          process.stdout.write(data);
        }
      });

      testProcess.stderr.on('data', (data) => {
        processBuffer.push(data);
        if (this.context.verbose) {
          process.stderr.write(data);
        }
      });

      testProcess.on('close', (exitCode) => {
        clearTimeout(timeoutWatch);
        
        if (exitCode !== 0) {
          const fullConsoleOutput = Buffer.concat(processBuffer).toString('utf8');
          this.diagnoseErrorOutput(fullConsoleOutput);
          resolve(false);
        } else {
          resolve(true);
        }
      });

      testProcess.on('error', (err) => {
        clearTimeout(timeoutWatch);
        if (this.context.verbose) {
          console.error(`Subprocess execution error: ${err.message}`);
        }
        resolve(false);
      });
    });
  }

  /**
   * Traces error codes and console log outputs to identify the root cause of a broken build.
   */
  diagnoseErrorOutput(consoleLogOutput) {
    console.log('\n🔍 [Diagnostics] Reviewing error output...');
    
    // Scan for standard TypeScript Compilation errors
    const tsErrorPattern = /error\s+TS(\d+):\s+([\s\S]*?)$/m;
    const tsMatches = consoleLogOutput.match(tsErrorPattern);
    
    if (tsMatches) {
      console.error(`❌ Mapped Type Error Code [TS${tsMatches[1]}]: ${tsMatches[2].trim()}`);
      return;
    }

    // Scan for missing file imports or runtime resolution exceptions
    const missingModulePattern = /Cannot find module '([^']+)'/i;
    const moduleMatches = consoleLogOutput.match(missingModulePattern);
    
    if (moduleMatches) {
      console.error(`❌ Missing Dependency Reference Pointer: Cannot locate element [${moduleMatches[1]}]`);
      return;
    }

    console.error('❌ Test suite execution failed. Check standard console output for details.');
  }

  /**
   * Automatically executes a rollback event, restoring both file states and Git status.
   */
  async revertWorkspaceToSafeState() {
    try {
      await this.transactionManager.rollback();
      await this.gitSandbox.rejectAndAbortOptimizations();
      console.log('🔄 [Self-Healing] Rollback complete. Original project states restored.');
    } catch (recoveryError) {
      console.error(`🚨 Fatal Recovery Error: Failed to restore prior workspace configuration: ${recoveryError.message}`);
    }
  }
}
