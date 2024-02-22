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
import chalk from 'chalk';

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

    const originalConsoleError = console.error;

    const originalConsoleWarn = console.warn;


    // Override console.log to write to file by default
    console.log = function (...args) {
        // Write to the log file
        logStream.write(`${args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg)).join(' ')}\n`);

        // Log to the console if writeToConsole is true
        if (writeToConsole) {
            originalConsoleLog.apply(console, args);
        }

    };

    function stripAnsi(str) {
        return str.replace(/\u001b\[[0-9]{1,2}m/g, '');
    }

    // Override console.error to write to file by default
    console.error = function (...args) {
        // Write to the log file
        let logMsg = `${args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : chalk.red(arg))).join(' ')}\n`;
        logStream.write(stripAnsi(logMsg));

        // Log to the console if writeToConsole is true
        if (writeToConsole) {
            originalConsoleError.apply(console, [chalk.red(...args)]);
        }

    };

    // Override console.error to write to file by default
    console.warn = function (...args) {
        // Write to the log file
        let logMsg = `${args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : chalk.yellow(arg))).join(' ')}\n`;
        logStream.write(stripAnsi(logMsg));

        // Log to the console if writeToConsole is true
        if (writeToConsole) {
            originalConsoleWarn.apply(console, [chalk.yellow(...args)]);
        }
    };

    // Override console.error to write to file by default
    console.success = function (...args) {
        // Write to the log file
        let logMsg = `${args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : chalk.greenBright(arg))).join(' ')}\n`;
        logStream.write(stripAnsi(logMsg));

        // Log to the console if writeToConsole is true
        if (writeToConsole) {
            originalConsoleLog.apply(console, [chalk.greenBright(...args)]);
        }
    };

    console.alert = function (...args) {
        // Write to the log file
        let logMsg = `${args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : chalk.cyanBright(arg))).join(' ')}\n`;
        logStream.write(stripAnsi(logMsg));

        // Log to the console if writeToConsole is true
        if (writeToConsole) {
            originalConsoleLog.apply(console, [chalk.cyanBright(...args)]);
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



async function allChalkColors() {
    console.log(chalk.red('This is red text'));
    console.log(chalk.redBright('This is bright red text'));
    console.log(chalk.bgRed('This is red background'));
    console.log(chalk.green('This is green text'));
    console.log(chalk.greenBright('This is bright green text'));
    console.log(chalk.bgGreen('This is green background'));
    console.log(chalk.blue('This is blue text'));
    console.log(chalk.blueBright('This is bright blue text'));
    console.log(chalk.bgBlue('This is blue background'));
    console.log(chalk.yellow('This is yellow text'));
    console.log(chalk.yellowBright('This is bright yellow text'));
    console.log(chalk.bgYellow('This is yellow background'));
    console.log(chalk.magenta('This is magenta text'));
    console.log(chalk.magentaBright('This is bright magenta text'));
    console.log(chalk.bgMagenta('This is magenta background'));
    console.log(chalk.cyan('This is cyan text'));
    console.log(chalk.cyanBright('This is bright cyan text'));
    console.log(chalk.bgCyan('This is cyan background'));
    console.log(chalk.white('This is white text'));
    console.log(chalk.whiteBright('This is bright white text'));
    console.log(chalk.bgWhite('This is white background'));
    console.log(chalk.gray('This is gray text'));
    console.log(chalk.bgGray('This is gray background'));
    console.log(chalk.grey('This is grey text'));
    console.log(chalk.bgGrey('This is grey background'));
    console.log(chalk.black('This is black text'));
    console.log(chalk.blackBright('This is bright black text'));
    console.log(chalk.bgBlack('This is black background'));
    console.log(chalk.bold('This is bold text'));
    console.log(chalk.italic('This is italic text'));
    console.log(chalk.underline('This is underlined text'));
    console.log(chalk.strikethrough('This is strikethrough text'));
    console.log(chalk.inverse('This is inverse text'));
    console.log(chalk.hidden('This is hidden text'));
    console.log(chalk.reset('This is reset text'));
    console.log(chalk.dim('This is dim text'));
}