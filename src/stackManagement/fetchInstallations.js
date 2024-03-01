import fetch from 'node-fetch';
import { disableConsoleLogging, enableConsoleLogging } from '../logging/fileLogger.js';
import { userInformation } from '../../index.js';
import { DEVELOPERHUB_BASE_URL } from '../../config.js';

export async function fetchInstallations(target_uids, authToken, org_uid) {

    enableConsoleLogging();
    // console.log("authToken", authToken, target_uids, org_uid);

    const url = `${DEVELOPERHUB_BASE_URL}/installations?target_uids=${target_uids}`;
    const headers = {
        'Content-Type': 'application/json',
        'authToken': authToken,
        'organization_uid': org_uid
    };
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        if (response.status === 401) {
            console.error(`Failed to fetch installations for stack API keys ${target_uids}`, response.status, response.statusText, "\n Relogging to continue");

            let authToken = null;
            let organizations = null;
            let username = null;
            let user_uid = null;
            await userInformation();
            try {
                response = await fetch(url, {
                    method: 'GET',
                    headers: headers
                });
                if (!response.ok) {
                    console.error(`Failed to fetch installations for stack API keys ${target_uids}`, response.status, response.statusText);
                }
            }

            catch (error) {

            }

        }

        if (!response.ok) {
            console.error(`Failed to fetch installations for stack API keys ${target_uids}`, response.status, response.statusText);
        }

        const data = await response.json();

        disableConsoleLogging();
        return data;
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error("Error fetching installations: Empty or invalid JSON response");
        } else {
            console.error(`Error fetching installations: ${error.message}`);
        }
    }
    disableConsoleLogging();
}


export async function fetchAppInstallations(authToken, org_uid) {

    enableConsoleLogging();

    const url = `${DEVELOPERHUB_BASE_URL}/installations`;
    const headers = {
        'Content-Type': 'application/json',
        'authToken': authToken,
        'organization_uid': org_uid
    };
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            console.error(`Failed to fetch installations for App ${app_uids}`, response.status, response.statusText);
        }

        const data = await response.json();

        disableConsoleLogging();
        return data;
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error("Error fetching installations: Empty or invalid JSON response");
        } else {
            console.error(`Error fetching installations: ${error.message}`);
        }
    }
    disableConsoleLogging();
}



export async function listInstallations(selectedOrgUids, stackuids, authToken) {
    const url = `${DEVELOPERHUB_BASE_URL}/installations`;

    const params = new URLSearchParams({
        organization_uid: selectedOrgUids,
        target_uids: stackuids
    });

    const headers = {
        'Content-Type': 'application/json',
        'authtoken': authToken
    };

    try {
        const response = await fetch(`${url}?${params.toString()}`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch installations. Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Error fetching installations: ${error.message}`);
    }
}


export async function deleteInstallation(installation_uid, authToken, org_uid) {
    enableConsoleLogging();
    const url = `${DEVELOPERHUB_BASE_URL}/installations/${installation_uid}`;
    const headers = {
        'Content-Type': 'application/json',
        'authToken': authToken,
        'organization_uid': org_uid
    };

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: headers
        });

        if (!response.ok) {
            console.error(`Failed to uninstall ${installation_uid}`, response.status, response.statusText);
        }

        const data = await response.json();

        console.warn('uninstalling app installation:', installation_uid);
        disableConsoleLogging();
        return data;

    } catch (error) {
        console.error(`Error uninstalling the App: ${error}`);
    }
    disableConsoleLogging();
}


export async function fetchAndDeleteInstallations(myStacks, authToken) {
    enableConsoleLogging();
    console.alert('fetching  & Deleting app Installations...',);
    disableConsoleLogging();
    try {
        for (const org of myStacks) {
            const orgUid = org.org_uid;
            const stackuids = org.stacks.map(stack => stack.api_key).join(',');
            if (stackuids.length === 0) {
                console.error(`No stacks found for organization with org_uid: ${orgUid}. Skipping ...`);
                continue;
            }
            console.log('stackuids:', stackuids);

            const installations = await fetchInstallations(stackuids, authToken, orgUid);
            console.log(`Installations for organization with org_uid ${orgUid}: `, installations);
            if (installations.data && Array.isArray(installations.data)) {
                for (const installation of installations.data) {
                    console.log(`${installation.visibility} App : ${installation.manifest.name}`)
                    const response = await deleteInstallation(installation.uid, authToken, orgUid);
                    installation.manifest.visibility === 'private' && global.installedApps.push({ name: installation.manifest.name, uid: installation.manifest.uid });
                }
            } else {
                console.log('No installations found for organization with org_uid:', orgUid);
            }
        }
    } catch (error) {
        console.error('Encounterd an Error fetching installations & deleting them', error.message);
    }
}