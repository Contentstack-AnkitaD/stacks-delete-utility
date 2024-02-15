import { fileLogger, enableConsoleLogging, disableConsoleLogging } from './src/logging/fileLogger.js';
import inquirer from 'inquirer';
import { EMAIL as email, PASSWORD as password, TFA_TOKEN as tfaToken } from './config.js';
import { createAuthToken } from "./src/authentication/createAuthToken.js";
import { fetchStacks, fetchStacksByUser } from './src/stackManagement/fetchStacks.js';
import { deleteStack } from './src/stackManagement/deleteStack.js';
import { chooseOptionWithArrowKeys } from './src/ui/chooseOptionWithArrowKeys.js';


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
    const stacks = await fetchStacks(selectedOrg.uid, authToken);
    console.log(`\n------Total Stacks in Org: ${selectedOrg.name} ------`, stacks.length);
    const filteredStacks = stacks.filter(stack => stack?.owner?.email === email);
    myStacks.push(...filteredStacks);
    console.log(`\n ------My Stacks in Org: ${selectedOrg.name} : ------`, myStacks.length + '\n' + myStacks.map(stack => stack.name).join("\n "));

}

export async function fetchAllStacks() {
    console.log("\n------My organizations------ : \n", organizations.map(org => org.name).join("\n "));
    for (const organization of organizations) {
        const stacks = await fetchStacks(organization.uid, authToken);
        const filteredStacks = stacks.filter(stack => stack?.owner?.email === email);
        myStacks.push(...filteredStacks);
    }
    console.log("\n ------Total No of My Stacks as owner: ------", myStacks.length + '\n' + myStacks.map(stack => stack.name).join("\n "));
}

export async function filterByStacksToKeep() {
    stacksToDelete = myStacks.filter(stack => !donotDeleteStacks.includes(stack.name));
    console.log(`\n------Total stacksToDelete------ : ${stacksToDelete.length} \n`, stacksToDelete.map(stack => stack.name).join("\n "));
}

export async function filterByStacksToDelete(deleteStacks) {
    stacksToDelete = myStacks.filter(stack => deleteStacks.includes(stack.name));
    console.log(`\n------Total stacksToDelete------ : ${stacksToDelete.length} \n`, stacksToDelete.map(stack => stack.name).join("\n "));
}

export async function chooseStacksToDelete(deleteStacks) {
    console.log('Stacks to delete:');
    for (const stack of deleteStacks) {
        console.log(stack);
    }
    const answers = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'stacksToDelete',
            message: 'Choose the stacks you want to delete (use arrow keys to navigate, space to select, enter to confirm):',
            choices: deleteStacks,
        },
    ]);
    return answers.stacksToDelete;
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
        enableConsoleLogging();

        stacksToDelete.forEach(async stack => {
            console.log(`\n -------!! ------- DELETING ${stack.name} ------ !! ----- `,);
            await deleteStack(stack.api_key, authToken);
        });
    }
}


async function main() {
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
        console.log("----!! ⚠️  No stacks to delete ⚠️ !!----");
        disableConsoleLogging();
        return;
    }
    question = '\nChoose deletion type: BEWARE OF "You have selective Stacks to Keep" ';
    choices = ['You have selective Stacks to Delete', 'You have selective Stacks to Keep', 'I want to choose the stacks to delete'];
    chosenOption = await chooseOptionWithArrowKeys(question, choices);

    if (chosenOption === 'You have selective Stacks to Delete') {
        console.log("\nYou have selective Stacks to Delete");
        await filterByStacksToDelete(deleteStacks);
        await deleteTheStacks();

    } else if (chosenOption === 'I want to choose the stacks to delete') {
        console.log("\nI want to choose the stacks to delete");
        chooseStacks = await chooseStacksToDelete(myStacks.map(stack => stack.name));
        console.log("\nStacks to delete: ", chooseStacks);
        await filterByStacksToDelete(chooseStacks);
        await deleteTheStacks();
    }

    else if (chosenOption === 'You have selective Stacks to Keep') {
        console.log("\nYou have selective Stacks to Keep");
        await filterByStacksToKeep();
        await deleteTheStacks();
    }
}
main();