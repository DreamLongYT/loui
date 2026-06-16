import ansis from 'ansis';

/**
 * Automated Structural Healing Orchestrator.
 * Manages the lifecycle of applying structural fixes and verifying codebase health.
 * This is a deterministic engine and does not use AI/LLMs.
 */
export class SelfHealer {
  constructor(context, txManager, gitSandbox) {
    this.context = context;
    this.txManager = txManager;
    this.gitSandbox = gitSandbox;
  }

  /**
   * Executes a structural healing cycle with automatic rollback on failure.
   * @param {Function} refactorLogic - Async function that stages structural changes
   */
  async runSelfHealingLifecycle(refactorLogic) {
    console.log(ansis.bold.blue('\n🩹 Initiating Automated Structural Healing Cycle...'));
    
    try {
      // 1. Capture current stable state
      await this.gitSandbox.captureState();

      // 1b. Initialize transaction tracking
      await this.txManager.begin();

      // 2. Execute the provided refactoring logic (staging deletions/writes)
      await refactorLogic();

      // 3. Commit staged changes to disk
      await this.txManager.commit();

      // 4. Verify structural integrity (e.g., run tests)
      console.log(ansis.dim('🧪 Verifying codebase integrity...'));
      const isHealthy = await this.gitSandbox.verifyIntegrity();

      if (isHealthy) {
        console.log(ansis.bold.green('✅ Structural integrity verified. Finalizing changes.'));
        await this.gitSandbox.commit();
      } else {
        console.log(ansis.bold.red('❌ Structural integrity compromised. Rolling back changes.'));
        await this.gitSandbox.rollback();
        this.context.metrics.securityVulnerabilitiesMitigated = 0; // Reset metrics for failed cycle
      }
    } catch (error) {
      console.error(ansis.bold.red(`\n🚨 Healing Cycle Aborted: ${error.message}`));
      await this.gitSandbox.rollback();
    }
  }
}
