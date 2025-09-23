// Thin API client that points to backend (change BASE_URL as needed)
const BASE_URL = 'http://localhost:3000/api'


function handleResponse(res) {
    if (!res.ok) throw new Error('API error: ' + res.status)
    return res.json()
}


export const apiClient = {
    get: (path) => fetch(BASE_URL + path, { credentials: 'include' }).then(handleResponse),
    post: (path, body) => fetch(BASE_URL + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' }).then(handleResponse),
    put: (path, body) => fetch(BASE_URL + path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' }).then(handleResponse),
    del: (path) => fetch(BASE_URL + path, { method: 'DELETE', credentials: 'include' }).then(handleResponse)
}