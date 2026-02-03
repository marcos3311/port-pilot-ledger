import { app, shell, BrowserWindow, ipcMain, protocol, dialog, net, clipboard, nativeImage } from 'electron'
import { join, extname, isAbsolute } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import db, { initDatabase } from './database'
import {
  handleGetPilotSummary,
  handleGetDashboardData,
  handleCreateTransaction,
  handleUpdateTransaction
} from './handlers';


// Register privileged protocol
protocol.registerSchemesAsPrivileged([
  { scheme: 'pilot-photo', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true, corsEnabled: true } }
])

// ... existing code ...

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    title: 'Control de Cambios',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  initDatabase()
  console.log('Database initialized')

  const PHOTOS_DIR = join(app.getPath('userData'), 'pilot_photos')
  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true })
    console.log('[System] Created photos directory:', PHOTOS_DIR)
  }

  try {
    const files = fs.readdirSync(PHOTOS_DIR)
    console.log('[System] Initial photos directory contents:', files)
  } catch (e) {
    console.error('[System] Error reading photos directory:', e)
  }

  // Protocol handler for local photos
  protocol.handle('pilot-photo', (request) => {
    try {
      const url = new URL(request.url)
      // Extract filename from pathname (e.g., /local/filename.jpg -> filename.jpg)
      const fileName = decodeURIComponent(url.pathname.split('/').pop() || '')
      const filePath = join(PHOTOS_DIR, fileName)

      console.log(`[Protocol Request] URL: ${request.url} -> File: ${filePath}`)

      // Check for 'preview' host or 'path' search param
      const pathParam = url.searchParams.get('path');
      if (pathParam) {
        const previewPath = decodeURIComponent(pathParam);
        console.log(`[Protocol Preview] ${previewPath}`);
        return net.fetch(pathToFileURL(previewPath).toString());
      }

      if (!fileName || !fs.existsSync(filePath)) {
        console.error('[Protocol Error] File not found or invalid:', filePath)
        return new Response('Not Found', { status: 404 })
      }

      return net.fetch(pathToFileURL(filePath).toString())
    } catch (e) {
      console.error('[Protocol Handler Exception]:', e)
      return new Response('Error', { status: 500 })
    }
  })

  ipcMain.handle('select-pilot-photo', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })


  // ... (previous imports)

  // ... (inside app.whenReady)

  ipcMain.handle('get-dashboard-data', handleGetDashboardData);

  ipcMain.handle('get-practicos', () => {
    return db.prepare("SELECT * FROM practicos WHERE activo = 1 ORDER BY nombre ASC").all();
  });

  ipcMain.handle('get-inactive-practicos', () => {
    return db.prepare("SELECT * FROM practicos WHERE activo = 0 ORDER BY nombre ASC").all();
  });

  ipcMain.handle('create-transaction', handleCreateTransaction);

  // Note: delete-transaction-shift and delete-transaction-simple might need refactoring too if schema changed too much, 
  // but they rely on ID which is still there. However, 'cantidad_dias' is gone from root.
  // We should probably check delete logic.
  ipcMain.handle('delete-transaction-shift', (_, { id }) => {
    // Need to check if logic holds: "numero_orden" exists. Yes. "anio_imputacion" exists. Yes.
    // Shift strategy depends on numero_orden. This remains valid.
    const tx = db.prepare('SELECT anio_imputacion, numero_orden FROM intercambios WHERE id = ?').get(id) as { anio_imputacion: number, numero_orden: number };
    if (!tx) return { success: false };
    const deleteAndShift = db.transaction(() => {
      db.prepare('DELETE FROM intercambios WHERE id = ?').run(id);
      db.prepare(`
        UPDATE intercambios 
        SET numero_orden = numero_orden - 1 
        WHERE anio_imputacion = ? AND numero_orden > ?
      `).run(tx.anio_imputacion, tx.numero_orden);
    });
    deleteAndShift();
    return { success: true };
  });

  ipcMain.handle('delete-transaction-simple', (_, { id }) => {
    db.prepare('DELETE FROM intercambios WHERE id = ?').run(id);
    return { success: true };
  });

  // Update logic also needs refactor to support JSON updates. 
  // For now, let's just fail or todo since UI won't call old update.
  // Expect V2 Update to be implemented if needed.
  ipcMain.handle('update-transaction', handleUpdateTransaction);

  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })


  ipcMain.handle('get-pilot-summary', handleGetPilotSummary);

  ipcMain.handle('get-all-practicos', () => {
    return db.prepare("SELECT * FROM practicos ORDER BY id ASC").all();
  });

  ipcMain.handle('get-available-years', () => {
    const years = db.prepare("SELECT DISTINCT anio_imputacion FROM intercambios ORDER BY anio_imputacion DESC").all() as { anio_imputacion: number }[];
    return years.map(y => y.anio_imputacion);
  });

  // Ensure pilot_photos directory exists
  if (!fs.existsSync(PHOTOS_DIR)) {
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });
  }

  ipcMain.handle('create-practico', (_, { nombre, foto_url }) => {
    let finalFotoUrl: string | null = null;
    if (foto_url) {
      if (isAbsolute(foto_url)) {
        // It's a local file path, copy it
        const ext = extname(foto_url);
        const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
        const destPath = join(PHOTOS_DIR, filename);
        fs.copyFileSync(foto_url, destPath);
        finalFotoUrl = filename;
      } else {
        // It's already a filename (shouldn't happen for new, but safe to handle) or null
        finalFotoUrl = foto_url;
      }
    }
    const result = db.prepare("INSERT INTO practicos (nombre, foto_url) VALUES (?, ?)").run(nombre, finalFotoUrl);
    return { success: true, id: result.lastInsertRowid };
  });

  ipcMain.handle('update-practico', (_, { id, nombre, foto_url, activo }) => {
    let finalFotoUrl = foto_url;

    // Check if foto_url is a new local path that needs copying
    if (foto_url && isAbsolute(foto_url)) {
      const ext = extname(foto_url);
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
      const destPath = join(PHOTOS_DIR, filename);
      try {
        fs.copyFileSync(foto_url, destPath);
        finalFotoUrl = filename;
      } catch (err) {
        console.error('Error copying photo:', err);
        // Keep original if copy fails or handle error
      }
    }

    // Dynamic update query
    const updates: string[] = [];
    const params: any[] = [];

    if (nombre !== undefined) {
      updates.push('nombre = ?');
      params.push(nombre);
    }
    if (foto_url !== undefined) { // Allow setting to null/string
      updates.push('foto_url = ?');
      params.push(finalFotoUrl);
    }
    if (activo !== undefined) {
      updates.push('activo = ?');
      params.push(activo);
    }

    if (updates.length === 0) return { success: true }; // Nothing to update

    params.push(id);
    db.prepare(`UPDATE practicos SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return { success: true };
  });

  ipcMain.handle('update-practico-status', (_, { id, activo }) => {
    db.prepare("UPDATE practicos SET activo = ? WHERE id = ?").run(activo, id);
    return { success: true };
  });

  ipcMain.handle('copy-image-to-clipboard', (_, { dataUrl }) => {
    try {
      const image = nativeImage.createFromDataURL(dataUrl);
      clipboard.writeImage(image);
      return { success: true };
    } catch (error) {
      console.error('Error copying image to clipboard:', error);
      throw error;
    }
  });

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch(err => {
  console.error('Failed to start app:', err)
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
