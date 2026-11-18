const { app, BrowserWindow, Notification, dialog, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

const isDev = true ;
const PORT = isDev ? 3000 : 3001;
const LOADING_SCREEN_DURATION_MS = 5000;

let errorWindow = null;
let readingPlannerWindow = null;

ipcMain.handle('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) {
    throw new Error('Could not find the Shelve window to minimize.');
  }

  win.minimize();
  return true;
});

ipcMain.handle('window:toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) {
    throw new Error('Could not find the Shelve window to maximize.');
  }

  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
  return true;
});

ipcMain.on('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle('app:quit', (event) => {
  if (!BrowserWindow.fromWebContents(event.sender)) {
    throw new Error('Could not identify the Shelve window requesting the application to quit.');
  }

  app.quit();
  return true;
});

ipcMain.handle('window:capture-screenshot', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) {
    throw new Error('Could not find the Shelve window to capture.');
  }

  const image = await win.capturePage();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Save screenshot',
    defaultPath: path.join(app.getPath('pictures'), `shelve-screenshot-${timestamp}.png`),
    filters: [{ name: 'PNG image', extensions: ['png'] }],
  });

  if (canceled || !filePath) return null;

  await fs.promises.writeFile(filePath, image.toPNG());
  return filePath;
});

ipcMain.handle('window:is-maximized', (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});

ipcMain.handle('reading-planner:open', async (event) => {
  const requester = BrowserWindow.fromWebContents(event.sender);
  if (!requester) {
    throw new Error('Could not find the Shelve window that requested the reading planner.');
  }

  if (readingPlannerWindow && !readingPlannerWindow.isDestroyed()) {
    if (requester === readingPlannerWindow) {
      readingPlannerWindow.close();
      return true;
    }

    if (readingPlannerWindow.isMinimized()) readingPlannerWindow.restore();
    readingPlannerWindow.show();
    readingPlannerWindow.focus();
    return true;
  }

  const plannerWindow = new BrowserWindow({
    width: 720,
    height: 500,
    minWidth: 560,
    minHeight: 400,
    center: true,
    frame: false,
    show: false,
    resizable: true,
    minimizable: true,
    maximizable: true,
    backgroundColor: '#0f0e0c',
    title: 'Shelve — Reading planner',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });
  readingPlannerWindow = plannerWindow;

  const sendPlannerMaximizeState = () => {
    if (!plannerWindow.isDestroyed()) {
      plannerWindow.webContents.send('window:maximize-state', plannerWindow.isMaximized());
    }
  };
  plannerWindow.on('maximize', sendPlannerMaximizeState);
  plannerWindow.on('unmaximize', sendPlannerMaximizeState);
  plannerWindow.once('ready-to-show', () => {
    if (!plannerWindow.isDestroyed()) plannerWindow.show();
  });
  plannerWindow.once('closed', () => {
    if (readingPlannerWindow === plannerWindow) readingPlannerWindow = null;
  });
  try {
    await plannerWindow.loadURL(`http://localhost:${PORT}/reading-planner-window`);
  } catch (error) {
    console.error('Failed to open the reading planner window:', error);
    if (!plannerWindow.isDestroyed()) plannerWindow.close();
    throw error;
  }

  return true;
});

ipcMain.handle('reading-reminder:notify', (event, title, body) => {
  if (!BrowserWindow.fromWebContents(event.sender)) {
    throw new Error('Could not identify the Shelve window requesting a notification.');
  }
  if (typeof title !== 'string' || typeof body !== 'string') {
    throw new Error('Reading notification content must be text.');
  }
  if (!Notification.isSupported()) return false;

  new Notification({
    title: title.slice(0, 120),
    body: body.slice(0, 500),
  }).show();
  return true;
});

const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const val = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  }
}

function showErrorWindow(title, errorDetails) {
  const formattedError = String(errorDetails || 'Unknown error occurred')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Application Error</title>
        <style>
          body {
            background-color: #18181b;
            color: #f4f4f5;
            font-family: monospace;
            padding: 24px;
            margin: 0;
          }
          h2 {
            color: #f87171;
            margin-top: 0;
            font-size: 18px;
          }
          pre {
            background: #09090b;
            border: 1px solid #27272a;
            border-radius: 6px;
            padding: 16px;
            white-space: pre-wrap;
            word-break: break-word;
            font-size: 13px;
            line-height: 1.5;
            color: #fca5a5;
          }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <pre>${formattedError}</pre>
      </body>
    </html>
  `;

  const openWindow = () => {
    if (errorWindow && !errorWindow.isDestroyed()) {
      errorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      errorWindow.focus();
      return;
    }

    errorWindow = new BrowserWindow({
      width: 750,
      height: 500,
      title: 'Application Error',
      webPreferences: {
        contextIsolation: true,
      },
    });

    errorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    errorWindow.on('closed', () => {
      errorWindow = null;
    });
  };

  if (app.isReady()) {
    openWindow();
  } else {
    app.whenReady().then(openWindow);
  }
}

process.on('uncaughtException', (err) => {
  showErrorWindow('Uncaught Exception', err.stack || err.message);
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
  showErrorWindow('Unhandled Promise Rejection', message);
});

const originalConsoleError = console.error;
console.error = (...args) => {
  originalConsoleError(...args);
  const message = args
    .map((arg) => (arg instanceof Error ? arg.stack || arg.message : String(arg)))
    .join(' ');

  if (message.includes('[MONGOOSE] Warning:') || message.includes('DeprecationWarning')) {
    return;
  }

  showErrorWindow('Server Console Error', message);
};

function waitForServer(url, callback) {
  let attempts = 0;
  const maxAttempts = 50;

  const interval = setInterval(() => {
    attempts++;
    http
      .get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 307 || res.statusCode === 302) {
          clearInterval(interval);
          callback();
        }
      })
      .on('error', (err) => {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          showErrorWindow(
            'Server Startup Timeout',
            `Could not connect to ${url} after 10 seconds.\nLast error: ${err.message}`
          );
        }
      });
  }, 200);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 600,
    frame: false,
    backgroundColor: '#1a1916',
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'Shelve - Your Personal Laibary',
    devTools: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      plugins: true,
      backgroundThrottling: false,
    },
  });

  const sendMaximizeState = () => {
    if (!win.isDestroyed()) {
      win.webContents.send('window:maximize-state', win.isMaximized());
    }
  };
  win.on('maximize', sendMaximizeState);
  win.on('unmaximize', sendMaximizeState);

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    if (!validatedURL.startsWith(`http://localhost:${PORT}`)) {
      return;
    }

    showErrorWindow(
      'Window Failed to Load',
      `URL: ${validatedURL}\nError Code: ${errorCode}\nDescription: ${errorDescription}`
    );
  });

  win.loadFile(path.join(__dirname, 'laoding.html'));
  return win;
}

function loadAppAfterSplash(win, loadingStartedAt) {
  const remainingTime = Math.max(
    0,
    LOADING_SCREEN_DURATION_MS - (Date.now() - loadingStartedAt)
  );

  setTimeout(() => {
    if (!win.isDestroyed()) {
      win.loadURL(`http://localhost:${PORT}`);
    }
  }, remainingTime);
}

app.whenReady().then(() => {
  if (isDev) {
    const loadingStartedAt = Date.now();
    const win = createWindow();
    loadAppAfterSplash(win, loadingStartedAt);
  } else {
    try {
      const userUploadsDir = path.join(app.getPath('userData'), 'uploads');
      if (!fs.existsSync(userUploadsDir)) {
        fs.mkdirSync(userUploadsDir, { recursive: true });
      }

      process.env.UPLOADS_DIR = userUploadsDir;
      process.env.PORT = PORT.toString();
      process.env.HOSTNAME = 'localhost';
      process.env.NEXTAUTH_URL = `http://localhost:${PORT}`;

      const loadingStartedAt = Date.now();
      const win = createWindow();
      const serverPath = path.join(__dirname, '../.next/standalone/server.js');
      require(serverPath);

      waitForServer(`http://localhost:${PORT}`, () => {
        loadAppAfterSplash(win, loadingStartedAt);
      });
    } catch (err) {
      showErrorWindow('Failed to Start Standalone Server', err.stack || err.message);
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
