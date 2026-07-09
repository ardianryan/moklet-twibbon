import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { verifyPassword } from "@/lib/auth-helpers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const cleanUsername = username.toLowerCase().trim();

    // Query user
    const result = await db.execute({
      sql: "SELECT * FROM users WHERE username = ?",
      args: [cleanUsername]
    });
    
    const user = result.rows[0] as unknown as {
      id: number;
      username: string;
      password: string;
    } | undefined;

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    // Generate session token (expires in 7 days)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Store session in DB
    await db.execute({
      sql: "INSERT INTO sessions (id, userId, expiresAt) VALUES (?, ?, ?)",
      args: [token, user.id, expiresAt]
    });

    // Set cookie
    const response = NextResponse.json({ success: true, username: user.username });
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
