export async function login(credentials: string, password: string): Promise<{ token: string }> {
    const signinUrl: string = 'https://learn.reboot01.com/api/auth/signin';
    const basicAuth: string = btoa(`${credentials}:${password}`);
    try {
        const response: Response = await fetch(signinUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/json',
            },
        });
        const rawData: string = await response.text(); 
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Invalid credentials. Please try again.');
            } else {
                throw new Error('An error occurred. Please try again later.');
            }
        }

        if (!rawData || rawData.trim() === '') {
            throw new Error('JWT token not received from the API.');
        }
        localStorage.setItem('jwtToken', rawData.trim());
        return { token: rawData.trim() };
    } catch (error: any) {
        throw error;
    }
}

export function getToken(): string | null {
    return localStorage.getItem('jwtToken');
}

export function getUserIdFromToken(): string | null {
    const token: string | null = getToken();

    if (!token) return null;

    try {
        const payloadBase64: string = token.split('.')[1];
        const decodedPayload: { id?: string } = JSON.parse(atob(payloadBase64));
        return decodedPayload.id || null;
    } catch (error: any) {
        return null;
    }
}

export function isTokenExpired(token?: string | null): boolean {
    const raw: string | null | undefined = (token ?? getToken())?.replace(/^"|"$/g, '');
    if (!raw) return true;
    try {
        const b64: string = raw.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload: { exp?: number } = JSON.parse(atob(b64));
        return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
    } catch {
        return false;
    }
}

export async function logout(): Promise<void> {
    localStorage.removeItem('jwtToken');
}