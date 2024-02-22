import { fileLogger, enableConsoleLogging, disableConsoleLogging } from './src/logging/fileLogger.js';
import inquirer from 'inquirer';
import { EMAIL as email, PASSWORD as password, TFA_TOKEN as tfaToken } from './config.js';
import { createAuthToken } from "./src/authentication/createAuthToken.js";
import { fetchStacks, fetchStacksByUser } from './src/stackManagement/fetchStacks.js';
import { deleteStack } from './src/stackManagement/deleteStack.js';
import { chooseOptionWithArrowKeys } from './src/ui/chooseOptionWithArrowKeys.js';
import chalk from 'chalk';
import { fetchInstallations, fetchAndDeleteInstallations } from './src/stackManagement/fetchInstallations.js';
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
let chooseStacks = []
let stacksToDelete = [];
const allInstallations = [];
let selectedOrgUids = '';

export async function userInformation() {
    fileLogger();
    const authTokenData = await createAuthToken(email, password, tfaToken);
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

export async function filterByStacksToDelete(deleteStacks) {
    stacksToDelete = myStacks.flatMap(org => org.stacks.filter(stack => deleteStacks.includes(stack.name)));
    console.log(`\n------Total stacksToDelete------ : ${stacksToDelete.length} \n`, stacksToDelete.map(stack => stack.name).join("\n "));
}

export async function chooseStacksToDelete(deleteStacks) {
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
    const stacksMessage = stacksToDelete.map(stack => `- ${stack.name}`).join('\n');
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
        await fetchAndDeleteInstallations(myStacks, authToken);
        enableConsoleLogging();
        console.alert('All App Installations removed from selected stacks... \nStarting to Delete Stacks...',);
        disableConsoleLogging();
        for (const stack of stacksToDelete) {
            await deleteStack(stack.api_key, authToken);
        };
    }
}


async function main() {
    try {
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
            chooseStacks = await chooseStacksToDelete(myStacks.flatMap(org => org.stacks.map(stack => stack.name)));
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
        console.error('An error occurred in the main function:', error);
    }
}
main()
// let array = await inputCommaSeparatedList("ENTER YOUR NAME")
// console.log("array", array);


