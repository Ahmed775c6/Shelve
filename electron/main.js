const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

const isDev = false;
const PORT = isDev ? 3000 : 3001;
const LOADING_SCREEN_DURATION_MS = 5000;

let errorWindow = null;

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
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      plugins: true,
    },
  });

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
