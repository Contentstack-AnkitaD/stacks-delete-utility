import fetch from 'node-fetch';
import { BASE_URL } from '../../config.js';

// Function to create a user session and obtain an authentication token
export async function createAuthToken(email, password, tfaToken) {
    const url = `${BASE_URL}/user-session`;
    const headers = {
        'Content-Type': 'application/json'
    };
    const body = JSON.stringify({
        "user": {
            "email": email,
            "password": password,
            "tfa_token": tfaToken
        }
    });

    const response = await fetch(url, { method: 'POST', headers, body });
    const data = await response.json();
    return data;
}


