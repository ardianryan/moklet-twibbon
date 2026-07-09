import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";
import { uploadFrame, deleteFrame } from "@/lib/storage";

export const dynamic = "force-dynamic";

// GET campaigns (filtered by creator ownership, except for admin)
export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    let campaigns;
    if (session.username === "admin") {
      const result = await db.execute("SELECT * FROM campaigns ORDER BY createdAt DESC");
      campaigns = result.rows.map((row) => ({
        id: Number(row.id),
        slug: String(row.slug),
        title: String(row.title),
        frameUrl: String(row.frameUrl),
        caption: String(row.caption || ""),
        userId: row.userId ? Number(row.userId) : null,
        createdAt: String(row.createdAt),
      }));
    } else {
      const result = await db.execute({
        sql: "SELECT * FROM campaigns WHERE userId = ? ORDER BY createdAt DESC",
        args: [session.userId]
      });
      campaigns = result.rows.map((row) => ({
        id: Number(row.id),
        slug: String(row.slug),
        title: String(row.title),
        frameUrl: String(row.frameUrl),
        caption: String(row.caption || ""),
        userId: row.userId ? Number(row.userId) : null,
        createdAt: String(row.createdAt),
      }));
    }
    
    return NextResponse.json(campaigns);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST publish a new campaign
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const caption = formData.get("caption") as string;
    const file = formData.get("file") as File | null;

    if (!title || !slug || !file) {
      return NextResponse.json({ error: "Title, slug, and file are required" }, { status: 400 });
    }

    const cleanedSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "");

    if (!cleanedSlug) {
      return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });
    }

    // Check if slug already exists
    const existingResult = await db.execute({
      sql: "SELECT slug FROM campaigns WHERE slug = ?",
      args: [cleanedSlug]
    });
    
    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
    }

    // Upload frame file using storage helper (R2 or local fallback)
    const frameUrl = await uploadFrame(file, cleanedSlug);

    // Insert campaign into database
    await db.execute({
      sql: "INSERT INTO campaigns (slug, title, frameUrl, caption, userId) VALUES (?, ?, ?, ?, ?)",
      args: [cleanedSlug, title, frameUrl, caption || "", session.userId]
    });

    return NextResponse.json({ success: true, slug: cleanedSlug });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a campaign
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Get the campaign details to verify ownership and get file URL
    const result = await db.execute({
      sql: "SELECT frameUrl, userId FROM campaigns WHERE slug = ?",
      args: [slug]
    });
    
    const campaign = result.rows[0];

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Verify ownership (only creator or admin can delete)
    if (campaign.userId && Number(campaign.userId) !== session.userId && session.username !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete record from database
    await db.execute({
      sql: "DELETE FROM campaigns WHERE slug = ?",
      args: [slug]
    });

    // Delete image frame from storage (R2 or local fallback)
    await deleteFrame(String(campaign.frameUrl));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update a campaign
export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const idStr = formData.get("id") as string;
    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const caption = formData.get("caption") as string;
    const file = formData.get("file") as File | null;

    if (!idStr || !title || !slug) {
      return NextResponse.json({ error: "ID, title, and slug are required" }, { status: 400 });
    }

    const campaignId = parseInt(idStr, 10);
    const cleanedSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "");

    if (!cleanedSlug) {
      return NextResponse.json({ error: "Invalid slug format" }, { status: 400 });
    }

    // Fetch existing campaign
    const result = await db.execute({
      sql: "SELECT * FROM campaigns WHERE id = ?",
      args: [campaignId]
    });
    
    const campaign = result.rows[0];

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Verify ownership (only creator or admin can edit)
    if (campaign.userId && Number(campaign.userId) !== session.userId && session.username !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if new slug is taken by another campaign
    const slugResult = await db.execute({
      sql: "SELECT id FROM campaigns WHERE slug = ? AND id != ?",
      args: [cleanedSlug, campaignId]
    });
    
    if (slugResult.rows.length > 0) {
      return NextResponse.json({ error: "Slug is already taken by another campaign" }, { status: 400 });
    }

    let frameUrl = String(campaign.frameUrl);

    // If new file is uploaded
    if (file && file.size > 0) {
      // Attempt to delete old file
      await deleteFrame(frameUrl);
      
      // Upload new file
      frameUrl = await uploadFrame(file, cleanedSlug);
    }

    // Update database
    await db.execute({
      sql: `
        UPDATE campaigns
        SET slug = ?, title = ?, frameUrl = ?, caption = ?
        WHERE id = ?
      `,
      args: [cleanedSlug, title, frameUrl, caption || "", campaignId]
    });

    return NextResponse.json({ success: true, slug: cleanedSlug });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
