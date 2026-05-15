// services/github.ts — GitHub REST API client
// SERVER-SIDE ONLY — uses GITHUB_PAT from environment

import { GitHubRepo, GitHubRepoSummary } from "@/types/github";

const GITHUB_API = "https://api.github.com";

/**
 * Fetches public repos for the configured GitHub user.
 * Returns simplified repo summaries for LLM consumption.
 */
export async function fetchPublicRepos(): Promise<GitHubRepoSummary[]> {
  const username = process.env.GITHUB_USERNAME;
  const token = process.env.GITHUB_PAT;

  if (!username || !token) {
    throw new Error("GITHUB_USERNAME or GITHUB_PAT not configured");
  }

  const response = await fetch(
    `${GITHUB_API}/users/${username}/repos?sort=updated&per_page=30&type=public`,
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "resume-tailor-v26",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const repos: GitHubRepo[] = await response.json();

  return repos.map((repo) => ({
    name: repo.name,
    description: repo.description || "",
    language: repo.language || "Unknown",
    stars: repo.stargazers_count,
    topics: repo.topics || [],
    url: repo.html_url,
  }));
}

/**
 * Formats repo data as a string for LLM consumption.
 */
export function formatReposForPrompt(repos: GitHubRepoSummary[]): string {
  return repos
    .slice(0, 15) // Top 15 repos only
    .map(
      (r) =>
        `- ${r.name} (${r.language}, ⭐${r.stars}): ${r.description}${r.topics.length ? ` [${r.topics.join(", ")}]` : ""}`
    )
    .join("\n");
}
