import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function getData() {
    const data = await sql`SELECT * FROM users;`;
    return data;
}

export async function getUserByToken(token: string) {
    const result = await sql`
      SELECT * FROM users WHERE token = ${token}
    `;
    return result[0];
}