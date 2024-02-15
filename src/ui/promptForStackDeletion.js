import inquirer from 'inquirer';
import { deleteStack } from '../stackManagement/deleteStack.js';

// Function to prompt the user for stack deletion confirmation
async function promptForIndividualStackDeletion(stack) {
    const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `Do you want to delete the stack - ${stack.name}?`,
        default: false
    });
    return confirm;
}

export async function promptForAllStacksDeletion() {
    const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `Do you want to delete all stacks mentioned in Logs?`,
        default: false
    });
    return confirm;
}

// Function to iterate over stacks and prompt for deletion
export async function promptForStackDeletion(stacks, authToken) {
    for (const stack of stacks) {
        const confirm = await promptForIndividualStackDeletion(stack);
        if (confirm) {
            // Call the function to delete the stack (to be implemented)
            console.log(`Deleting stack - ${stack.name}...`);
            await deleteStack(stack.api_key, authToken);
            // Call deleteStack function here passing the stack uid or any necessary data
        } else {
            console.log(`Skipping deletion of stack - ${stack.name}`);
        }
    }
}