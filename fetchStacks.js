import { BASE_URL as baseURL } from './config.js';

// Function to fetch all stacks in an organization
export async function fetchStacks(orgUid, authToken) {
    const url = `${baseURL}/organizations/${orgUid}/stacks?include_count=false&limit=500`;
    const headers = {
        'authtoken': authToken
    };
    const response = await fetch(url, { headers });
    const data = await response.json();
    return data.stacks;
}


export async function fetchStacksByUser(authToken) {
    const url = `${baseURL}/stacks?include_count=true&limit=500`;
    const headers = {
        'authtoken': authToken
    };
    const response = await fetch(url, { headers });
    const data = await response.json();
    return data.stacks;
}