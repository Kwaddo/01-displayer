import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function getData() {
    const data = await sql`SELECT * FROM users;`;
    return data;
}

export async function getUserByUserID(userID: string) {
    try {
        const result = await sql`
        SELECT * FROM users WHERE user_id = ${userID}
      `;

        // Check if a user was found, otherwise return null
        return result.length > 0 ? result[0] : null;  // Return the first user or null if not found
    } catch (error) {
        console.error('Error fetching user by user_id:', error);
        throw new Error('Error querying the database');
    }
}
