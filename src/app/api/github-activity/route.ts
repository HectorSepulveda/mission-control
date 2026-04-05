import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      name: string
      date: string
    }
  }
  html_url: string
  author: {
    login: string
    avatar_url: string
  } | null
}

interface CommitInfo {
  sha: string
  message: string
  author_name: string
  author_login: string | null
  author_avatar: string | null
  date: string
  url: string
}

export async function GET() {
  try {
    const token = process.env.GITHUB_TOKEN
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'mission-control-dashboard',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(
      'https://api.github.com/repos/HectorSepulveda/mission-control/commits?per_page=5',
      { headers, next: { revalidate: 300 } }
    )

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json(
        { error: `GitHub API ${res.status}: ${errText}` },
        { status: res.status }
      )
    }

    const data = await res.json() as GitHubCommit[]

    const commits: CommitInfo[] = data.map((c) => ({
      sha: c.sha.substring(0, 7),
      message: c.commit.message.split('\n')[0],
      author_name: c.commit.author.name,
      author_login: c.author?.login ?? null,
      author_avatar: c.author?.avatar_url ?? null,
      date: c.commit.author.date,
      url: c.html_url,
    }))

    return NextResponse.json({ commits })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'error' },
      { status: 500 }
    )
  }
}
