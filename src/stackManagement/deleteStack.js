import fetch from 'node-fetch';
import { CDA_URL as baseURL } from '../../config.js';
import { fileLogger, enableConsoleLogging, disableConsoleLogging } from '../logging/fileLogger.js';

export async function deleteStack(apiKey, authToken, url = `${baseURL}/stacks`) {
    enableConsoleLogging();
    const headers = {
        'Content-Type': 'application/json',
        'api_key': apiKey,
        'authtoken': authToken
    };
    try {
        const response = await fetch(url, { method: 'DELETE', headers });
        const data = await response.json();
        console.warn('deleting stack... ', apiKey, "with auth token", authToken);
        disableConsoleLogging();
        console.log('data', data);
        if (!response.ok) {
            if (response.status === 308) {
                console.log("V3 stack found. redirecting to v3 stack deletion endpoint")
                const v3Url = `${baseURL}/stacks/v3`;
                await deleteStack(apiKey, authToken, v3Url);
            }
        }
        enableConsoleLogging();
        if (response.ok) {
            console.success(data.notice);
        }
        else {
            console.error('\nError deleting stack:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('\nError deleting stack:', error);
    }
    disableConsoleLogging();

}
