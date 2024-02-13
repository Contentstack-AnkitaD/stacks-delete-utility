import inquirer from 'inquirer';

export async function chooseOptionWithArrowKeys(question, choices) {
    const { chosenOption } = await inquirer.prompt([
        {
            type: 'list',
            name: 'chosenOption',
            message: question,
            choices: choices.map((option, index) => ({
                name: option,
                value: index
            })),
            pageSize: choices.length
        }
    ]);

    return choices[chosenOption];
}
