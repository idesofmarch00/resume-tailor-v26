// lib/actions/overleaf.ts — Overleaf "Open in Overleaf" integration
"use server";

/**
 * Generates an "Open in Overleaf" URL.
 * Uses the snip_uri approach — creates a new Overleaf project from LaTeX content.
 * Works for FREE Overleaf accounts — no API key needed.
 *
 * How it works:
 * 1. We encode the LaTeX as a data URI (for small files) OR
 * 2. We serve the .zip via our API and pass the URL to Overleaf
 */
export async function generateOverleafUrl(
  latex: string,
  fileName: string
): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Store the LaTeX temporarily in an in-memory cache (keyed by fileName)
  // In production, use Vercel Blob or similar
  const encoded = Buffer.from(
    JSON.stringify({ latex, fileName })
  ).toString("base64url");

  const zipUrl = `${appUrl}/api/overleaf?data=${encoded}`;
  const overleafUrl = `https://www.overleaf.com/docs?snip_uri=${encodeURIComponent(zipUrl)}`;

  return overleafUrl;
}
