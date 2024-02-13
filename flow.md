Delete Stacks

-- Fetch All Stacks
- Create your Auth Token
    Must have Email , Password , TFA in config File 
    - Do you want to delete stacks Organization wise or all stacks?
        - Organization Wise
            -  const `organizations` = authTokenData.user.organizations   [-- later flow]
        - All Stacks by particular User
            - `fetchStacksByUser`

you get the list of all stacks by this user.

choose deletion type:
    - You have which list with you:
        selective Stacks to delete
        selective Stacks to keep
        - selective Stacks to delete
            - `filter stacks to delete`
        - selective stacks to keep
            - `filter stacks to keep`
    - You donot have any list 
            - At run time choose the stacks

PROMPT THE USER TO CHECK THE LOGS AND CONFIRM IF THEY WANT TO DELETE ALL ABOVE STACKS
        - If user confirms : 
            - DELETE ALL STACKS