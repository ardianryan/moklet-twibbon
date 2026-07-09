import { createClient } from "@libsql/client";
import { hashPassword } from "./auth-helpers";

const isTursoConfigured = !!(
  process.env.TURSO_DATABASE_URL &&
  !process.env.TURSO_DATABASE_URL.includes("your_") &&
  process.env.TURSO_AUTH_TOKEN &&
  !process.env.TURSO_AUTH_TOKEN.includes("your_")
);

const dbUrl = isTursoConfigured ? process.env.TURSO_DATABASE_URL! : "file:twibbon.db";
const authToken = isTursoConfigured ? process.env.TURSO_AUTH_TOKEN : undefined;

if (isTursoConfigured) {
  console.log("Database: Connecting to Turso Cloud database.");
} else {
  console.log("Database: Connecting to local SQLite file (twibbon.db) - placeholder config fallback.");
}

// Initialize the database client (supports remote Turso and local file-based SQLite)
const db = createClient({
  url: dbUrl,
  authToken: authToken,
});

// Async function to initialize tables and migrations
export async function initDb() {
  try {
    // Campaigns table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        frameUrl TEXT NOT NULL,
        caption TEXT,
        userId INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sessions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId INTEGER NOT NULL,
        expiresAt DATETIME NOT NULL
      );
    `);

    // Migration: Check if campaigns table already existed but lacks userId column
    try {
      const columns = await db.execute("PRAGMA table_info(campaigns)");
      const hasUserId = columns.rows.some((col) => col.name === "userId");
      if (!hasUserId) {
        await db.execute("ALTER TABLE campaigns ADD COLUMN userId INTEGER");
        console.log("Migration: Added userId column to campaigns table.");
      }
    } catch (err) {
      console.error("Migration failed:", err);
    }

    // Seed default admin user if users table is empty
    const userCountResult = await db.execute("SELECT COUNT(*) as count FROM users");
    const count = Number(userCountResult.rows[0]?.count ?? 0);
    if (count === 0) {
      const defaultUsername = "admin";
      const defaultPassword = "AdminMoklet@2026";
      const hashedPassword = hashPassword(defaultPassword);
      
      await db.execute({
        sql: "INSERT INTO users (username, password) VALUES (?, ?)",
        args: [defaultUsername, hashedPassword]
      });
      console.log("Seeded default admin user successfully.");
    }
  } catch (error) {
    console.error("Database schema initialization failed:", error);
  }
}

// Trigger database initialization asynchronously
initDb().catch((err) => {
  console.error("Async DB init error:", err);
});

export default db;
