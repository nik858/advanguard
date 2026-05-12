import { Octokit } from "@octokit/rest";

function getClient() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");
  return new Octokit({ auth: token });
}
function repoSlug(): { owner: string; repo: string } {
  const slug = process.env.GITHUB_REPO;
  if (!slug || !slug.includes("/")) throw new Error("GITHUB_REPO must be 'owner/repo'");
  const [owner, repo] = slug.split("/");
  return { owner, repo };
}
function branch(): string { return process.env.GITHUB_BRANCH || "main"; }

export async function getFile(path: string): Promise<{ sha: string; content: unknown }> {
  const o = getClient();
  const { owner, repo } = repoSlug();
  const res = await o.rest.repos.getContent({ owner, repo, path, ref: branch() });
  if (Array.isArray(res.data) || res.data.type !== "file") throw new Error("Not a file");
  const text = Buffer.from(res.data.content, "base64").toString("utf-8");
  return { sha: res.data.sha, content: JSON.parse(text) };
}

export async function putFile(args: { path: string; content: unknown; sha?: string; message: string }): Promise<{ commitSha: string }> {
  const o = getClient();
  const { owner, repo } = repoSlug();
  const res = await o.rest.repos.createOrUpdateFileContents({
    owner, repo, path: args.path, branch: branch(),
    message: args.message, sha: args.sha,
    content: Buffer.from(JSON.stringify(args.content, null, 2)).toString("base64"),
  });
  return { commitSha: res.data.commit.sha! };
}

export async function listRecentCommits(path: string, perPage = 30): Promise<{ sha: string; message: string; date: string }[]> {
  const o = getClient();
  const { owner, repo } = repoSlug();
  const res = await o.rest.repos.listCommits({ owner, repo, path, per_page: perPage, sha: branch() });
  return res.data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    date: c.commit.author?.date || c.commit.committer?.date || "",
  }));
}
