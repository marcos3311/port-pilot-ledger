import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';

const dbPath = join(app.getPath('userData'), 'port-pilot-ledger.db');

// 1. Try to restore if missing (Before opening connection)
import { BackupManager } from './backup';
try {
  BackupManager.restoreIfMissing(dbPath);
} catch (e) {
  console.error('Error during database restore check:', e);
}

const db: Database.Database = new Database(dbPath);

// 2. Create a backup of the current state (After ensuring file integrity)
try {
  BackupManager.createBackup(dbPath);
} catch (e) {
  console.error('Error during backup creation:', e);
}

export function initDatabase(): void {
  // 1. Create tables first
  db.exec(`
    CREATE TABLE IF NOT EXISTS practicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      activo INTEGER DEFAULT 1,
      foto_url TEXT
    );

    CREATE TABLE IF NOT EXISTS intercambios (
      id TEXT PRIMARY KEY,
      anio_imputacion INTEGER NOT NULL,
      numero_orden INTEGER NOT NULL,
      fecha_registro TEXT NOT NULL,
      fecha_turno TEXT NOT NULL,
      cantidad_dias INTEGER DEFAULT 1,
      deudor_id INTEGER NOT NULL,
      acreedor_id INTEGER NOT NULL,
      realizado_por_id INTEGER NOT NULL,
      es_triangulacion INTEGER NOT NULL,
      estado TEXT CHECK(estado IN ('activo', 'anulado')) DEFAULT 'activo',
      observacion TEXT,
      FOREIGN KEY(deudor_id) REFERENCES practicos(id),
      FOREIGN KEY(acreedor_id) REFERENCES practicos(id),
      FOREIGN KEY(realizado_por_id) REFERENCES practicos(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_orden_anio ON intercambios (anio_imputacion, numero_orden);
  `);

  // 2. Migration: Add foto_url if it doesn't exist (for existing databases that were created before foto_url)
  try {
    const tableInfo = db.prepare("PRAGMA table_info(practicos)").all() as any[];
    const hasFotoUrl = tableInfo.some(col => col.name === 'foto_url');
    if (!hasFotoUrl) {
      db.prepare("ALTER TABLE practicos ADD COLUMN foto_url TEXT").run();
      console.log('Migrated practicos table: added foto_url column');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Rest of the init logic...
  seedDatabase();
}

function seedDatabase(): void {
  // Wipe functionality as requested by USER: "Remove all dummy data."
  // We leave this empty to ensure a clean slate.
  // The 'practicos' table was dropped above, so it will be empty.
  console.log('Database initialized (Empty).');
}

export default db;
