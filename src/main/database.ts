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
  // Enforce foreign keys
  db.pragma('foreign_keys = ON');

  // 1. Create tables first
  db.exec(`
    CREATE TABLE IF NOT EXISTS practicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      activo INTEGER DEFAULT 1,
      foto_url TEXT
    );
  `);

  // --- V1 -> V2 MIGRATION CHECK ---
  // If 'intercambios' exists but lacks 'tipo', it's V1. We must DROP it to allow V2 creation.
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='intercambios'").get();
  if (tableExists) {
    const columns = db.prepare("PRAGMA table_info(intercambios)").all() as any[];
    const isV2 = columns.some(col => col.name === 'tipo');
    if (!isV2) {
      console.warn('[Migration] Detected V1 schema (missing "tipo"). Dropping table to upgrade to V2...');
      db.prepare("DROP TABLE intercambios").run();
    }
  }

  db.exec(`

  --V2: Schema ensures table exists
  --DROP TABLE IF EXISTS intercambios; (REMOVED FOR PERSISTENCE)

    CREATE TABLE IF NOT EXISTS intercambios(
    id TEXT PRIMARY KEY,
    anio_imputacion INTEGER NOT NULL,
    numero_orden INTEGER NOT NULL CHECK(numero_orden >= 1),
    fecha_registro TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN('unilateral', 'reciproco', 'condonacion')),
    deudor_id INTEGER NOT NULL,
    acreedor_id INTEGER NOT NULL,
    datos_json TEXT NOT NULL,
    estado TEXT CHECK(estado IN('activo', 'anulado')) DEFAULT 'activo',
    observacion TEXT,
    FOREIGN KEY(deudor_id) REFERENCES practicos(id),
    FOREIGN KEY(acreedor_id) REFERENCES practicos(id)
  );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_orden_anio ON intercambios(anio_imputacion, numero_orden);
  `);

  // 2. Migration logic (kept for practicos if needed, though mostly stable)
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

  seedDatabase();
}

function seedDatabase(): void {
  // Wipe functionality as requested by USER: "Remove all dummy data."
  console.log('Database initialized (V2 Schema Applied).');
}

export default db;
