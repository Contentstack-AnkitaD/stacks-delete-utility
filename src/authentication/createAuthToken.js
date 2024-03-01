import fetch from 'node-fetch';
import { CDA_URL } from '../../config.js';

// Function to create a user session and obtain an authentication token
export async function createAuthToken(email, password, tfaToken) {
    const url = `${CDA_URL}/user-session`;
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
    // console.log("createAuthToken response", response);

    // Use either response.text() or response.json(), not both
    const responseBody = await response.text(); // or response.json()

    // console.log("Response Body:", responseBody); // Log the raw response body

    // Process the response body as needed
    const data = JSON.parse(responseBody);
    // console.log("createAuthToken data", data);
    return data;
}


