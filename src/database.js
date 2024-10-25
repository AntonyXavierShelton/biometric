
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const odbc = require('odbc');
const { createLogger, format, transports, query } = require('winston');
const { DateTime } = require('luxon');

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

const config = {
    "user": null,
    "password": null,
    "server": null,
    "database": null,
    "client_location": null,
    "client_name": null,
    "client_token": null,
    "data_push_interval": null,
    "server_key": null,
    "server_url": null,
    "username": null,

    "options": {
        "encrypt": false,
        "trustedConnection": true,
        "trustServerCertificate": true
    }
}

function getLoadedYamlFileForDatabaseConfiguration() {
    try {
        const fileContents = fs.readFileSync('config.yaml', 'utf8');
        const formData = yaml.load(fileContents);
        config.client_location = formData.client_location || '';
        config.client_name = formData.client_name || '';
        config.client_token = formData.client_token || '';
        config.data_push_interval = formData.data_push_interval || '';
        config.database = formData.database || '';
        config.password = formData.password || '';
        config.server_key = formData.server_key || '';
        config.server_url = formData.server_url || '';
        config.server = formData.sql_server || '';
        config.user = formData.username || '';
    } catch (e) {
        console.error('Error loading YAML file:', e);
    }
}

async function readDatabaseConnection() {
    const sqlServer = config.server;
    const database = config.database;
    const username = config.user;
    const password = config.password;
    const connectionString = `DRIVER={ODBC Driver 18 for SQL Server};SERVER=${sqlServer};DATABASE=${database};ENCRYPT=no;Trusted_Connection=yes;UID=${username};PWD=${password}`;
    try {
        // Select the status element
        const statusElement = document.getElementById('db_status');
        // Display connecting status message
        statusElement.textContent = 'Connecting to SQL Server...';
        // Establish connection
        const connection = await odbc.connect(connectionString);
        // Display connected status message
        statusElement.textContent = 'Connected to SQL Server.';
        return connection;
    } catch (error) {
        // Select the status element
        const statusElement = document.getElementById('db_status');
        // Display error message and connection failed status message
        statusElement.textContent = `Error connecting to SQL Server: ${error.message}`;
    }

}

async function selectTableAndColumn(columns, table_name, condition, association, childTable) {
    try {
        const Query = `SELECT ${columns} FROM ${config.database}.dbo.${table_name}`;
        condition && (`${Query}${condition}`)
        console.log(query);
        return Query
    }
    catch (error) {
        // Select the status element
        const statusElement = document.getElementById('db_status');
        // Display error message and connection failed status message
        statusElement.textContent = `Error connecting to SQL Server: ${error.message}`;
    }
}
async function selectAttendanceTableQuery(columns, table_name, condition) {
    try {
        // const Query = `SELECT ${columns} FROM ${config.database}.dbo.${table_name}`
        let Query = `SELECT ${columns}
        FROM ${config.database}.dbo.${table_name} ${condition}
    `;
        // condition && (`${Query}${condition}`)
        // console.log(query);
        return Query
    }
    catch (error) {
        // Select the status element
        const statusElement = document.getElementById('db_status');
        // Display error message and connection failed status message
        statusElement.textContent = `Error connecting to SQL Server: ${error.message}`;
    }
}

async function countTableAndColumn(column, table_name, whereCondition) {
    try {
        const Query = `SELECT COUNT (${column}) FROM ${config.database}.dbo.${table_name} WHERE ${whereCondition} `;
        console.log(query);
        return Query
    }
    catch (error) {
        // Select the status element
        const statusElement = document.getElementById('db_status');
        // Display error message and connection failed status message
        statusElement.textContent = `Error connecting to SQL Server: ${error.message}`;
    }
}

async function postMethod(url, body) {
    const statusElement = document.getElementById('db_status');
    try {
        let finalUrl = `https:/api.abshrms.com/biometric/${url}`
        // let finalUrl = `https://8kkt9vj3-5000.inc1.devtunnels.ms/biometric/${url}`
        const response = await fetch(finalUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        statusElement.textContent = data
        return data;
    } catch (error) {
        statusElement.textContent = error
        console.error('Error making POST request:', error);
        throw error;
    }
}

async function findAttendanceSource() {
    const readServer = await postMethod('read', {})
    const statusElement = document.getElementById('db_status');
    if (readServer?.result) {
        const connection = await readDatabaseConnection();
        // statusElement.textContent = JSON.stringify(readServer);
        let dateString = "10-2024"; // Sample input date string
        const con = await findStartAndEndDate(dateString).then(([startDate, endDate, tmp_table_name]) => {
            // return `Table ${tmp_table_name} Start date: ${startDate.toFormat('yyyy-MM-dd')}, End date: ${endDate.toFormat('yyyy-MM-dd')}`;
            return { startDate: startDate, endDate: endDate, tableName: tmp_table_name };
        });
        // statusElement.textContent = readServer?.data?.last_id || 1;
        // statusElement.textContent = readServer?.data?.last_id || 1;
        // Loop through dates
        for (let dt = con.startDate; dt < con.endDate; dt = dt.plus({ months: 1 })) {
            console.log(`Pushing data of period - ${con.startDate.toFormat('yyyy-M')} ${con.endDate.toFormat('yyyy-M')}`);
            const last_id = readServer?.data?.last_id
            logger.info('last_id', last_id);
            const query = await countTableAndColumn('LogDate', con.tableName, `DeviceLogId >= ${last_id}`);
            const countResult = await connection.query(query);
            const noOfRows = Object.values(countResult[0]);
            const selectQueryCondition = `WHERE DeviceLogId >= ${last_id}  ORDER
        BY LogDate`
            const selectQuery = await selectAttendanceTableQuery('DeviceLogId,DeviceId,UserId,LogDate,C1 AS AttDirection', con.tableName, selectQueryCondition);
            // Log the retrieved values
            const selectQueryResult = await connection.query(selectQuery);
            // statusElement.textContent = JSON.stringify(selectQueryResult)
            await splitArrayIntoBatch(noOfRows, selectQueryResult, 10, con.tableName);
            logger.info('Values from DeviceLogs_5_2024 table:', selectQueryResult);
        }
    }else{
        statusElement.textContent = 'All records already sent to server... jude'
    }
}

async function splitArrayIntoBatch(noOfRows, originalArray, batchSize, tableName) {
    let startIndex = 0;
    while (startIndex < noOfRows) {
        const endIndex = Math.min(startIndex + batchSize, noOfRows);
        let responseArray = originalArray.slice(startIndex, endIndex);
        let formattedArray = await attendanceResponseFormatter(responseArray, tableName, startIndex)
        startIndex += batchSize;
        displayValues(formattedArray);
        const postResponse = await postMethod('create', formattedArray)
    }

}

async function findStartAndEndDate(dateString) {
    const [month, year] = dateString.split("-").map(Number);
    const startDate = DateTime.local(year, month, 1);
    const endDate = startDate.plus({ months: 1 });
    const tmp_table_name = `DeviceLogs_${startDate.toFormat('M')}_${startDate.toFormat('yyyy')}`; // Format the table name
    return [startDate, endDate, tmp_table_name];
}
// Function to check if a table exists
async function checkTableExists(tableName) {
    try {
        const statusElement = document.getElementById('db_status');
        // Connect to the SQL Server
        const connection = await readDatabaseConnection();
        // Query to check if the table exists
        const result = await connection.query(`
            SELECT COUNT(*) AS TableExists 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = '${tableName}'
        `);

        // Check the result
        if (result) {
            console.log(`Table '${tableName}' exists.`);
            statusElement.textContent = `Table '${tableName}' exists.`;
            await connection.close();
            return true
        } else {
            console.log(`Table '${tableName}' does not exist.`);
            statusElement.textContent = `Table '${tableName}' does not exists.`;
            await connection.close();
            return false
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Function to display values in HTML table
function displayValues(values) {
    // Select the table element
    const tableElement = document.getElementById('valuesTable');

    // Clear previous contents of the table
    tableElement.innerHTML = '';

    // Create table header row
    const headerRow = document.createElement('tr');
    for (const key in values[0]) {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    }
    tableElement.appendChild(headerRow);

    // Create table rows for each record
    values.forEach(record => {
        const row = document.createElement('tr');
        for (const key in record) {
            const td = document.createElement('td');
            td.textContent = record[key];
            row.appendChild(td);
        }
        tableElement.appendChild(row);
    });
}

async function attendanceResponseFormatter(array, tableName, batch) {
    // Get the current date and time in the local timezone
    const currentLocalDateTime = DateTime.local();
    // Get the local timezone abbreviation
    const localTimezoneAbbr = currentLocalDateTime.toFormat('ZZZ');
    return array.map(item => {
        return {
            batch_no: batch,
            device_log_id: item.DeviceLogId,
            device_id: item.DeviceId,
            user_id: item.UserId,
            log_date: item.LogDate,
            attendance_direction: item.AttDirection,
            table_name: tableName,
            local_timezone: localTimezoneAbbr
        }
    })
}


// Boimetric device finder
async function getBiometricDevices() {
    const statusElement = document.getElementById('db_status');
    const connection = await readDatabaseConnection();
    const selectQuery = await selectTableAndColumn('*', 'Devices', null);
    statusElement.textContent = selectQuery
    // Log the retrieved values
    const selectQueryResult = await connection.query(selectQuery);
    await postMethod('biometric-devices', selectQueryResult)
}

let i = 0
async function schedule() {
    const statusElement = document.getElementById('db_status');
    statusElement.textContent = `running... ${i}`;
    // await getBiometricDevices()
    await findAttendanceSource()
    i++
}

function Main() {
    setInterval(async () => {
        await schedule();
    }, 10000);
}
module.exports = {
    Main, getLoadedYamlFileForDatabaseConfiguration
};


// Function to connect to SQL Server using ODBC
// async function connectToSqlServer() {
//     try {
//         const statusElement = document.getElementById('db_status');
//         const connection = await readDatabaseConnection();
//         const query = await selectTableAndColumn('*', 'EmployeesBio');
//         // const query = await selectTableAndColumn('DeviceLogId,DeviceId,UserId,LogDate,C1 AS AttDirection', 'DeviceLogs_5_2024');
//         statusElement.textContent = query;
//         // Log the retrieved values
//         const countResult = await connection.query(query);
//         // Log the retrieved values
//         logger.info('Values from DeviceLogs_5_2024 table:', countResult);

//         // displayValues(countResult);
//         // Close connection
//         await connection.close();
//         statusElement.textContent = 'Connection closed.';
//     } catch (error) {
//         // Select the status element
//         const statusElement = document.getElementById('db_status');

//         // Display error message and connection failed status message
//         statusElement.textContent = `Error connecting to SQL Server: ${error.message}`;
//     }
// }
