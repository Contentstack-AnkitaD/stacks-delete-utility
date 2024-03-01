import fetch from 'node-fetch';
import { disableConsoleLogging, enableConsoleLogging } from '../logging/fileLogger.js';
import { DEVELOPERHUB_BASE_URL } from '../../config.js';

export async function deleteInstallations(installation_uid, authToken, org_uid) {
    enableConsoleLogging()

    const url = `${DEVELOPERHUB_BASE_URL}/installations/${installation_uid}`;
    const headers = {
        'Content-Type': 'application/json',
        'authToken': authToken,
        'organization_uid': org_uid
    };



    try {
        console.warn('uninstalling:', installation_uid);

        const response = await fetch(url, {
            method: 'DELETE',
            headers: headers
        });

        if (!response.ok) {
            console.error(`Failed to uninstall ${installation_uid}`, response.status, response.statusText);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error(`Error uninstalling the App: ${error}`);
    }
    disableConsoleLogging();

}
