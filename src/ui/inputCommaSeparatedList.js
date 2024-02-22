import inquirer from 'inquirer';

export async function inputCommaSeparatedList(question) {
    const answer = await inquirer.prompt([
        {
            type: 'input',
            name: 'stackList',
            message: question,
            validate: (input) => {
                if (input.trim() === '') {
                    return 'Please enter at least one stack name.';
                }
                return true;
            }
        }
    ]);
    console.log('answer:', answer, answer.stackList.split(',').map(stack => stack.trim()));
    return answer.stackList.split(',').map(stack => stack.trim());
}
