const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('devforge', Object.freeze({
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  listDirectory: p => ipcRenderer.invoke('fs:listDirectory', p),
  readTextFile: p => ipcRenderer.invoke('fs:read', p),
  writeTextFile: p => ipcRenderer.invoke('fs:write', p),
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: s => ipcRenderer.invoke('settings:save', s),
  detectRuntimes: () => ipcRenderer.invoke('runtime:detect'),
  runCode: (code, language) => ipcRenderer.invoke('run:code', { code, language }),
  isDesktop: true
}));
