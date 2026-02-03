import { app } from 'electron';
import { join } from 'path';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';

export class BackupManager {
    private static readonly BACKUP_DIR_NAME = 'PortPilotLedger/Backups';
    private static readonly MAX_BACKUPS = 20;

    private static getBackupPath(): string {
        const docsPath = app.getPath('documents');
        const backupPath = join(docsPath, this.BACKUP_DIR_NAME);

        if (!existsSync(backupPath)) {
            mkdirSync(backupPath, { recursive: true });
        }
        return backupPath;
    }

    /**
     * Restores the database from the latest backup if the main database file is missing.
     * @param dbPath Absolute path to the main database file.
     * @returns true if restored, false if not.
     */
    static restoreIfMissing(dbPath: string): boolean {
        if (existsSync(dbPath)) {
            return false; // Main DB exists, no need to restore
        }

        const backupDir = this.getBackupPath();
        const files = readdirSync(backupDir).filter(f => f.endsWith('.db'));

        if (files.length === 0) {
            console.log('No backups found to restore.');
            return false;
        }

        // Sort by modification time (newest first)
        const latestBackup = files
            .map(f => ({ name: f, time: statSync(join(backupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time)[0];

        if (latestBackup) {
            try {
                const source = join(backupDir, latestBackup.name);
                copyFileSync(source, dbPath);
                console.log(`Database auto-restored from: ${latestBackup.name}`);
                return true;
            } catch (error) {
                console.error('Failed to restore database from backup:', error);
            }
        }
        return false;
    }

    /**
     * Creates a timestamped backup of the current database.
     * @param dbPath Absolute path to the main database file.
     */
    static createBackup(dbPath: string): void {
        if (!existsSync(dbPath)) {
            console.warn('Cannot backup: Database file does not exist.');
            return;
        }

        try {
            const backupDir = this.getBackupPath();
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `backup_${timestamp}.db`;
            const destPath = join(backupDir, backupName);

            copyFileSync(dbPath, destPath);
            console.log(`Backup created: ${destPath}`);

            this.pruneBackups(backupDir);
        } catch (error) {
            console.error('Failed to create database backup:', error);
        }
    }

    /**
     * Keeps only the latest N backups, deleting older ones.
     */
    private static pruneBackups(backupDir: string): void {
        try {
            const files = readdirSync(backupDir)
                .filter(f => f.endsWith('.db'))
                .map(f => ({ name: f, path: join(backupDir, f), time: statSync(join(backupDir, f)).mtime.getTime() }))
                .sort((a, b) => b.time - a.time); // Newest first

            if (files.length > this.MAX_BACKUPS) {
                const toDelete = files.slice(this.MAX_BACKUPS);
                for (const file of toDelete) {
                    unlinkSync(file.path);
                    console.log(`Pruned old backup: ${file.name}`);
                }
            }
        } catch (error) {
            console.error('Failed to prune old backups:', error);
        }
    }
}
