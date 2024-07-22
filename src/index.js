const { exec } = require('child_process');
const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const os = require('os');
const AutoLaunch = require('auto-launch');
const storage = require('node-persist');
const { checkODBCDriver } = require('./odbc-version');
// const electronReload = require('electron-reload');

// Set the directory to watch for changes
// electronReload(__dirname);

let store; // We'll load electron-store dynamically later
let mainWindow;
let autoLauncher;

// const { checkODBCDriver } = require('./odbc-version');
// require('electron-reload')(path.join(__dirname, '**/*'), {
//   electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron')
// });
// Function to check if the MySQL ODBC driver is installed
function isMySQLODBCInstalled() {
  // Execute the command to list ODBC drivers
  const result = child_process.execSync('odbcad32.exe /l').toString();

  // Check if MySQL ODBC driver is in the result
  return result.includes('MySQL ODBC');
}
function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  mainWindow = win
  win.loadFile('src/index.html');
  checkODBCDriver(win)

}


async function askAutoLaunchPermission() {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Yes', 'No'],
    defaultId: 0,
    cancelId: 1,
    title: 'Auto Launch',
    message: 'Do you want this application to start automatically on system startup?'
  });

  return result.response === 0; // User clicked 'Yes'
}

async function handleAutoLaunch() {
  const isAutoLaunchEnabled = await storage.getItem('AbshrmsBiometricAutoLaunchEnabled');
  console.log(isAutoLaunchEnabled);
  if (isAutoLaunchEnabled === undefined) {
    const userConsent = await askAutoLaunchPermission();
    await storage.setItem('AbshrmsBiometricAutoLaunchEnabled', userConsent);
    if (userConsent) {
      autoLauncher.enable();
    } else {
      autoLauncher.disable();
    }
  } else {
    if (isAutoLaunchEnabled) {
      autoLauncher.enable();
    } else {
      autoLauncher.disable();
    }
  }
}

app.whenReady().then(async () => {
  await storage.init(); // Initialize node-persist storage
  createWindow();

  autoLauncher = new AutoLaunch({
    name: 'ABShrms Biometric Integration',
    path: app.getPath('exe')
  });

  await handleAutoLaunch();
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
