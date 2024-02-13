// import fs from 'fs';
// import path from 'path';

// //------ Function to set up file logging
// function fileLogger() {
//     const logsDirectory = path.join(process.cwd(), 'logs');
//     //------ Create the logs directory if it doesn't exist
//     if (!fs.existsSync(logsDirectory)) {
//         fs.mkdirSync(logsDirectory);
//         console.log(`Logs directory created at: ${logsDirectory}`);
//     }

//     const currentDate = new Date().toISOString().replace(/:/g, '-');
//     const logFileName = `file_${currentDate}.log`;
//     const logFilePath = path.join(logsDirectory, logFileName);
//     // const logFilePath = path.join(logsDirectory, 'console.log');


//     //------ Create a write stream to the log file
//     const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

//     //------ Override console.log to write to file
//     console.log = function (...args) {
//         // Write to the log file
//         logStream.write(`${args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg)).join(' ')}\n`);
//     };
// }

// export default fileLogger;


import fs from 'fs';
import path from 'path';

let writeToConsole = false;

// Function to set up file logging
function fileLogger() {
    const logsDirectory = path.join(process.cwd(), 'logs');
    // Create the logs directory if it doesn't exist
    if (!fs.existsSync(logsDirectory)) {
        fs.mkdirSync(logsDirectory);
        console.log(`Logs directory created at: ${logsDirectory}`);
    }

    const currentDate = new Date().toISOString().replace(/:/g, '-');
    const logFileName = `file_${currentDate}.log`;
    const logFilePath = path.join(logsDirectory, logFileName);

    // Create a write stream to the log file
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

    // Store the original console.log
    const originalConsoleLog = console.log;

    // Override console.log to write to file by default
    console.log = function (...args) {
        // Write to the log file
        logStream.write(`${args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg)).join(' ')}\n`);
        
        // Log to the console if writeToConsole is true
        if (writeToConsole) {
            originalConsoleLog.apply(console, args);
        }
    };
}

// Function to enable logging to console
function enableConsoleLogging() {
    writeToConsole = true;
}

// Function to disable logging to console
function disableConsoleLogging() {
    writeToConsole = false;
}

export { fileLogger, enableConsoleLogging, disableConsoleLogging };
