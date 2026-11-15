import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('teletrackDesktop', {
  getState: () => ipcRenderer.invoke('get-state'),
  login: (data: { email: string; password: string; orgCode?: string; apiUrl?: string }) => ipcRenderer.invoke('login', data),
  logout: () => ipcRenderer.invoke('logout'),
  clockAction: (type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END') => ipcRenderer.invoke('clock-action', type),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  onStateUpdate: (callback: (state: any) => void) => {
    ipcRenderer.on('state-update', (_event, state) => callback(state));
  }
});
