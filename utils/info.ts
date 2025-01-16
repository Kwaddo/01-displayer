export async function fetchGraphQL(query: string, variables: object = {}) {
    const token = localStorage.getItem('jwtToken')?.replace(/^"|"$/g, '');
    if (!token) {
        throw new Error('User is not authenticated');
    }
    const response = await fetch('https://learn.reboot01.com/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
    });
    const result = await response.json();
    if (result.errors) {
        throw new Error(result.errors.map((error: any) => error.message).join(', '));
    }
    return result.data;
}
