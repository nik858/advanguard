/**
 * Verifies the GITHUB_TOKEN powers the admin publish/restore flow without
 * writing anything to the repo:
 *   - getFile        → Contents:read works, branch resolves
 *   - listRecentCommits → history (restore feature) works
 *   - repo.permissions.push → confirms write capability for publish
 *
 * Usage: node --env-file=.env.local --import tsx scripts/verify-github.ts
 */
import { Octokit } from "@octokit/rest";
import { getFile, listRecentCommits } from "@/lib/github";

async function main() {
  const slug = process.env.GITHUB_REPO || "";
  const [owner, repo] = slug.split("/");
  console.log(`Repo   : ${slug}`);
  console.log(`Branch : ${process.env.GITHUB_BRANCH || "main"}\n`);

  console.log("[1/3] getFile('content/content.json')…");
  const file = await getFile("content/content.json");
  console.log(`  → OK (sha ${file.sha.slice(0, 7)})\n`);

  console.log("[2/3] listRecentCommits('content/content.json')…");
  const commits = await listRecentCommits("content/content.json", 3);
  console.log(`  → OK (${commits.length} commits, latest: "${commits[0]?.message.split("\n")[0]}")\n`);

  console.log("[3/3] repo write permission…");
  const o = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const r = await o.rest.repos.get({ owner, repo });
  const push = r.data.permissions?.push;
  console.log(`  → push=${push}`);
  if (!push) throw new Error("token lacks write access — publish would fail");

  console.log("\n✓ Admin publish + restore flow is wired correctly.");
}

main().catch((e) => {
  console.error("\n✗ VERIFY FAILED:", e.status ? `${e.status} ${e.message}` : e.message || e);
  process.exit(1);
});
