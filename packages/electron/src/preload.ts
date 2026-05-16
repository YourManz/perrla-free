import { contextBridge, ipcRenderer } from 'electron';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  buttonLabel?: string;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
  buttonLabel?: string;
}

export interface OpenFileResult {
  path: string;
  content: string;
}

export interface PerrlaDesktopAPI {
  saveFile: (defaultName: string, content: string, filters: FileFilter[]) => Promise<string | null>;
  openFile: (filters: FileFilter[]) => Promise<OpenFileResult | null>;
  platform: NodeJS.Platform;
  showSaveDialog: (options: SaveDialogOptions) => Promise<string | null>;
  showOpenDialog: (options: OpenDialogOptions) => Promise<string[] | null>;
  onMenuAction: (callback: (action: string) => void) => () => void;
}

declare global {
  interface Window {
    perrlaDesktop: PerrlaDesktopAPI;
  }
}

const api: PerrlaDesktopAPI = {
  saveFile: (defaultName: string, content: string, filters: FileFilter[]) =>
    ipcRenderer.invoke('fs:saveFile', { defaultName, content, filters }),

  openFile: (filters: FileFilter[]) =>
    ipcRenderer.invoke('fs:openFile', { filters }),

  platform: process.platform,

  showSaveDialog: (options: SaveDialogOptions) =>
    ipcRenderer.invoke('dialog:showSave', options),

  showOpenDialog: (options: OpenDialogOptions) =>
    ipcRenderer.invoke('dialog:showOpen', options),

  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on('menu:action', handler);
    // Return an unsubscribe function
    return () => {
      ipcRenderer.removeListener('menu:action', handler);
    };
  },
};

contextBridge.exposeInMainWorld('perrlaDesktop', api);
