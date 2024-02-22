import inquirer from 'inquirer';

export async function chooseFromList(question, choices) {
    const answers = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'selectedChoices',
            message: `${question}:`,
            choices: choices,
        },
    ]);

    return answers;
}
