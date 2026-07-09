import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { hashPassword } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

// GET all registered users (admin only)
export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.execute("SELECT id, username, role, createdAt FROM users ORDER BY createdAt DESC");
    
    // Map rows to clean JavaScript objects
    const users = result.rows.map((row) => ({
      id: Number(row.id),
      username: String(row.username),
      role: String(row.role || "user"),
      createdAt: String(row.createdAt),
    }));

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST register a new user (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, password, role } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim();
    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const targetRole = role === "admin" ? "admin" : "user";

    // Check if user already exists
    const existingResult = await db.execute({
      sql: "SELECT username FROM users WHERE username = ?",
      args: [cleanUsername]
    });
    
    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    // Hash and store new user
    const hashedPassword = hashPassword(password);
    await db.execute({
      sql: "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      args: [cleanUsername, hashedPassword, targetRole]
    });

    return NextResponse.json({ success: true, username: cleanUsername });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a registered user (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const userId = parseInt(idStr, 10);

    // Prevent deleting the currently logged-in user to avoid lockout
    if (userId === session.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const res = await db.execute({
      sql: "DELETE FROM users WHERE id = ?",
      args: [userId]
    });
    
    if (res.rowsAffected === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update a user's details (admin only)
export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, username, password, role } = await req.json();

    if (!id || !username) {
      return NextResponse.json({ error: "ID and username are required" }, { status: 400 });
    }

    const userId = parseInt(id, 10);
    const cleanUsername = username.toLowerCase().trim();

    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    }

    const targetRole = role === "admin" ? "admin" : "user";

    // Prevent self-demotion to avoid losing admin capability
    if (userId === session.userId && targetRole === "user") {
      return NextResponse.json({ error: "Cannot demote your own account's Admin role" }, { status: 400 });
    }

    // Check if username is already taken by another user
    const existingResult = await db.execute({
      sql: "SELECT id FROM users WHERE username = ? AND id != ?",
      args: [cleanUsername, userId]
    });
    
    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    if (password && password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    if (password) {
      const hashedPassword = hashPassword(password);
      await db.execute({
        sql: "UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?",
        args: [cleanUsername, hashedPassword, targetRole, userId]
      });
    } else {
      await db.execute({
        sql: "UPDATE users SET username = ?, role = ? WHERE id = ?",
        args: [cleanUsername, targetRole, userId]
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
