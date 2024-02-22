import fetch from 'node-fetch';
import { BASE_URL as baseURL } from '../../config.js';
import { fileLogger, enableConsoleLogging, disableConsoleLogging } from '../logging/fileLogger.js';

export async function deleteStack(apiKey, authToken) {
    enableConsoleLogging();
    const url = `${baseURL}/stacks`;
    const headers = {
        'Content-Type': 'application/json',
        'api_key': apiKey,
        'authtoken': authToken
    };
    try {
        const response = await fetch(url, { method: 'DELETE', headers });
        const data = await response.json();
        console.warn('deleting stack... ', apiKey);
        console.success(data.notice);

    } catch (error) {
        console.error('\nError deleting stack:', error);
    }
    disableConsoleLogging();

}
