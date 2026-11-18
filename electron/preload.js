const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('windowControls', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  openReadingPlanner: () => ipcRenderer.invoke('reading-planner:open'),
  openEditBook: (bookId) => ipcRenderer.invoke('edit-book:open', bookId),
  quit: () => ipcRenderer.invoke('app:quit'),
  captureScreenshot: () => ipcRenderer.invoke('window:capture-screenshot'),
  showNotification: (title, body) => ipcRenderer.invoke('reading-reminder:notify', title, body),
  onMaximizeState: (callback) => {
    const listener = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window:maximize-state', listener);
    return () => ipcRenderer.removeListener('window:maximize-state', listener);
  },
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})