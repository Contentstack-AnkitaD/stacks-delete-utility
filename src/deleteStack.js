import fetch from 'node-fetch';
import { BASE_URL as baseURL } from '../config.js';

export async function deleteStack(apiKey, authToken) {
    const url = `${baseURL}/stacks`;
    const headers = {
        'Content-Type': 'application/json',
        'api_key': apiKey,
        'authtoken': authToken
    };
    console.log('Deleting stack... ', apiKey);

    try {
        const response = await fetch(url, { method: 'DELETE', headers });
        const data = await response.json();
        console.log('deleting stack... ', apiKey, data);
        console.log(data.notice);

    } catch (error) {
        console.error('Error deleting stack:', error);
    }
}
