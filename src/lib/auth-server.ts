import { cookies } from "next/headers";
import db from "./db";

export interface UserSession {
  userId: number;
  username: string;
  role: string;
}

/**
 * Validates the session token from cookies against the SQLite database.
 * Returns user details if session is valid, or null otherwise.
 */
export async function getSessionUser(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get("session")?.value;

    if (!sessionToken) return null;

    // Fetch session details from SQLite
    const result = await db.execute({
      sql: `
        SELECT s.expiresAt, u.id as userId, u.username, u.role
        FROM sessions s
        JOIN users u ON s.userId = u.id
        WHERE s.id = ?
      `,
      args: [sessionToken]
    });
    
    const session = result.rows[0] as unknown as { expiresAt: string; userId: number; username: string; role: string } | undefined;

    if (!session) return null;

    // Check if session has expired
    if (new Date(session.expiresAt) < new Date()) {
      // Remove expired session from database
      await db.execute({
        sql: "DELETE FROM sessions WHERE id = ?",
        args: [sessionToken]
      });
      return null;
    }

    return {
      userId: Number(session.userId),
      username: String(session.username),
      role: String(session.role || "user"),
    };
  } catch (error) {
    console.error("Error verifying session:", error);
    return null;
  }
}
