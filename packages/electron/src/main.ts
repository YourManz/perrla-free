import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { buildMenu } from './menu';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

interface FileFilter {
  name: string;
  extensions: string[];
}

interface SaveFileArgs {
  defaultName: string;
  content: string;
  filters: FileFilter[];
}

interface OpenFileArgs {
  filters: FileFilter[];
}

interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  buttonLabel?: string;
}

interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
  buttonLabel?: string;
}

function createWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload.js');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '..', '..', 'web', 'build', 'index.html');
    win.loadFile(indexPath);
  }

  const menu = buildMenu(win);
  Menu.setApplicationMenu(menu);

  return win;
}

// IPC Handlers

ipcMain.handle('fs:saveFile', async (_event, args: SaveFileArgs) => {
  const { defaultName, content, filters } = args;

  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters,
  });

  if (canceled || !filePath) {
    return null;
  }

  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  } catch (err) {
    console.error('Failed to save file:', err);
    return null;
  }
});

ipcMain.handle('fs:openFile', async (_event, args: OpenFileArgs) => {
  const { filters } = args;

  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters,
    properties: ['openFile'],
  });

  if (canceled || filePaths.length === 0) {
    return null;
  }

  const filePath = filePaths[0];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { path: filePath, content };
  } catch (err) {
    console.error('Failed to read file:', err);
    return null;
  }
});

ipcMain.handle('dialog:showSave', async (_event, options: SaveDialogOptions) => {
  const { canceled, filePath } = await dialog.showSaveDialog(options);
  return canceled ? null : (filePath ?? null);
});

ipcMain.handle('dialog:showOpen', async (_event, options: OpenDialogOptions) => {
  const props = options.properties ?? ['openFile'];
  const { canceled, filePaths } = await dialog.showOpenDialog({
    ...options,
    properties: props as Parameters<typeof dialog.showOpenDialog>[0]['properties'],
  });
  return canceled || filePaths.length === 0 ? null : filePaths;
});

// App lifecycle

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS re-create window when dock icon is clicked and no windows open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS apps stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
