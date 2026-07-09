import { notFound, redirect } from "next/navigation";
import db from "@/lib/db";

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function SlugPage({ params }: PageProps) {
  const { slug } = params;

  // Clean slug format
  const cleanedSlug = slug.toLowerCase().trim();

  // Query database for campaign
  const result = await db.execute({
    sql: "SELECT title, frameUrl, caption FROM campaigns WHERE slug = ?",
    args: [cleanedSlug]
  });
  
  const campaign = result.rows[0] as unknown as {
    title: string;
    frameUrl: string;
    caption: string;
  } | undefined;

  if (!campaign) {
    notFound();
  }

  // Construct URL parameters
  const queryParams = new URLSearchParams({
    title: campaign.title,
    frameUrl: campaign.frameUrl,
    caption: campaign.caption || "",
    slug: cleanedSlug,
  });

  // Redirect to editor
  redirect(`/go?${queryParams.toString()}`);
}
