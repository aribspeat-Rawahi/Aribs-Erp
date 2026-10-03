const { app, BrowserWindow, dialog, Menu, shell } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const pkg = require('../package.json');

// "Live URL mode": the app opens the real ERP website, so every server
// deploy reaches this app instantly - no reinstall needed for ERP changes.
// The address comes from package.json "erpServerUrl" (production by
// default; the staging test build sets it to the staging site).
const SERVER_URL = String(pkg.erpServerUrl || 'https://erp.aribs.net').replace(/\/+$/, '');
const SERVER_ORIGIN = new URL(SERVER_URL).origin;
const OFFLINE_PAGE = path.join(__dirname, 'offline.html');

let mainWindow;

function isOwnSite(url) {
  try {
    return new URL(url).origin === SERVER_ORIGIN;
  } catch {
    return false;
  }
}

// Opens anything that isn't our ERP (WhatsApp Web, Google Maps, ...) in the
// user's normal browser instead of inside the app. Only web links are
// passed on - never file:// or other local schemes.
function openExternally(url) {
  if (/^https?:\/\//i.test(url) || /^(mailto|tel|whatsapp):/i.test(url)) {
    shell.openExternal(url).catch(() => {});
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    icon: path.join(__dirname, '..', 'build-resources', 'icon.png'),
    title: 'ARIBS ERP',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Hide the default File/Edit/View menu bar - this should look and feel
  // like a normal business app, not a browser window.
  Menu.setApplicationMenu(null);

  // New windows: our own PDFs/files (blob: URLs created by the ERP page)
  // open in a plain in-app viewer window; everything else goes to the
  // user's browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('blob:') || isOwnSite(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
        },
      };
    }
    openExternally(url);
    return { action: 'deny' };
  });

  // Same rule for links that try to navigate the main window away from
  // the ERP.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isOwnSite(url) || url.startsWith('file://')) return;
    event.preventDefault();
    openExternally(url);
  });

  // No internet / server unreachable -> friendly offline page with a
  // "Try again" button instead of a blank window.
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, _desc, validatedURL, isMainFrame) => {
    // -3 = ERR_ABORTED (normal when a navigation is replaced) - ignore.
    if (!isMainFrame || errorCode === -3 || validatedURL.startsWith('file://')) return;
    mainWindow.loadFile(OFFLINE_PAGE, { query: { target: SERVER_URL } });
  });

  mainWindow.loadURL(SERVER_URL);
}

// Only one copy of the app at a time; a second launch focuses the first.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    // Look for a newer version of THIS app's installer on GitHub Releases.
    // Never touches the ERP server or its data. Safe to run every launch.
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('[AutoUpdater] Could not check for updates:', err?.message || err);
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- Update popups (electron-updater + GitHub Releases) ----

autoUpdater.on('update-available', (info) => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Update available',
    message: `Version ${info.version} is downloading in the background. You'll be asked to restart once it's ready - your work and data are never affected.`,
    buttons: ['OK'],
  });
});

autoUpdater.on('update-downloaded', (info) => {
  dialog
    .showMessageBox(mainWindow, {
      type: 'question',
      title: 'Update ready',
      message: `Version ${info.version} has been downloaded. Restart now to install it?`,
      detail: 'This only replaces the app itself - nothing in your ERP data on the server is touched.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    })
    .then((result) => {
      if (result.response === 0) autoUpdater.quitAndInstall();
    });
});

autoUpdater.on('error', (err) => {
  console.error('[AutoUpdater] Error while checking/downloading update:', err);
});
