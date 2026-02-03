import { app, shell, BrowserWindow, ipcMain, protocol, dialog, net, clipboard, nativeImage } from 'electron'
import { join, extname, isAbsolute } from 'path'
import { pathToFileURL } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import db, { initDatabase } from './database'

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

  ipcMain.handle('get-dashboard-data', (_, year?: number | string) => {
    let sql = `
      SELECT t.*, 
             d.nombre as deudor, 
             d.activo as deudor_activo,
             a.nombre as acreedor, 
             a.activo as acreedor_activo,
             r.nombre as realizado_por,
             r.activo as realizado_por_activo
      FROM intercambios t
      JOIN practicos d ON t.deudor_id = d.id
      JOIN practicos a ON t.acreedor_id = a.id
      JOIN practicos r ON t.realizado_por_id = r.id
    `;
    const params: any[] = [];
    if (year && year !== 'Todos') {
      sql += ` WHERE t.anio_imputacion = ?`;
      params.push(year);
    }
    sql += ` ORDER BY t.anio_imputacion DESC, t.numero_orden DESC`;
    const transacciones = db.prepare(sql).all(...params);
    return { transacciones };
  });

  ipcMain.handle('get-practicos', () => {
    return db.prepare("SELECT * FROM practicos WHERE activo = 1 ORDER BY nombre ASC").all();
  });

  ipcMain.handle('get-inactive-practicos', () => {
    return db.prepare("SELECT * FROM practicos WHERE activo = 0 ORDER BY nombre ASC").all();
  });

  ipcMain.handle('create-transaction', (_, data: any) => {
    const { anio_imputacion, customOrderNumber, ...rest } = data;
    if (rest.deudor_id === rest.acreedor_id) {
      throw new Error('El Deudor y el Acreedor no pueden ser el mismo Práctico.');
    }
    let finalOrderNumber = customOrderNumber;
    if (finalOrderNumber) {
      const exists = db.prepare('SELECT 1 FROM intercambios WHERE anio_imputacion = ? AND numero_orden = ?')
        .get(anio_imputacion, finalOrderNumber);
      if (exists) throw new Error(`El número de orden ${finalOrderNumber} ya existe para el año ${anio_imputacion}`);
    } else {
      const max = db.prepare('SELECT MAX(numero_orden) as max FROM intercambios WHERE anio_imputacion = ?')
        .get(anio_imputacion) as { max: number | null };
      finalOrderNumber = (max.max || 0) + 1;
    }
    const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const fecha_registro = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO intercambios (id, anio_imputacion, numero_orden, fecha_registro, fecha_turno, cantidad_dias, deudor_id, acreedor_id, realizado_por_id, es_triangulacion, estado, observacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', ?)
    `).run(id, anio_imputacion, finalOrderNumber, fecha_registro, rest.fecha_turno, rest.cantidad_dias, rest.deudor_id, rest.acreedor_id, rest.realizado_por_id, rest.es_triangulacion ? 1 : 0, rest.observacion);
    return { success: true, id, numero_orden: finalOrderNumber };
  });

  ipcMain.handle('delete-transaction-shift', (_, { id }) => {
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

  ipcMain.handle('update-transaction', (_, { id, anio_imputacion, numero_orden, ...data }) => {
    const currentTx = db.prepare('SELECT deudor_id, acreedor_id FROM intercambios WHERE id = ?').get(id) as { deudor_id: number, acreedor_id: number };
    if (!currentTx) throw new Error('Transaction not found');
    const newDeudor = data.deudor_id ?? currentTx.deudor_id;
    const newAcreedor = data.acreedor_id ?? currentTx.acreedor_id;
    if (newDeudor === newAcreedor) {
      throw new Error('El Deudor y el Acreedor no pueden ser el mismo Práctico.');
    }
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];
    db.prepare(`UPDATE intercambios SET ${fields} WHERE id = ?`).run(...values);
    return { success: true };
  });

  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('get-pilot-summary', (_, { pilotId }) => {
    const pilot = db.prepare('SELECT * FROM practicos WHERE id = ?').get(pilotId) as any;
    if (!pilot) throw new Error('Práctico no encontrado');
    const transactions = db.prepare(`
      SELECT t.*, 
             d.nombre as deudor, 
             d.activo as deudor_activo,
             a.nombre as acreedor, 
             a.activo as acreedor_activo,
             r.nombre as realizado_por,
             r.activo as realizado_por_activo
      FROM intercambios t
      JOIN practicos d ON t.deudor_id = d.id
      JOIN practicos a ON t.acreedor_id = a.id
      JOIN practicos r ON t.realizado_por_id = r.id
      WHERE (t.deudor_id = ? OR t.acreedor_id = ? OR (t.es_triangulacion = 1 AND t.realizado_por_id = ?)) 
        AND t.estado = 'activo'
      ORDER BY t.fecha_turno DESC, t.numero_orden DESC
    `).all(pilotId, pilotId, pilotId) as any[];
    const balanceMap: Record<number, { pilotName: string; balance: number; isActive: number }> = {};
    const updateBalance = (targetId: number, targetName: string, targetActive: number, amount: number) => {
      if (!balanceMap[targetId]) {
        balanceMap[targetId] = { pilotName: targetName, balance: 0, isActive: targetActive };
      }
      balanceMap[targetId].balance += amount;
    };
    transactions.forEach(tx => {
      const days = tx.cantidad_dias;
      const isTriangulation = Boolean(tx.es_triangulacion) && (tx.realizado_por_id !== tx.acreedor_id);
      if (tx.deudor_id === pilotId) {
        updateBalance(tx.acreedor_id, tx.acreedor, tx.acreedor_activo, -days);
      } else if (tx.acreedor_id === pilotId) {
        updateBalance(tx.deudor_id, tx.deudor, tx.deudor_activo, days);
      }
      if (isTriangulation) {
        if (tx.acreedor_id === pilotId) {
          updateBalance(tx.realizado_por_id, tx.realizado_por, tx.realizado_por_activo, -days);
        } else if (tx.realizado_por_id === pilotId) {
          updateBalance(tx.acreedor_id, tx.acreedor, tx.acreedor_activo, days);
        }
      }
    });
    const balances = Object.entries(balanceMap)
      .map(([id, data]) => ({
        counterpartId: parseInt(id),
        pilotName: data.pilotName,
        balance: data.balance,
        isActive: data.isActive
      }))
      .filter(b => b.balance !== 0 && b.isActive === 1);
    return { pilot, balances, historial: transactions };
  });

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
