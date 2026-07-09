import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";

// Initialize S3 client only if R2 credentials are provided and are not placeholders
const hasR2 = !!(
  process.env.R2_ENDPOINT &&
  !process.env.R2_ENDPOINT.includes("your_") &&
  process.env.R2_ACCESS_KEY_ID &&
  !process.env.R2_ACCESS_KEY_ID.includes("your_") &&
  process.env.R2_SECRET_ACCESS_KEY &&
  !process.env.R2_SECRET_ACCESS_KEY.includes("your_") &&
  process.env.R2_BUCKET_NAME &&
  !process.env.R2_BUCKET_NAME.includes("your_")
);

const s3Client = hasR2
  ? new S3Client({
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      region: "auto", // R2 uses auto region
    })
  : null;

/**
 * Uploads a file to storage (R2 bucket or local disk fallback).
 * Returns the public URL/path of the file.
 */
export async function uploadFrame(file: File, slug: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = new Uint8Array(bytes);
  
  const fileExt = file.name.split(".").pop() || "png";
  const fileName = `${slug}-${Date.now()}.${fileExt}`;

  if (s3Client) {
    const bucketName = process.env.R2_BUCKET_NAME!;
    const folder = process.env.R2_FOLDER_PATH || "twbsmansage";
    // Key path: twbsmansage/slug-timestamp.png
    const objectKey = `${folder}/${fileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: buffer,
        ContentType: file.type || "image/png",
      })
    );
    
    // Construct R2 public URL: https://static-r2-apac.ppti.me/twbsmansage/slug-timestamp.png
    const publicBase = process.env.R2_PUBLIC_URL || "";
    const cleanBase = publicBase.endsWith("/") ? publicBase.slice(0, -1) : publicBase;
    return `${cleanBase}/${objectKey}`;
  } else {
    // Local fallback: write to public/uploads/
    const uploadsDir = path.resolve(process.cwd(), "public/uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, buffer);
    return `/uploads/${fileName}`;
  }
}

/**
 * Deletes a file from storage (R2 bucket or local disk fallback).
 */
export async function deleteFrame(fileUrl: string): Promise<void> {
  if (s3Client && fileUrl.startsWith("http")) {
    try {
      const bucketName = process.env.R2_BUCKET_NAME!;
      const folder = process.env.R2_FOLDER_PATH || "twbsmansage";
      // Extract the filename from the URL path
      const urlParts = fileUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      if (!fileName) return;

      const objectKey = `${folder}/${fileName}`;

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
        })
      );
    } catch (err) {
      console.error("Failed to delete file from Cloudflare R2:", err);
    }
  } else {
    // Local fallback deletion
    try {
      if (fileUrl.startsWith("/uploads/")) {
        const filePath = path.join(process.cwd(), "public", fileUrl);
        await fs.unlink(filePath);
      }
    } catch (err) {
      console.error("Failed to delete local file:", err);
    }
  }
}
