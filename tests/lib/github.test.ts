// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn().mockImplementation(function () {
    return {
      rest: {
        repos: {
          getContent: vi.fn().mockResolvedValue({ data: { type: "file", sha: "abc123", content: Buffer.from('{"x":1}').toString("base64") } }),
          createOrUpdateFileContents: vi.fn().mockResolvedValue({ data: { commit: { sha: "newsha" } } }),
          listCommits: vi.fn().mockResolvedValue({ data: [{ sha: "newsha", commit: { message: "test", author: { date: "2026-05-12T00:00:00Z" } } }] }),
        },
      },
    };
  }),
}));

beforeEach(() => {
  process.env.GITHUB_TOKEN = "fake";
  process.env.GITHUB_REPO = "owner/repo";
  process.env.GITHUB_BRANCH = "main";
});

describe("github lib", () => {
  it("getFile returns content + sha", async () => {
    const { getFile } = await import("@/lib/github");
    const r = await getFile("content/content.json");
    expect(r.sha).toBe("abc123");
    expect(r.content).toEqual({ x: 1 });
  });

  it("putFile commits and returns new sha", async () => {
    const { putFile } = await import("@/lib/github");
    const r = await putFile({ path: "content/content.json", content: { x: 2 }, sha: "abc123", message: "test" });
    expect(r.commitSha).toBe("newsha");
  });

  it("listRecentCommits returns array", async () => {
    const { listRecentCommits } = await import("@/lib/github");
    const r = await listRecentCommits("content/content.json");
    expect(r).toHaveLength(1);
    expect(r[0].sha).toBe("newsha");
  });
});
