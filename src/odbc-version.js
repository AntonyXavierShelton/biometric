const { exec } = require('child_process');
const { dialog, shell } = require('electron');

const sqlServerVersions = [
    { version: 'SQL Server 2022', odbcDriver: 'ODBC Driver 18 for SQL Server' },
    { version: 'SQL Server 2019', odbcDriver: 'ODBC Driver 17 for SQL Server' },
    { version: 'SQL Server 2017', odbcDriver: 'ODBC Driver 17 for SQL Server' },
    { version: 'SQL Server 2016', odbcDriver: 'ODBC Driver 13 for SQL Server' },
    { version: 'SQL Server 2014', odbcDriver: 'ODBC Driver 13 for SQL Server' },
    { version: 'SQL Server 2012', odbcDriver: 'ODBC Driver 11 for SQL Server' },
    { version: 'SQL Server 2008 R2', odbcDriver: 'ODBC Driver 11 for SQL Server' },
    { version: 'SQL Server 2008', odbcDriver: 'ODBC Driver 11 for SQL Server' },
    { version: 'SQL Server 2005', odbcDriver: 'ODBC Driver 11 for SQL Server' },
    { version: 'SQL Server 2000', odbcDriver: 'SQL Server ODBC Driver 2000' },
    { version: 'SQL Server 7.0', odbcDriver: 'SQL Server ODBC Driver 7.0' },
    { version: 'SQL Server 6.5', odbcDriver: 'SQL Server ODBC Driver 6.5' },
    { version: 'SQL Server Future', odbcDriver: 'ODBC Driver 18 for SQL Server' }, // Assume latest known driver
];

function checkODBCDriver(mainWindow) {
  const platform = process.platform;
  if (platform === 'win32') {
    checkODBCDriverWindows(mainWindow);
  } else {
    checkODBCDriverUnix(mainWindow);
  }
}

function checkODBCDriverWindows(mainWindow) {
  exec('reg query "HKLM\\SOFTWARE\\ODBC\\ODBCINST.INI\\ODBC Drivers"', (error, stdout, stderr) => {
    if (error || stderr || !stdout || stdout.trim() === '') {
      showODBCInstallDialog(mainWindow);
    } else {
      const found = sqlServerVersions.some(version => stdout.includes(version.odbcDriver));
      console.log(found);
      if (!found) {
        showODBCInstallDialog(mainWindow, 'Windows');
      } else {
        console.log('Suitable ODBC Drivers found:', stdout);
      }
    }
  });
}

function checkODBCDriverUnix(mainWindow) {
  exec('odbcinst -q -d', (error, stdout, stderr) => {
    if (error || stderr || !stdout || stdout.trim() === '') {
      showODBCInstallDialog(mainWindow);
    } else {
      const found = sqlServerVersions.some(version => stdout.includes(version.odbcDriver));
      if (!found) {
        showODBCInstallDialog(mainWindow, 'Unix');
      } else {
        console.log('Suitable ODBC Drivers found:', stdout);
      }
    }
  });
}

function showODBCInstallDialog(mainWindow, platform) {
  const platformType = process.platform;
  let detailMessage = `Please install the ODBC Driver for ${platformType} SQL Server. You can download it from the official Microsoft website.`;
  const downloadUrl = 'https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server';

  const { version, description } = getSuitableODBCVersion(platform);
  console.log(`Suitable ODBC version for your system: ${description} (Version: ${version})`);
  const options = {
    type: 'info',
    buttons: ['OK', 'Download Now'],
    title: `ODBC Driver Not Found - Suitable Version is ${version}`,
    message: 'No suitable ODBC Driver is installed on your system.',
    detail: detailMessage,
  };

  dialog.showMessageBox(mainWindow, options).then((response) => {
    if (response.response === 1) {
      shell.openExternal(downloadUrl);
    }
  });
}

function getSuitableODBCVersion(platform) {
  // Select the latest driver based on the platform
  if (platform === 'Windows') {
    return {
      version: 'ODBC Driver 18 for SQL Server',
      description: 'ODBC Driver 18 for SQL Server',
    };
  } else {
    return {
      version: 'ODBC Driver 18 for SQL Server',
      description: 'ODBC Driver 18 for SQL Server',
    };
  }
}

module.exports = {
  checkODBCDriver,
  checkODBCDriverWindows,
  checkODBCDriverUnix,
  showODBCInstallDialog,
};
