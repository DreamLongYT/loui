import fs from 'fs/promises';
import path from 'path';

/**
 * Transactional File System Operations Supervisor
 * Guarantees atomicity across multi-file transformations by tracking rolling backups.
 */
export class TransactionManager {
  constructor(context) {
    this.context = context;
    this.backupDirectory = path.join(context.cacheDir, 'backups');
    this.journal = [];
    this.isLocked = false;
  }

  /**
   * Begins a new transaction lifecycle loop, initializing isolation vectors.
   */
  async begin() {
    if (this.isLocked) {
      throw new Error('Transaction Manager concurrency fault: Another transaction is already staged.');
    }
    this.isLocked = true;
    this.journal = [];
    await fs.mkdir(this.backupDirectory, { recursive: true });
  }

  /**
   * Stages a destructive file modification or creation sequence.
   * @param {string} filePath - Absolute system file target location
   * @param {string} nextContent - The completely rewritten proposed source structure
   */
  async stageWrite(filePath, nextContent) {
    this.assertLock();
    let originalContent = null;
    let backupPath = null;
    let operationType = 'UPDATE';

    try {
      await fs.access(filePath);
      originalContent = await fs.readFile(filePath, 'utf8');
      
      const fileId = Buffer.from(filePath).toString('base64url');
      backupPath = path.join(this.backupDirectory, `${fileId}.bak`);
      await fs.writeFile(backupPath, originalContent, 'utf8');
    } catch {
      operationType = 'CREATE';
    }

    // Attempt target file mutation write directly to disk
    await fs.writeFile(filePath, nextContent, 'utf8');

    this.journal.push({
      type: operationType,
      targetFile: filePath,
      backupLocation: backupPath
    });
  }

  /**
   * Stages an element deletion sequence safely.
   * @param {string} filePath - Target component being evaluated as dead
   */
  async stageDeletion(filePath) {
    this.assertLock();
    
    // Read previous state data for archiving before dropping linkage
    const originalContent = await fs.readFile(filePath, 'utf8');
    const fileId = Buffer.from(filePath).toString('base64url');
    const backupPath = path.join(this.backupDirectory, `${fileId}.bak`);
    
    await fs.writeFile(backupPath, originalContent, 'utf8');
    await fs.unlink(filePath);

    this.journal.push({
      type: 'DELETE',
      targetFile: filePath,
      backupLocation: backupPath
    });
  }

  /**
   * Finalizes the transaction sequence, cleaning up local transaction cache points.
   */
  async commit() {
    this.assertLock();
    try {
      for (const record of this.journal) {
        if (record.backupLocation) {
          await fs.unlink(record.backupLocation).catch(() => {});
        }
      }
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Reverts changes to their original states if any error or verification failure is flagged.
   */
  async rollback() {
    this.assertLock();
    try {
      // Process journal logs in reverse execution order to preserve dependencies
      for (let i = this.journal.length - 1; i >= 0; i--) {
        const record = this.journal[i];
        
        if (record.type === 'CREATE') {
          await fs.unlink(record.targetFile).catch(() => {});
        } else if (record.type === 'UPDATE' || record.type === 'DELETE') {
          const originalContent = await fs.readFile(record.backupLocation, 'utf8');
          await fs.writeFile(record.targetFile, originalContent, 'utf8');
          await fs.unlink(record.backupLocation).catch(() => {});
        }
      }
    } finally {
      this.releaseLock();
    }
  }

  assertLock() {
    if (!this.isLocked) {
      throw new Error('Transaction Manager boundary violation: No active tracking block exists.');
    }
  }

  releaseLock() {
    this.isLocked = false;
    this.journal = [];
  }
}
