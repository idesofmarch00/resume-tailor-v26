import { NextResponse } from "next/server";
import { fetchPublicRepos } from "@/services/github";

export async function GET() {
  try {
    const repos = await fetchPublicRepos();
    return NextResponse.json({ success: true, repos });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "GitHub fetch failed" },
      { status: 500 }
    );
  }
}
