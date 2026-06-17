import { execa } from 'execa';
import path from 'path';

/**
 * Deterministic Version Control Guard for Structural Healing Operations.
 * Manages atomic state rollbacks when automated refactoring breaks the build.
 */
export class GitSandbox {
  constructor(context) {
    this.context = context;
    this.initialBranch = '';
    this.healingBranch = `scaffold-healing-${Date.now()}`;
  }

  /**
   * Captures the current repository state before applying structural modifications.
   */
  async captureState() {
    try {
      const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: this.context.cwd });
      this.initialBranch = stdout.trim();
      
      // Create a temporary recovery branch
      await execa('git', ['checkout', '-b', this.healingBranch], { cwd: this.context.cwd });
      if (this.context.verbose) {
        console.log(`[Git] State captured in temporary branch: ${this.healingBranch}`);
      }
    } catch (e) {
      throw new Error(`Git state capture failed: Ensure the directory is a git repository. (${e.message})`);
    }
  }

  /**
   * Reverts all changes applied during the healing cycle if verification fails.
   */
  async rollback() {
    try {
      console.log(`[Git] Rolling back structural modifications...`);
      await execa('git', ['reset', '--hard', 'HEAD'], { cwd: this.context.cwd });
      await execa('git', ['checkout', this.initialBranch], { cwd: this.context.cwd });
      await execa('git', ['branch', '-D', this.healingBranch], { cwd: this.context.cwd });
    } catch (e) {
      console.error(`[Git] Critical rollback failure: ${e.message}`);
    }
  }

  /**
   * Finalizes the healing cycle by merging changes back to the original branch.
   */
  async commit() {
    try {
      await execa('git', ['add', '.'], { cwd: this.context.cwd });
      await execa('git', ['commit', '-m', 'chore: automated structural healing (entkapp)'], { cwd: this.context.cwd });
      
      await execa('git', ['checkout', this.initialBranch], { cwd: this.context.cwd });
      await execa('git', ['merge', this.healingBranch], { cwd: this.context.cwd });
      await execa('git', ['branch', '-D', this.healingBranch], { cwd: this.context.cwd });
      
      if (this.context.verbose) {
        console.log(`[Git] Structural modifications successfully merged into ${this.initialBranch}`);
      }
    } catch (e) {
      console.error(`[Git] Commit failed: ${e.message}`);
    }
  }

  /**
   * Runs a verification command (e.g., npm test) to ensure structural integrity.
   */
  async verifyIntegrity() {
    try {
      const [cmd, ...args] = this.context.testCommand.split(' ');
      await execa(cmd, args, { cwd: this.context.cwd });
      return true;
    } catch (e) {
      if (this.context.verbose) {
        console.warn(`[Git] Integrity verification failed: ${e.message}`);
      }
      return false;
    }
  }
}
