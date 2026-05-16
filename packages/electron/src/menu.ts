import { Menu, MenuItem, MenuItemConstructorOptions, shell, BrowserWindow, app } from 'electron';

export function buildMenu(win: BrowserWindow): Menu {
  const isMac = process.platform === 'darwin';

  const sendAction = (action: string) => {
    win.webContents.send('menu:action', action);
  };

  const fileMenu: MenuItemConstructorOptions = {
    label: 'File',
    submenu: [
      {
        label: 'New Paper',
        accelerator: 'CmdOrCtrl+N',
        click: () => sendAction('file:new'),
      },
      {
        label: 'Open Paper…',
        accelerator: 'CmdOrCtrl+O',
        click: () => sendAction('file:open'),
      },
      { type: 'separator' },
      {
        label: 'Save',
        accelerator: 'CmdOrCtrl+S',
        click: () => sendAction('file:save'),
      },
      {
        label: 'Save As…',
        accelerator: 'CmdOrCtrl+Shift+S',
        click: () => sendAction('file:saveAs'),
      },
      { type: 'separator' },
      {
        label: 'Export DOCX',
        accelerator: 'CmdOrCtrl+Shift+D',
        click: () => sendAction('file:exportDocx'),
      },
      {
        label: 'Export PDF',
        accelerator: 'CmdOrCtrl+Shift+P',
        click: () => sendAction('file:exportPdf'),
      },
      {
        label: 'Export Markdown',
        accelerator: 'CmdOrCtrl+Shift+M',
        click: () => sendAction('file:exportMarkdown'),
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  };

  const editMenu: MenuItemConstructorOptions = {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  };

  const viewMenu: MenuItemConstructorOptions = {
    label: 'View',
    submenu: [
      {
        label: 'Zoom In',
        accelerator: 'CmdOrCtrl+Plus',
        click: () => {
          const factor = win.webContents.getZoomFactor();
          win.webContents.setZoomFactor(Math.min(factor + 0.1, 3.0));
        },
      },
      {
        label: 'Zoom Out',
        accelerator: 'CmdOrCtrl+-',
        click: () => {
          const factor = win.webContents.getZoomFactor();
          win.webContents.setZoomFactor(Math.max(factor - 0.1, 0.3));
        },
      },
      {
        label: 'Reset Zoom',
        accelerator: 'CmdOrCtrl+0',
        click: () => {
          win.webContents.setZoomFactor(1.0);
        },
      },
      { type: 'separator' },
      {
        label: 'Toggle Sidebar',
        accelerator: 'CmdOrCtrl+\\',
        click: () => sendAction('view:toggleSidebar'),
      },
      {
        label: 'Toggle References Panel',
        accelerator: 'CmdOrCtrl+Shift+R',
        click: () => sendAction('view:toggleReferences'),
      },
      { type: 'separator' },
      { role: 'toggleDevTools' },
    ],
  };

  const helpMenu: MenuItemConstructorOptions = {
    label: 'Help',
    submenu: [
      {
        label: 'About PERRLA Free',
        click: () => sendAction('help:about'),
      },
      { type: 'separator' },
      {
        label: 'GitHub',
        click: async () => {
          await shell.openExternal('https://github.com/YourManz/perrla-free');
        },
      },
      {
        label: 'Report an Issue',
        click: async () => {
          await shell.openExternal('https://github.com/YourManz/perrla-free/issues/new');
        },
      },
    ],
  };

  const macAppMenu: MenuItemConstructorOptions = {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  };

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [macAppMenu] : []),
    fileMenu,
    editMenu,
    viewMenu,
    helpMenu,
  ];

  return Menu.buildFromTemplate(template);
}
