import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-server";
import db from "@/lib/db";
import AdminClient from "./admin-client";

export default async function AdminPage() {
  // Validate session on the server
  const session = await getSessionUser();
  if (!session) {
    redirect("/login");
  }

  // Fetch initial campaign data directly on the server
  const result = await db.execute("SELECT * FROM campaigns ORDER BY createdAt DESC");
  
  // Map rows to clean Campaign objects
  const campaigns = result.rows.map((row) => ({
    id: Number(row.id),
    slug: String(row.slug),
    title: String(row.title),
    frameUrl: String(row.frameUrl),
    caption: String(row.caption || ""),
    createdAt: String(row.createdAt),
  }));

  return <AdminClient initialCampaigns={campaigns} username={session.username} />;
}

export const dynamic = "force-dynamic";

