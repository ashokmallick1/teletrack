import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import path from 'path';
import { DesktopTracker, ActiveWindowSample } from './tracker';
import { DesktopApiClient } from './api';
import { IngestDesktopActivityDto, WorkStatus } from '@teletrack/shared-types';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let tracker: DesktopTracker | null = null;
let isQuitting = false;
const apiClient = new DesktopApiClient();

// Live State
let currentWorkStatus: WorkStatus = 'WORKING';
let liveSample: ActiveWindowSample | null = null;
let queuedSlots: IngestDesktopActivityDto[] = [];
let todayActiveSeconds = 0;
let todayProductiveSeconds = 0;
let todayIdleSeconds = 0;

// Create a simple procedural tray icon (16x16 PNG buffer with letter 'T')
function createTrayIcon(color = '#3b82f6'): Electron.NativeImage {
  // A clean 16x16 bitmap with a colored circle
  const size = 16;
  const canvas = nativeImage.createEmpty();
  // Use nativeImage dataURL for cross-platform reliability without external assets
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="4" fill="${color}"/>
    <text x="50%" y="72%" font-family="Arial, sans-serif" font-weight="bold" font-size="11" fill="white" text-anchor="middle">T</text>
  </svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function updateTrayMenu() {
  if (!tray) return;

  const isEnrolled = apiClient.isEnrolled();
  const employeeName = apiClient.config.employeeName || 'Not Logged In';

  const contextMenu = Menu.buildFromTemplate([
    { label: `TeleTrack: ${employeeName}`, enabled: false },
    { label: `Status: ${currentWorkStatus}`, enabled: false },
    { type: 'separator' },
    {
      label: currentWorkStatus === 'WORKING' ? 'Pause Work' : 'Clock In / Resume Work',
      enabled: isEnrolled,
      click: () => {
        handleClockAction(currentWorkStatus === 'WORKING' ? 'CLOCK_OUT' : 'CLOCK_IN');
      }
    },
    {
      label: currentWorkStatus === 'ON_BREAK' ? 'End Break' : 'Take a Break',
      enabled: isEnrolled,
      click: () => {
        handleClockAction(currentWorkStatus === 'ON_BREAK' ? 'BREAK_END' : 'BREAK_START');
      }
    },
    { type: 'separator' },
    {
      label: 'Open TeleTrack Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Quit Agent',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`TeleTrack Desktop Agent (${currentWorkStatus})`);
}

function getAppState() {
  return {
    isEnrolled: apiClient.isEnrolled(),
    config: apiClient.config,
    workStatus: currentWorkStatus,
    liveSample,
    todayStats: {
      activeSeconds: todayActiveSeconds,
      productiveSeconds: todayProductiveSeconds,
      idleSeconds: todayIdleSeconds,
      productivePercentage: todayActiveSeconds > 0 ? Math.round((todayProductiveSeconds / todayActiveSeconds) * 100) : 0
    }
  };
}

function broadcastState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state-update', getAppState());
  }
  updateTrayMenu();
}

async function handleClockAction(type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END') {
  if (type === 'CLOCK_IN' || type === 'BREAK_END') {
    currentWorkStatus = 'WORKING';
  } else if (type === 'CLOCK_OUT') {
    currentWorkStatus = 'OFFLINE';
  } else if (type === 'BREAK_START') {
    currentWorkStatus = 'ON_BREAK';
  }

  await apiClient.recordClock(type);
  broadcastState();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 440,
    height: 640,
    resizable: false,
    frame: false,
    show: true,
    title: 'TeleTrack Desktop Agent',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  mainWindow.on('close', event => {
    // Minimize to tray instead of quitting
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

// Activity flush interval (every 30 seconds)
setInterval(async () => {
  if (!apiClient.isEnrolled() || currentWorkStatus === 'OFFLINE') return;

  if (queuedSlots.length > 0) {
    const slotsToUpload = [...queuedSlots];
    queuedSlots = [];

    const ok = await apiClient.uploadActivity(
      slotsToUpload,
      currentWorkStatus,
      liveSample?.processName,
      liveSample?.windowTitle
    );

    if (!ok) {
      // Re-queue on network error
      queuedSlots.unshift(...slotsToUpload.slice(-50));
    }
  } else {
    // Send periodic heartbeat even if no active slots
    await apiClient.uploadActivity(
      [],
      currentWorkStatus,
      liveSample?.processName,
      liveSample?.windowTitle
    );
  }
}, 30000);

// Initialize App
app.whenReady().then(() => {
  createWindow();

  // Create Tray
  tray = new Tray(createTrayIcon('#2563eb'));
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
  updateTrayMenu();

  // Start Tracker
  tracker = new DesktopTracker(180000);
  tracker.start(sample => {
    liveSample = sample;

    if (currentWorkStatus === 'WORKING' || currentWorkStatus === 'IDLE') {
      // Auto-update workStatus based on idle detection
      if (sample.isIdle) {
        currentWorkStatus = 'IDLE';
        todayIdleSeconds += 5;
      } else {
        currentWorkStatus = 'WORKING';
        todayActiveSeconds += 5;
        if (sample.category === 'PRODUCTIVE') {
          todayProductiveSeconds += 5;
        }
      }

      queuedSlots.push({
        startedAt: sample.timestamp,
        durationSeconds: 5,
        processName: sample.processName,
        windowTitle: sample.windowTitle,
        category: sample.category,
        isIdle: sample.isIdle,
        idleSeconds: Math.round(sample.idleMs / 1000)
      });
    }

    broadcastState();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  tracker?.stop();
});

// IPC Handlers
ipcMain.handle('get-state', () => getAppState());

ipcMain.handle('login', async (_event, data) => {
  if (data.apiUrl) {
    apiClient.saveConfig({ apiUrl: data.apiUrl });
  }
  const result = await apiClient.enroll(data.email, data.password, data.orgCode);
  currentWorkStatus = 'WORKING';
  broadcastState();
  return result;
});

ipcMain.handle('logout', () => {
  apiClient.clearConfig();
  currentWorkStatus = 'OFFLINE';
  broadcastState();
  return { success: true };
});

ipcMain.handle('clock-action', async (_event, type) => {
  await handleClockAction(type);
  return { success: true };
});

ipcMain.handle('minimize-to-tray', () => {
  mainWindow?.hide();
});

ipcMain.handle('quit-app', () => {
  isQuitting = true;
  app.quit();
});
