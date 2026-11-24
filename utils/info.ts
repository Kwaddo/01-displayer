export class AuthExpiredError extends Error {
    constructor(message = 'Session expired. Please sign in again.') {
        super(message);
        this.name = 'AuthExpiredError';
    }
}

function isExpiredToken(token: string): boolean {
    try {
        const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(b64));
        return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch {
        return false;
    }
}

export async function fetchGraphQL(query: string, variables: object = {}) {
    const token = localStorage.getItem('jwtToken')?.replace(/^"|"$/g, '');
    if (!token) {
        throw new Error('User is not authenticated');
    }
    if (isExpiredToken(token)) {
        localStorage.removeItem('jwtToken');
        throw new AuthExpiredError();
    }
    const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
    });
    if (response.status === 401) {
        localStorage.removeItem('jwtToken');
        throw new AuthExpiredError();
    }
    const result = await response.json();
    if (result.errors) {
        const msg = result.errors.map((error: any) => error.message).join(', ');
        if (/jwt|token|expired|unauthori[sz]ed/i.test(msg) || result.errors.some((e: any) => e.extensions?.code === 'invalid-jwt')) {
            localStorage.removeItem('jwtToken');
            throw new AuthExpiredError();
        }
        throw new Error(msg);
    }
    return result.data;
}
