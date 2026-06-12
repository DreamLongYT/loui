import { execSync } from 'child_process';
import path from 'path';

/**
 * Ephemeral Git Sandbox & Version Control Islolation Gateway
 * Manages atomic branch switching, working-tree stashing, and systemic rollbacks.
 */
export class GitSandbox {
  constructor(context) {
    this.context = context;
    this.originalBranch = null;
    this.sandboxBranch = null;
    this.hasStashedChanges = false;
    this.isGitRepository = false;
  }

  /**
   * Validates the active environment and isolates the working directory.
   */
  async establishIsolationCheckpoint() {
    this.verifyGitRepositoryPresence();
    if (!this.isGitRepository) return;

    try {
      // Capture the current branch name
      this.originalBranch = execSync('git rev-parse --abbrev-ref HEAD', { 
        cwd: this.context.cwd, 
        encoding: 'utf8' 
      }).trim();

      // Check for uncommitted working directory changes
      const statusOutput = execSync('git status --porcelain', { 
        cwd: this.context.cwd, 
        encoding: 'utf8' 
      }).trim();

      if (statusOutput.length > 0) {
        if (this.context.verbose) {
          console.log('📦 Working tree contains uncommitted changes. Stashing before running pipeline...');
        }
        execSync('git stash save "pkg-scaffold: Ephemeral Checkpoint Stash"', { 
          cwd: this.context.cwd, 
          stdio: 'ignore' 
        });
        this.hasStashedChanges = true;
      }

      // Generate an isolated tracking branch name
      this.sandboxBranch = `scaffold-heal-${Date.now()}`;
      execSync(`git checkout -b ${this.sandboxBranch}`, { 
        cwd: this.context.cwd, 
        stdio: 'ignore' 
      });

      if (this.context.verbose) {
        console.log(`🌿 Isolated sandbox branch successfully initialized: [${this.sandboxBranch}]`);
      }
    } catch (error) {
      throw new Error(`Git Sandbox separation failure: ${error.message}`);
    }
  }

  /**
   * Commits all modifications within the sandbox branch for validation testing.
   */
  async stageAndCheckpointChanges(commitMessage = 'refactor(scaffold): apply structural optimizations') {
    if (!this.isGitRepository) return;
    this.assertActiveIsolation();

    try {
      execSync('git add .', { cwd: this.context.cwd, stdio: 'ignore' });
      
      // Check if any mutations were actually staged
      const diffIndex = execSync('git diff --cached --name-only', { 
        cwd: this.context.cwd, 
        encoding: 'utf8' 
      }).trim();

      if (diffIndex.length === 0) return; // No modifications to verify

      execSync(`git commit -m "${commitMessage}" --no-verify`, { 
        cwd: this.context.cwd, 
        stdio: 'ignore' 
      });
    } catch (error) {
      throw new Error(`Failed to stage changes inside the sandbox: ${error.message}`);
    }
  }

  /**
   * Merges modifications back into the mainline branch if all validation test suites pass.
   */
  async acceptAndMergeOptimizations() {
    if (!this.isGitRepository) return;
    this.assertActiveIsolation();

    try {
      // Return to the original project branch boundary
      execSync(`git checkout ${this.originalBranch}`, { cwd: this.context.cwd, stdio: 'ignore' });
      
      // Merge the verified changes without creating a fast-forward bottleneck
      execSync(`git merge --squash ${this.sandboxBranch}`, { cwd: this.context.cwd, stdio: 'ignore' });
      execSync('git commit -m "chore(refactor): apply verified dead-code removals" --no-verify', {
        cwd: this.context.cwd,
        stdio: 'ignore'
      });

      // Purge the temporary branch tracking reference
      execSync(`git branch -D ${this.sandboxBranch}`, { cwd: this.context.cwd, stdio: 'ignore' });
      this.restorePreviousWorkingState();
    } catch (error) {
      throw new Error(`Failed to merge sandbox modifications into mainline branch: ${error.message}`);
    }
  }

  /**
   * Reverts all disk changes instantly if testing suites flag an error.
   */
  async rejectAndAbortOptimizations() {
    if (!this.isGitRepository) return;
    if (!this.sandboxBranch) return;

    try {
      if (this.context.verbose) {
        console.log('🔄 Aborting transaction loop. Resetting file systems...');
      }
      
      execSync('git add . && git reset --hard HEAD', { cwd: this.context.cwd, stdio: 'ignore' });
      execSync(`git checkout ${this.originalBranch}`, { cwd: this.context.cwd, stdio: 'ignore' });
      execSync(`git branch -D ${this.sandboxBranch}`, { cwd: this.context.cwd, stdio: 'ignore' });
      
      this.restorePreviousWorkingState();
    } catch (error) {
      console.error(`🚨 Critical Recovery Error: Failed to drop sandbox branch cleanly: ${error.message}`);
    }
  }

  restorePreviousWorkingState() {
    if (this.hasStashedChanges) {
      execSync('git stash pop', { cwd: this.context.cwd, stdio: 'ignore' });
      this.hasStashedChanges = false;
    }
    this.sandboxBranch = null;
  }

  verifyGitRepositoryPresence() {
    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd: this.context.cwd, stdio: 'ignore' });
      this.isGitRepository = true;
    } catch {
      this.isGitRepository = false;
    }
  }

  assertActiveIsolation() {
    if (!this.sandboxBranch) {
      throw new Error('Git Sandbox operation error: No active sandbox tracking context exists.');
    }
  }
}
