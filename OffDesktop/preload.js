const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('off', {
  onTick: (cb) => ipcRenderer.on('tick', (_e, left) => cb(left)),
  cancel: () => ipcRenderer.send('cancel'),
  getInfo: () => ipcRenderer.invoke('info'),
});
