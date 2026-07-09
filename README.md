# 🌿 Smansage Twibbon Maker & Campaign Manager

An ad-free, modern, and open-source Twibbon generator and campaign manager platform. Built with Next.js, customized with a soft sage green design theme, and equipped with a full administrative management console.

Designed to be hosted 100% free on serverless platforms (like Vercel or Netlify) using Cloudflare R2 and Turso, or self-hosted via Docker (Coolify).

---

## 🚀 One-Click Deploy

Deploy this project to your favorite serverless platform with a single click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fardianryan%2Fmoklet-twibbon&env=TURSO_DATABASE_URL,TURSO_AUTH_TOKEN,R2_ENDPOINT,R2_BUCKET_NAME,R2_FOLDER_PATH,R2_PUBLIC_URL,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/ardianryan/moklet-twibbon)

### 🐳 Self-Host with Coolify / Docker
To host on your own VPS using **Coolify** or raw **Docker**, you can run the application using local SQLite storage and persistent volumes. Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  twibbon-app:
    image: node:18-alpine
    build: .
    ports:
      - "3000:3000"
    volumes:
      - twibbon_db:/app/twibbon.db
      - twibbon_uploads:/app/public/uploads
    environment:
      - PORT=3000
      - NODE_ENV=production

volumes:
  twibbon_db:
  twibbon_uploads:
```

---

## 🧐 Key Features

*   **Sage Green Aesthetics**: Soft green user interface styled for a modern visual experience.
*   **Campaign Management Dashboard**: Create, edit, and delete campaigns. Manage custom short slugs (e.g. `domain.com/slug`) and prefilled captions.
*   **Multi-User Authentication**: Master admin account (`admin` with user creation controls) and operator accounts.
*   **Ownership Restrictions**: Operators can only edit/delete campaigns they created.
*   **Automatic Image Purging**: Replacing or deleting campaign frames automatically purges old image assets from storage.
*   **No Watermarks**: Pure HTML5 canvas-based image processing for crisp, high-resolution downloads.
*   **Dual-Mode Storage Adapter**:
    *   **Local Development**: Works out of the box using local SQLite file (`twibbon.db`) and local folder storage (`public/uploads`).
    *   **Cloud Production**: Automatically shifts to **Turso Cloud SQLite** and **Cloudflare R2 Object Storage** if cloud credentials are present in the environment variables.

---

## 🛠 Local Development Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment variables
Create a `.env.local` file in the root directory:
```env
# Database configuration (Turso Cloud SQLite)
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_auth_token_here

# Cloudflare R2 Storage configuration
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET_NAME=your-bucket-name
R2_FOLDER_PATH=twbsmansage
R2_PUBLIC_URL=https://your-public-cdn-url.com
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_key_here
```
*(Leave values blank or keep default placeholders to automatically run with local file fallback).*

### 3. Run development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The default admin credentials are:
*   **Username**: `admin`
*   **Password**: `AdminMoklet@2026`

---

## 👷‍♂️ Production Compilation

To compile and verify the build locally:
```bash
npm run build
npm start
```

---

## 💻 Tech Stack

*   **Framework**: Next.js 14 (App Router)
*   **Database Client**: `@libsql/client` (SQLite / Turso)
*   **Object Storage**: `@aws-sdk/client-s3` (Cloudflare R2 / S3-compatible)
*   **Styling**: Tailwind CSS & Vanilla CSS
*   **Canvas Processing**: Fabric.js / HTML5 Canvas
