import { BASE_URL as baseURL } from '../../config.js';

export async function fetchStacks(orgUid, authToken) {
    const url = `${baseURL}/organizations/${orgUid}/stacks?include_count=false&limit=500`;
    const headers = {
        'authtoken': authToken
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(errorResponse.error_message);
        }
        const data = await response.json();
        return data.stacks;
    } catch (error) {
        let error_message = `Failed to fetch stacks in org ${orgUid} ` + error.message;
        throw error_message;
    }
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