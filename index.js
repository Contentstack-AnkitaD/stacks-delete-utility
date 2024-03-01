import { fileLogger, enableConsoleLogging, disableConsoleLogging } from './src/logging/fileLogger.js';
import inquirer from 'inquirer';
import { EMAIL as email, PASSWORD as password, TFA_TOKEN as tfaToken, DEVELOPERHUB_BASE_URL } from './config.js';
import { createAuthToken } from "./src/authentication/createAuthToken.js";
import { fetchStacks, fetchStacksByUser } from './src/stackManagement/fetchStacks.js';
import { deleteStack } from './src/stackManagement/deleteStack.js';
import { chooseOptionWithArrowKeys } from './src/ui/chooseOptionWithArrowKeys.js';
import chalk from 'chalk';
import { fetchInstallations, fetchAndDeleteInstallations, fetchAppInstallations } from './src/stackManagement/fetchInstallations.js';
import { chooseFromList } from './src/ui/chooseFromList.js';
import { inputCommaSeparatedList } from './src/ui/inputCommaSeparatedList.js';

let authToken = null;
let organizations = null;
let username = null;
let user_uid = null;
let myStacks = [];
let stacksOwnedByUser = [];
let donotDeleteStacks = ["CC - GatsbyStarter", "Gatsby GC", "gatbsy launch test", "gatsby lau ch test", "CC-NEXTSTARTER", "Gatsby -Ankita", "hybsdfy"];
let deleteStacks = ['Angular starter'];
let chooseStacks = [];

let stacksToDelete = [];
const allInstallations = [];
let selectedOrgUids = '';
// global.appManifestUid = '';
// global.appManifestName = '';
global.installedApps = [];


export async function userInformation() {
    const authTokenData = await createAuthToken(email, password, tfaToken);
    console.log("authTokenData", authTokenData);
    authToken = authTokenData.user.authtoken;
    organizations = authTokenData.user.organizations;
    username = authTokenData.user.username;
    user_uid = authTokenData.user.uid;
    console.log("\n------authToken------ : ", authToken, "\n------username------ : ", username, "\n------user_uid------ : ", user_uid);
}

export async function fetchOrganizationWiseStacks() {
    const orgNames = organizations.map(org => org.name);
    let question = 'Select the Organization you wish to proceed deleting stacks:';
    let chosenOption = await chooseOptionWithArrowKeys(question, orgNames);
    const selectedOrg = organizations.find(org => org.name === chosenOption);
    selectedOrgUids = selectedOrg.uid;
    try {
        const stacks = await fetchStacks(selectedOrg.uid, authToken);
        console.log(`\n------Total Stacks in Org: ${selectedOrg.name} ------`, stacks.length);
        const filteredStacks = stacks.filter(stack => stack?.owner?.email === email);
        const orgStacksObj = {
            org_uid: selectedOrg.uid,
            org_name: selectedOrg.name,
            stacks: filteredStacks
        };
        console.log("orgStacksObj", orgStacksObj);
        myStacks.push(orgStacksObj);
        console.log("myStacks", myStacks);
        console.log(`\n ------My Stacks in Org: ${myStacks[0]?.org_name} : ------`, myStacks[0]?.stacks?.length + '\n' + myStacks[0]?.stacks?.map(stack => stack.name).join("\n "));
    } catch (error) {
        enableConsoleLogging();
        console.error('Error fetching organization-wise stacks:', error);
        disableConsoleLogging();
    }
}

export async function fetchAllStacks() {
    console.log("\n------My organizations------ : \n", organizations.map(org => org.name).join("\n "));
    selectedOrgUids = organizations.map(org => org.uid).join(',');
    for (const organization of organizations) {
        try {
            const stacks = await fetchStacks(organization.uid, authToken);
            // console.log("filteredStacks", stacks);
            const filteredStacks = stacks && stacks.filter(stack => stack?.owner?.email === email);
            const orgStacksObj = {
                org_uid: organization.uid,
                org_name: organization.name,
                stacks: filteredStacks
            };
            myStacks.push(orgStacksObj);
        } catch (error) {
            enableConsoleLogging();
            console.error('Error fetching stacks for organization:', organization.name, error.message);
            disableConsoleLogging();
        }
    }
    console.log("myStacks", myStacks);
    let total_stacks = myStacks.reduce((sum, obj) => sum + obj?.stacks?.length, 0);
    console.log("\n ------Total No of My Stacks as owner: ------", total_stacks + '\n' + myStacks?.map(org => org?.stacks?.map(stack => stack.name).join("\n ")).join("\n "));
}


export async function filterByStacksToKeep() {
    stacksToDelete = myStacks.flatMap(org => org.stacks.filter(stack => !donotDeleteStacks.includes(stack.name)));
    console.log("stacksToDelete", stacksToDelete);
    console.log(`\n------Total stacksToDelete------ : ${stacksToDelete.length} \n`, stacksToDelete.map(stack => stack.name).join("\n "));
}

export async function filterByStacksToDelete(selectedStackNames) {
    stacksToDelete = myStacks.map(org => {
        const filteredStacks = org.stacks.filter(stack => selectedStackNames.includes(stack.name));
        if (filteredStacks.length > 0) {
            return {
                org_uid: org.org_uid,
                org_name: org.org_name,
                stacks: filteredStacks
            };
        } else {
            return null; // If no stacks are selected for deletion from this organization
        }
    }).filter(org => org !== null); // Remove null entries

    console.log(`\n------Total stacksToDelete------ : ${stacksToDelete.length} \n`, stacksToDelete.map(org => org.stacks.map(stack => stack.name)).join("\n "));
    console.log("stacksToDelete Obj", stacksToDelete);
    return stacksToDelete;
}

// export async function filterByStacksToDelete(deleteStacks) {
//     stacksToDelete = myStacks.flatMap(org => org.stacks.filter(stack => deleteStacks.includes(stack.name)));
//     console.log(`\n------Total stacksToDelete------ : ${stacksToDelete.length} \n`, stacksToDelete.map(stack => stack.name).join("\n "));
// }

export async function chooseTheOptions(deleteStacks) {

    if (deleteStacks.length === 0) {
        enableConsoleLogging();
        console.error('No Options to delete...');
        disableConsoleLogging();
        throw new Error('No Options to delete...');
    }
    const answers = await chooseFromList('Choose the stacks you want to delete', deleteStacks);
    console.log('selectedChoices', answers?.selectedChoices);
    return answers?.selectedChoices;
}

export async function findOrgUid(stackApiKey) {
    for (const org of myStacks) {
        for (const stack of org.stacks) {
            if (stack.api_key === stackApiKey) {
                return org.org_uid;
            }
        }
    }
    return null; // Return null if the stack API key is not found
}


export async function fetchTheInstallations(api_key, orgUid) {
    let installations = await fetchInstallations(api_key, authToken, orgUid);
    return installations?.data?.length > 0 ? installations : null;
}

export async function deleteTheInstallations() {

}

export async function deleteTheStacks() {
    console.log("stacksToDelete in deleteTheStacks", stacksToDelete);
    const stacksMessage = stacksToDelete.map(org => {
        const stackNames = org.stacks.map(stack => `- ${stack.name}`).join('\n');
        return `--- In ${org.org_name}: ---\n${stackNames}`;
    }).join('\n');
    console.log('stacksMessage:', stacksMessage);
    enableConsoleLogging();
    console.log(`Following are the stacks to delete: \n${stacksMessage}.`)
    disableConsoleLogging();
    const confirmDelete = await inquirer.prompt([
        {
            type: 'input',
            name: 'confirmation',
            message: 'Do you want to proceed with deletion? (Y/N):',
            validate: function (input) {
                const inputUpperCase = input.toUpperCase();
                if (inputUpperCase === 'Y' || inputUpperCase === 'N') {
                    return true;
                } else {
                    return 'Please enter either Y or N.';
                }
            }
        }]);

    if (confirmDelete.confirmation.toUpperCase() === 'Y') {
        console.log("mystacks", myStacks);
        console.log("stacksToDelete", stacksToDelete);
        await fetchAndDeleteInstallations(stacksToDelete, authToken);
        enableConsoleLogging();
        console.alert('All App Installations removed from selected stacks...',);
        console.log("apps to delete", global.installedApps);
        for (const app of global.installedApps) {
            console.alert(`Deleting App ${app.name}...`,);
            await deleteApp(authToken, selectedOrgUids, app.uid);
        }
        disableConsoleLogging();
        for (const org of stacksToDelete) {
            for (const stack of org.stacks) {
                console.alert(`Deleting Stack ${stack.name}...`,);
                await deleteStack(stack.api_key, authToken);
            }
        }
    }
}

async function main1() {
    await userInformation();
    // let appuid = '6388aaa3f8f03000193f0fca';
    let orgUid = 'bltbe479f273f7e8624';
    let installations = await fetchAppInstallations(authToken, orgUid);
    console.log(`Installations for organization with org_uid ${orgUid}: `, installations);
}

async function main() {
    try {
        fileLogger();
        await userInformation();
        let question = 'Do you want to delete stacks Organization wise or all stacks?';
        let choices = ['Organization Wise', 'All Stacks By Me'];
        let chosenOption = await chooseOptionWithArrowKeys(question, choices);
        console.log(`You chose: ${chosenOption}`);
        if (chosenOption === 'Organization Wise') {
            await fetchOrganizationWiseStacks();
        } else {
            await fetchAllStacks();
        }
        if (myStacks.length === 0 && stacksOwnedByUser.length === 0) {
            enableConsoleLogging();
            console.warn("----!! ⚠️  No stacks to delete ⚠️ !!----");
            disableConsoleLogging();
            return;
        }
        question = '\nChoose deletion type: BEWARE OF "You have selective Stacks to Keep" ';
        choices = ['You have selective Stacks to Delete', 'You have selective Stacks to Keep', 'I want to choose the stacks to delete'];
        chosenOption = await chooseOptionWithArrowKeys(question, choices);

        if (chosenOption === 'You have selective Stacks to Delete') {
            console.log("\nYou have selective Stacks to Delete");
            deleteStacks = await inputCommaSeparatedList('Enter the stack names you want to delete (Comma Separated):');
            console.log("deleteStacks", deleteStacks);
            await filterByStacksToDelete(deleteStacks);
        } else if (chosenOption === 'I want to choose the stacks to delete') {
            console.log("\nI want to choose the stacks to delete");
            chooseStacks = await chooseTheOptions(myStacks.flatMap(org => org.stacks.map(stack => stack.name)));
            console.log("\nStacks to delete: ", chooseStacks);
            await filterByStacksToDelete(chooseStacks);
        } else if (chosenOption === 'You have selective Stacks to Keep') {
            console.log("\nYou have selective Stacks to Keep");
            donotDeleteStacks = await inputCommaSeparatedList('Enter the stack names you want to keep (Comma Separated):');
            console.log("array", donotDeleteStacks);
            await filterByStacksToKeep();
        }
        await deleteTheStacks();
    } catch (error) {
        console.error('An error occurred in the main function:', error.message);
    }
}

// main1();
// let array = await inputCommaSeparatedList("ENTER YOUR NAME")
// console.log("array", array);




async function listInstalledApps(authToken, organizationUid) {
    const url = `${DEVELOPERHUB_BASE_URL}/installations/view/apps?organization_uid=${organizationUid}`;

    const headers = {
        'Content-Type': 'application/json',
        'authtoken': authToken
    };

    try {
        const response = await fetch(url, { method: 'GET', headers });
        const data = await response.json();

        if (response.ok) {
            console.log('Installed Apps:');
            data.data.forEach(app => {
                console.log(`- Name: ${app.name}`);
                console.log('---------------------------------------');
            });
        } else {
            console.error('Failed to fetch installed apps:', data);
        }
    } catch (error) {
        console.error('Error fetching installed apps:', error);
    }
}
async function listPrivateInstalledApps(authToken, organizationUid) {

    const queryParams = new URLSearchParams({
        // include_update_details: includeUpdateDetails,
        // target_type: targetType,
        // target_uid: targetUid,
        // sort: sort,
        // order: order,
        // limit: 50,
        // skip: 500
    });

    const url = `${DEVELOPERHUB_BASE_URL}/installations/view/apps?${queryParams}`;

    const headers = {
        'Content-Type': 'application/json',
        'authtoken': authToken,
        'organization_uid': organizationUid,
    };

    try {
        const response = await fetch(url, { method: 'GET', headers });
        const data = await response.json();
        console.log("data - list installed apps", data);
        if (response.ok) {
            const privateApps = data.data.filter(app => app.visibility === 'private');
            return privateApps;
        } else {
            throw new Error(`Failed to fetch installed apps: ${data}`);
            return [];
        }
    } catch (error) {
        console.error('Error fetching installed apps:', error);
        return [];
    }
}

async function listInstallationsOfApp(authToken, organizationUid, appUid) {
    const url = `${DEVELOPERHUB_BASE_URL}/apps/${appUid}/installations`;
    const headers = {
        'Content-Type': 'application/json',
        'authtoken': authToken,
        'organization_uid': organizationUid
    };

    try {
        const response = await fetch(url, { method: 'GET', headers });
        const data = await response.json();
        if (response.ok) {
            console.log(`Installations of app with UID ${appUid}:`, data);
            return data.data;
        } else {
            throw new Error(`Failed to list installations of app with UID ${appUid}: ${data}`);
        }
    } catch (error) {
        console.error(`Error listing installations of app with UID ${appUid}:`, error);
        throw error;
    }
}

async function deleteInstallation(authToken, organizationUid, installationUid) {
    const url = `${DEVELOPERHUB_BASE_URL}/installations/${installationUid}`;
    const headers = {
        'Content-Type': 'application/json',
        'authtoken': authToken,
        'organization_uid': organizationUid
    };

    try {
        const response = await fetch(url, { method: 'DELETE', headers });
        if (response.ok) {
            console.log(`Installation with UID ${installationUid} deleted successfully.`);
        } else {
            const data = await response.json();
            throw new Error(`Failed to delete installation with UID ${installationUid}: ${data}`);
        }
    } catch (error) {
        console.error(`Error deleting installation with UID ${installationUid}:`, error);
        throw error;
    }
}


async function deleteApp(authToken, organizationUid, appUid) {
    const url = `${DEVELOPERHUB_BASE_URL}/apps/${appUid}`;
    // const url = `${DEVELOPERHUB_BASE_URL}/admin/manifests/${appUid}/publish`;

    const headers = {
        'Content-Type': 'application/json',
        'authtoken': authToken,
        'organization_uid': organizationUid
    };

    try {
        const response = await fetch(url, { method: 'DELETE', headers });
        const data = await response.json();
        if (response.ok) {
            enableConsoleLogging();
            console.success(`App with UID ${appUid} deleted successfully.`);
            disableConsoleLogging();
        } else {
            console.error(`Failed to delete app with UID ${appUid}:`, data);

            // Check if the error is due to existing installations
            if (response.status === 409 && data.message.includes('installation')) {
                console.log('Deleting installations associated with the app...');
                let installations = await listInstallationsOfApp(authToken, organizationUid, appUid);
                console.log('Installations:', installations);
                if (installations.length < 1) {
                    throw new Error(`Stacks with installations already deleted for app with UID ${appUid}. Contact admin.`);
                }
                for (const installation of installations) {
                    await deleteInstallation(authToken, organizationUid, installation.uid);
                }
                // await deleteInstallations(authToken, organizationUid, appUid);
                // ...
                // Retry deleting the app
                console.log(`Retrying to delete the app... ${appUid}`);
                await deleteApp(authToken, organizationUid, appUid);
            }
        }
    } catch (error) {
        enableConsoleLogging();
        console.error(`Error deleting app UID ${appUid}:`, error.message);
        disableConsoleLogging();
        return;
    }
}

async function deleteInstallations(authToken, organizationUid, appUid) {
    const url = `${DEVELOPERHUB_BASE_URL}/manifests/${appUid}/installations`;
    const headers = {
        'Content-Type': 'application/json',
        'authtoken': authToken,
        'organization_uid': organizationUid
    };

    try {
        const response = await fetch(url, { method: 'GET', headers });
        const data = await response.json();
        console.log("fetch installations response", data);
        if (response.ok) {
            const installations = data.data;
            for (const installation of installations) {
                await uninstallApp(authToken, organizationUid, installation.uid);
            }
        } else {
            console.error(`Failed to fetch installations for app with UID ${appUid}:`, data);
        }
    } catch (error) {
        console.error(`Error fetching installations for app with UID ${appUid}:`, error);
    }
}

async function uninstallApp(authToken, organizationUid, installationUid) {
    const url = `${DEVELOPERHUB_BASE_URL}/installations/${installationUid}`;
    const headers = {
        'Content-Type': 'application/json',
        'authtoken': authToken,
        'organization_uid': organizationUid
    };

    try {
        const response = await fetch(url, { method: 'DELETE', headers });
        console.log("uninstall app response", response);
        if (response.ok) {
            console.log(`Installation with UID ${installationUid} uninstalled successfully.`);
        } else {
            console.error(`Failed to uninstall installation with UID ${installationUid}:`, response.statusText);
        }
    } catch (error) {
        console.error(`Error uninstalling installation with UID ${installationUid}:`, error);
    }
}


async function main3() {
    fileLogger();
    await userInformation();
    const orgNames = organizations.map(org => org.name);
    let question = 'Select the Organization you wish to proceed deleting Apps:';
    let chosenOption = await chooseOptionWithArrowKeys(question, orgNames);
    const selectedOrg = organizations.find(org => org.name === chosenOption);
    selectedOrgUids = selectedOrg.uid;
    console.log('Selected Org:', selectedOrg, selectedOrgUids);
    let privateApps = await listPrivateInstalledApps(authToken, selectedOrgUids);
    console.log('Private Apps:', privateApps);
    // const filteredApps = privateApps.filter(app => app.created_by.uid === "blt0fb11fb8f9ce871f");
    // console.log('Filtered Apps:', filteredApps);
    // Display the list of apps to the user and prompt them to select the ones to delete
    const deleteApps = await chooseTheOptions(privateApps.map(app => app.name));
    // Filter the selected apps
    const selectedApps = privateApps.filter(app => deleteApps.includes(app.name));
    // Now selectedApps contains the apps selected by the user for deletion
    for (const app of selectedApps) {
        enableConsoleLogging();
        console.log("Working on app:", app.name);
        disableConsoleLogging();
        await deleteApp(authToken, selectedOrgUids, app.uid);
    }
}
// main3()

async function main4() {
    fileLogger();
    await userInformation();
    const orgNames = organizations.map(org => org.name);
    let question = 'Select the Organization you wish to proceed deleting Apps:';
    let chosenOption = await chooseOptionWithArrowKeys(question, orgNames);
    const selectedOrg = organizations.find(org => org.name === chosenOption);
    selectedOrgUids = selectedOrg.uid;
    console.log('Selected Org:', selectedOrg, selectedOrgUids);
    let originalArray = [
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈66",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈68",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈68",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈68",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈70",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt0336d7c0442c048f",
                "first_name": "Aniket",
                "last_name": "shikhare+stag"
            },
            "updated_by": {
                "uid": "blt0336d7c0442c048f",
                "first_name": "Aniket",
                "last_name": "shikhare+stag"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-26T13:04:27.175Z",
            "updated_at": "2024-02-26T13:04:27.175Z",
            "uid": "65dc8c5b2c5cdf0012620109"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈65",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈67",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈67",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈67",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈69",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt0336d7c0442c048f",
                "first_name": "Aniket",
                "last_name": "shikhare+stag"
            },
            "updated_by": {
                "uid": "blt0336d7c0442c048f",
                "first_name": "Aniket",
                "last_name": "shikhare+stag"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-26T10:13:59.838Z",
            "updated_at": "2024-02-26T10:13:59.838Z",
            "uid": "65dc64688ae773001263e543"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈64",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈66",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈66",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈66",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈68",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt0336d7c0442c048f",
                "first_name": "Aniket",
                "last_name": "shikhare+stag"
            },
            "updated_by": {
                "uid": "blt0336d7c0442c048f",
                "first_name": "Aniket",
                "last_name": "shikhare+stag"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-26T10:03:18.751Z",
            "updated_at": "2024-02-26T10:03:18.751Z",
            "uid": "65dc61e78ae773001263e4b0"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈61",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈63",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈63",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈63",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈65",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-26T06:53:26.518Z",
            "updated_at": "2024-02-26T06:53:26.518Z",
            "uid": "65dc35672c5cdf001261fe42"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈60",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈62",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈62",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈62",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈64",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-26T06:49:42.708Z",
            "updated_at": "2024-02-26T06:49:42.708Z",
            "uid": "65dc34872c5cdf001261fe16"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈59",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈61",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈61",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈61",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈63",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-26T06:24:46.549Z",
            "updated_at": "2024-02-26T06:24:46.549Z",
            "uid": "65dc2eaf2c5cdf001261fd7f"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈58",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈60",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈60",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈60",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈62",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-26T06:15:06.356Z",
            "updated_at": "2024-02-26T06:15:06.356Z",
            "uid": "65dc2c6a8ae773001263e202"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈56",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈58",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈58",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈58",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈60",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-23T10:47:48.845Z",
            "updated_at": "2024-02-23T10:47:48.845Z",
            "uid": "65d877d58ae773001263dfef"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈55",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈57",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈57",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈57",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈59",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-23T10:37:14.170Z",
            "updated_at": "2024-02-23T10:37:14.170Z",
            "uid": "65d8755a2c5cdf001261fa46"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈54",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈56",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈56",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈56",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈58",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-23T10:32:57.106Z",
            "updated_at": "2024-02-23T10:32:57.106Z",
            "uid": "65d874598ddf120012c56222"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈53",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈55",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈55",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈55",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈57",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-23T07:06:08.467Z",
            "updated_at": "2024-02-23T07:06:08.467Z",
            "uid": "65d843e02adeba0012c6c080"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈52",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈54",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈54",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈54",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈56",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-23T06:56:27.809Z",
            "updated_at": "2024-02-23T06:56:27.809Z",
            "uid": "65d8419c8ddf120012c560f2"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈51",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈53",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈53",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈53",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈55",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-23T06:53:03.081Z",
            "updated_at": "2024-02-23T06:53:03.081Z",
            "uid": "65d840cf8ddf120012c560ce"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈50",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈52",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈52",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈52",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈54",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-22T11:47:06.523Z",
            "updated_at": "2024-02-22T11:47:06.523Z",
            "uid": "65d7343b8ddf120012c55fde"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈49",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈51",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈51",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈51",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈53",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-22T11:37:38.112Z",
            "updated_at": "2024-02-22T11:37:38.112Z",
            "uid": "65d732022c5cdf001261f78d"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈48",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈50",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈50",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈50",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈52",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-22T11:34:17.508Z",
            "updated_at": "2024-02-22T11:34:17.508Z",
            "uid": "65d7313a8ae773001263dc35"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈47",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈49",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈49",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈49",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈51",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-22T10:36:54.491Z",
            "updated_at": "2024-02-22T10:36:54.491Z",
            "uid": "65d723c78ae773001263dbbb"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈46",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈48",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈48",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈48",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈50",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-22T10:27:48.489Z",
            "updated_at": "2024-02-22T10:27:48.489Z",
            "uid": "65d721a58ae773001263db4f"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈45",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈47",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈47",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈47",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈49",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-22T10:24:36.941Z",
            "updated_at": "2024-02-22T10:24:36.941Z",
            "uid": "65d720e58ddf120012c55e17"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈44",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈46",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈46",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈46",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈48",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-22T09:03:07.666Z",
            "updated_at": "2024-02-22T09:03:07.666Z",
            "uid": "65d70dcc2adeba0012c6bc8b"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈43",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈45",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈45",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈45",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈47",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-22T08:54:38.432Z",
            "updated_at": "2024-02-22T08:54:38.432Z",
            "uid": "65d70bce8ddf120012c55d32"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈42",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈44",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈44",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈44",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈46",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-22T08:51:14.373Z",
            "updated_at": "2024-02-22T08:51:14.373Z",
            "uid": "65d70b022adeba0012c6bc0f"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈41",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈43",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈43",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈43",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈45",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-22T06:38:24.771Z",
            "updated_at": "2024-02-22T06:38:24.771Z",
            "uid": "65d6ebe12adeba0012c6bbb5"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈40",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈42",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈42",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈42",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈44",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-22T06:29:52.711Z",
            "updated_at": "2024-02-22T06:29:52.711Z",
            "uid": "65d6e9e18ddf120012c55c37"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈39",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈41",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈41",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈41",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈43",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-22T06:26:55.456Z",
            "updated_at": "2024-02-22T06:26:55.456Z",
            "uid": "65d6e92f8ae773001263d93a"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈38",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈40",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈40",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈40",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈42",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-21T14:05:24.150Z",
            "updated_at": "2024-02-21T14:05:24.150Z",
            "uid": "65d603242adeba0012c6ba63"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈37",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈39",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈39",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈39",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈41",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-21T13:57:03.483Z",
            "updated_at": "2024-02-21T13:57:03.483Z",
            "uid": "65d601308ddf120012c55b12"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈36",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈38",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈38",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈38",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈40",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-21T13:54:14.175Z",
            "updated_at": "2024-02-21T13:54:14.175Z",
            "uid": "65d600862c5cdf001261f301"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈35",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈37",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈37",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈37",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈39",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-21T09:10:36.550Z",
            "updated_at": "2024-02-21T09:10:36.550Z",
            "uid": "65d5be0c2c5cdf001261f286"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈34",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈36",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈36",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈36",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈38",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-21T09:01:53.444Z",
            "updated_at": "2024-02-21T09:01:53.444Z",
            "uid": "65d5bc012c5cdf001261f239"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈33",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈35",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈35",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈35",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈37",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-21T08:59:06.865Z",
            "updated_at": "2024-02-21T08:59:06.865Z",
            "uid": "65d5bb5b8ae773001263d71e"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈32",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈34",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈34",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈34",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈36",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T12:51:10.682Z",
            "updated_at": "2024-02-20T12:51:10.682Z",
            "uid": "65d4a03f2c5cdf001261f13c"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈31",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈33",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈33",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈33",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈35",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T12:42:53.014Z",
            "updated_at": "2024-02-20T12:42:53.014Z",
            "uid": "65d49e4d2c5cdf001261f0f4"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈30",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈32",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈32",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈32",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈34",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T12:40:13.281Z",
            "updated_at": "2024-02-20T12:40:13.281Z",
            "uid": "65d49dad8ddf120012c558d2"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈29",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈31",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈31",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈31",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈33",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T10:39:02.940Z",
            "updated_at": "2024-02-20T10:39:02.940Z",
            "uid": "65d481472c5cdf001261f066"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈28",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈30",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈30",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈30",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈32",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T10:30:53.534Z",
            "updated_at": "2024-02-20T10:30:53.534Z",
            "uid": "65d47f5e2c5cdf001261f028"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈27",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈29",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈29",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈29",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈31",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T10:28:19.595Z",
            "updated_at": "2024-02-20T10:28:19.595Z",
            "uid": "65d47ec42adeba0012c6b6dd"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈26",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈28",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈28",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈28",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈30",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T07:16:56.601Z",
            "updated_at": "2024-02-20T07:16:56.601Z",
            "uid": "65d451e98ae773001263d4c5"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈25",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈27",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈27",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈27",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈29",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T07:08:42.575Z",
            "updated_at": "2024-02-20T07:08:42.575Z",
            "uid": "65d44ffb2c5cdf001261ef68"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈24",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈26",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈26",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈26",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈28",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T07:06:10.991Z",
            "updated_at": "2024-02-20T07:06:10.991Z",
            "uid": "65d44f638ae773001263d464"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈23",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈25",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈25",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈25",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈27",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T06:36:41.865Z",
            "updated_at": "2024-02-20T06:36:41.865Z",
            "uid": "65d4487a8ae773001263d424"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈22",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈24",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈24",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈24",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈26",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T06:28:32.730Z",
            "updated_at": "2024-02-20T06:28:32.730Z",
            "uid": "65d446912adeba0012c6b5c5"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈21",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈23",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈23",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈23",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈25",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T06:26:05.292Z",
            "updated_at": "2024-02-20T06:26:05.292Z",
            "uid": "65d445fd8ddf120012c556b4"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈20",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈22",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈22",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈22",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈24",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T06:00:09.290Z",
            "updated_at": "2024-02-20T06:00:09.290Z",
            "uid": "65d43fe92c5cdf001261ee79"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈19",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈21",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈21",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈21",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈23",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T05:52:20.766Z",
            "updated_at": "2024-02-20T05:52:20.766Z",
            "uid": "65d43e152c5cdf001261ee47"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈18",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈20",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈20",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈20",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈22",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-20T05:50:02.121Z",
            "updated_at": "2024-02-20T05:50:02.121Z",
            "uid": "65d43d8a2adeba0012c6b52a"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "http://localhost:3000"
            },
            "target_type": "stack",
            "name": "CLI-GCNAApp-HFSiH",
            "ui_location": {
                "signed": false,
                "base_url": "http://localhost:3000",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "65d399faca3a2fc79b5ae736",
                                "multiple": false,
                                "path": "/#/custom-field",
                                "signed": false,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.dashboard",
                        "meta": [
                            {
                                "uid": "65d399faca3a2fc79b5ae737",
                                "path": "/#/stack-dashboard",
                                "signed": false,
                                "enabled": true,
                                "default_width": "half"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.asset_sidebar",
                        "meta": [
                            {
                                "uid": "65d399faca3a2fc79b5ae738",
                                "blur": false,
                                "path": "/#/asset-sidebar",
                                "signed": false,
                                "enabled": true,
                                "width": 500
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "65d399faca3a2fc79b5ae739",
                                "path": "/#/entry-sidebar",
                                "signed": false,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.full_page",
                        "meta": [
                            {
                                "uid": "65d399faca3a2fc79b5ae73a",
                                "path": "/#/full-page",
                                "signed": false,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.field_modifier",
                        "meta": [
                            {
                                "uid": "65d399faca3a2fc79b5ae73b",
                                "path": "/#/field-modifier",
                                "signed": false,
                                "enabled": true,
                                "allowed_types": [
                                    "$all"
                                ]
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "65d399faca3a2fc79b5ae73c",
                                "path": "/#/app-configuration",
                                "signed": false,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.rte",
                        "meta": [
                            {
                                "uid": "65d399faca3a2fc79b5ae73d",
                                "path": "/json-rte.js",
                                "signed": false,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-19T18:12:10.071Z",
            "updated_at": "2024-02-19T18:12:10.071Z",
            "uid": "65d399fa8ddf120012c555ae"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈17",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈19",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈19",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈19",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈21",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-19T18:09:20.964Z",
            "updated_at": "2024-02-19T18:09:20.964Z",
            "uid": "65d399512adeba0012c6b4a4"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈16",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈18",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈18",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈18",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈20",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-19T18:01:46.197Z",
            "updated_at": "2024-02-19T18:01:46.197Z",
            "uid": "65d3978a2adeba0012c6b468"
        },
        {
            "framework_version": "1.0",
            "version": 1,
            "icon": "",
            "description": "",
            "hosting": {
                "provider": "external",
                "deployment_url": "https://dev-shopify-app.contentstackmarket.com/#"
            },
            "target_type": "stack",
            "name": "CLI shopify app◈15",
            "ui_location": {
                "signed": false,
                "base_url": "https://dev-shopify-app.contentstackmarket.com/#",
                "locations": [
                    {
                        "type": "cs.cm.stack.custom_field",
                        "meta": [
                            {
                                "uid": "6568a163e0586fca42f84911",
                                "multiple": false,
                                "name": " CLI e2e Shopify-D◈17",
                                "path": "/field-extension",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84912",
                                "multiple": false,
                                "name": " CLI e2e Shopify-P◈17",
                                "path": "/product-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            },
                            {
                                "uid": "6568a163e0586fca42f84913",
                                "multiple": false,
                                "name": "CLI e2e Shopify-Co◈17",
                                "path": "/category-field",
                                "signed": true,
                                "enabled": true,
                                "data_type": "json"
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.config",
                        "meta": [
                            {
                                "uid": "6568a19883382d20c693f23a",
                                "path": "/config",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    },
                    {
                        "type": "cs.cm.stack.sidebar",
                        "meta": [
                            {
                                "uid": "6568a1b683382d20c693f246",
                                "name": "CLI e2e Shopify◈19",
                                "path": "/sidebar-widget",
                                "signed": true,
                                "enabled": true
                            }
                        ]
                    }
                ]
            },
            "visibility": "private",
            "created_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "updated_by": {
                "uid": "blt110a0a5d3fdc92b0",
                "first_name": "Aniket",
                "last_name": "shikhare+dev"
            },
            "organization_uid": "bltda7e3efe63e846f2",
            "created_at": "2024-02-19T17:59:34.921Z",
            "updated_at": "2024-02-19T17:59:34.921Z",
            "uid": "65d397078ae773001263d28e"
        }
    ]
    const simplifiedObjects = originalArray.map(item => ({
        name: item.name,
        visibility: item.visibility,
        created_by: {
            uid: item.created_by.uid,
            first_name: item.created_by.first_name,
            last_name: item.created_by.last_name
        },
        updated_by: {
            uid: item.updated_by.uid,
            first_name: item.updated_by.first_name,
            last_name: item.updated_by.last_name
        },
        organization_uid: item.organization_uid,
        created_at: item.created_at,
        updated_at: item.updated_at,
        uid: item.uid
    }));
    simplifiedObjects.forEach(item => {
        console.log(item.name);
    });
    for (const app of simplifiedObjects) {
        enableConsoleLogging();
        console.log("Deleting app:", app.name);
        disableConsoleLogging();
        await deleteApp(authToken, selectedOrgUids, app.uid);
    }

}

main()
