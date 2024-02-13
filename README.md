# Delete Stacks in Bulk Script

This script allows you to delete multiple stacks from your Contentstack account in bulk. It is useful when you need to clean up your Contentstack environment by removing unnecessary stacks.

## Prerequisites

Before running the script, make sure you have the following:

- Node.js installed on your machine
- An active Contentstack account
- API credentials (email, password, and TFA token if enabled) for authentication

## Setup

1. Clone this repository to your local machine.
2. Install dependencies by running the following command in your terminal:

    ```
    npm install
    ```

3. Update the script's configuration:
   - Create a `config.js` file. [Refer `sample.config.js`.]
   - Update the `EMAIL`, `PASSWORD`, and `TFA_TOKEN` variables with your Contentstack account credentials.
   - If necessary, update the `BASE_URL` variable with the correct API endpoint.

## Usage

To run the script, execute the following command in your terminal:

```
npm run deleteBulkStacks
```


The script will authenticate with Contentstack, retrieve the list of stacks associated with your account, filter out the stacks owned by the specified email address, and prompt you to delete them.

Follow the on-screen prompts to proceed with stack deletion.

## What you can expect: Job Flow: 


### Choose Deletion Type

- **Organization-Wide Deletion**: If you want to delete stacks organization-wise, select this option. Here you will first have to choose the org in which you have to perform deleting operation.

- **All Stacks by You**: Alternatively, you can choose to delete all stacks associated with a specific user (User who is logged in). The tool will provide you with a list of all stacks owned by that user. 
 
### Selective Deletion

If you prefer to delete only specific stacks, you have the following options:

- **Selective Stacks to Delete**: Specify the stacks you want to delete. You can filter the stacks to delete based on your requirements.
  
- **Selective Stacks to Keep**: Alternatively, you can choose to keep specific stacks and delete the rest.

- **Runtime Selection**: If you don't have a pre-defined list of stacks to delete, you can choose the stacks to delete at runtime.

### Logging and Confirmation

- After you have choosen which stacks to delete, You will see the log of the list of stacks selected for deletion. To confirm the deletion, you will be prompted to type 'Y' to proceed with deleting all the selected stacks.


## Important Note

- Exercise caution when running this script, as it will permanently delete stacks from your Contentstack account.
- Make sure to review the list of stacks to be deleted before confirming the deletion.

## Support

If you encounter any issues or have questions, please feel free to [open an issue](https://github.com/Contentstack-AnkitaD/delete-bulk-stacks/issues) in this repository.


