const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const odbc = require('odbc');
const { execSync } = require('child_process');

const { createLogger, format, transports } = require('winston');
const { Main, getLoadedYamlFileForDatabaseConfiguration } = require('./database');

// Set up winston logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'app.log' })
  ]
});

// Function to load YAML data and populate form fields
function saveToYAML() {
  try {
    const formData = {
      client_location: document.getElementById('client_location')?.value ?? "abs_chennai",
      client_name: document.getElementById('client_name')?.value ?? "abs",
      client_token: document.getElementById('client_token')?.value ?? "client_token",
      data_push_interval: document.getElementById('data_push_interval')?.value ?? null,
      database: document.getElementById('database')?.value ?? null,
      password: document.getElementById('password')?.value ?? null,
      server_key: document.getElementById('server_key')?.value ?? null,
      server_url: document.getElementById('server_url')?.value ?? null,
      sql_server: document.getElementById('sql_server')?.value ?? null,
      username: document.getElementById('username')?.value ?? null
    };
    const yamlStr = yaml.dump(formData);
    fs.writeFileSync('config.yaml', yamlStr, 'utf8');
    alert('Configuration saved to config.yaml');
    loadFromYAML()
  } catch (error) {
    alert(error)
    console.log(error);

  }
}

function loadFromYAML() {
  try {
    const fileContents = fs.readFileSync('config.yaml', 'utf8');
    const formData = yaml.load(fileContents);

    document.getElementById('client_location').value = formData.client_location || '';
    document.getElementById('client_name').value = formData.client_name || '';
    document.getElementById('client_token').value = formData.client_token || '';
    document.getElementById('data_push_interval').value = formData.data_push_interval || '';
    document.getElementById('database').value = formData.database || '';
    document.getElementById('password').value = formData.password || '';
    document.getElementById('server_key').value = formData.server_key || '';
    document.getElementById('server_url').value = formData.server_url || '';
    document.getElementById('sql_server').value = formData.sql_server || '';
    document.getElementById('username').value = formData.username || '';
  } catch (e) {
    console.error('Error loading YAML file:', e);
  }
}
// Load YAML data when the window loads
window.addEventListener('DOMContentLoaded', () => {
  loadFromYAML()
});




function getCurrentODBCVersion() {
  let version = 'N/A';
  try {
    // Execute a command to retrieve ODBC version on Windows
    const result = execSync('reg query "HKLM\\SOFTWARE\\ODBC\\ODBCINST.INI\\ODBC Drivers" /s').toString();
    const match = result.match(/^(.*ODBC\s*Driver\s*(\d+\.\d+).*)$/m);
    if (match && match[2]) {
      version = match[2];
    }
  } catch (error) {
    console.error('Error detecting ODBC version:', error);
  }
  const statusElement = document.getElementById('status');
  statusElement.textContent = `ODBC Version: ${version}`;
  return version;
}


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

function populateDropdown() {
  const selectElement = document.getElementById('sqlServerVersion');
  for (let i = 0; i < sqlServerVersions.length; i++) {
    const option = document.createElement('option');
    option.value = sqlServerVersions[i].version;
    option.text = sqlServerVersions[i].version;
    selectElement.appendChild(option);
  }
}

function suggestSuitableODBCDriverVersion(sqlServerVersion) {
  const versionInfo = sqlServerVersions.find(v => v.version === sqlServerVersion);
  if (versionInfo) {
    return versionInfo.odbcDriver;
  } else {
    return 'ODBC Driver for SQL Server'; // Default to a generic driver if version is not found
  }
}

function updateODBCDriver() {
  const selectedVersion = document.getElementById('sqlServerVersion').value;
  const suggestedDriver = suggestSuitableODBCDriverVersion(selectedVersion);
  document.getElementById('odbcDriver').innerText = `ODBC Driver: ${suggestedDriver}`;
}

// Call the function when the window loads
window.addEventListener('DOMContentLoaded', getCurrentODBCVersion);


// Populate the dropdown on page load
document.addEventListener('DOMContentLoaded', populateDropdown);
document.addEventListener('DOMContentLoaded', getLoadedYamlFileForDatabaseConfiguration);
document.addEventListener('DOMContentLoaded', Main);

// window.addEventListener('DOMContentLoaded', connectToSqlServer);


