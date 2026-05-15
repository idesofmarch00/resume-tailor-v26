// types/github.ts — GitHub API response types

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  updated_at: string;
}

export interface GitHubRepoSummary {
  name: string;
  description: string;
  language: string;
  stars: number;
  topics: string[];
  url: string;
}
