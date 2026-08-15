#!/usr/bin/env node
/**
 * Create a GitHub-verified commit on a remote branch (GraphQL createCommitOnBranch).
 *
 * Usage:
 *   node scripts/github-commit-on-branch.mjs <branch> <headline> [--repo owner/name]
 *
 * Reads the working tree vs HEAD: staged/unstaged modifications, untracked files,
 * and deletions. The remote branch must already exist; expectedHeadOid is that tip
 * (override with GITHUB_EXPECTED_HEAD_OID).
 *
 * Requires GH_TOKEN or GITHUB_TOKEN with contents:write.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const branch = process.argv[2];
const headline = process.argv[3];
const repoFlag = process.argv.indexOf("--repo");
const repoArg = repoFlag >= 0 ? process.argv[repoFlag + 1] : undefined;

if (!branch || !headline || headline.startsWith("-")) {
  console.error(
    "Usage: node scripts/github-commit-on-branch.mjs <branch> <headline> [--repo owner/name]",
  );
  process.exit(branch ? 0 : 1);
}

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  console.error("GH_TOKEN or GITHUB_TOKEN is required.");
  process.exit(1);
}

function git(args) {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || `git ${args.join(" ")} failed`);
  }
  return r.stdout.trim();
}

function repoFromRemote() {
  if (repoArg) return repoArg;
  const url = git(["remote", "get-url", "origin"]);
  const m = url.match(/github\.com[:/](.+?)(?:\.git)?$/);
  if (!m) throw new Error(`Cannot parse GitHub repo from origin: ${url}`);
  return m[1];
}

const repo = repoFromRemote();
const [owner, name] = repo.split("/");
const root = git(["rev-parse", "--show-toplevel"]);

const changed = new Set([
  ...git(["diff", "--name-only", "HEAD"]).split("\n").filter(Boolean),
  ...git(["diff", "--name-only", "--cached"]).split("\n").filter(Boolean),
  ...git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean),
]);

const deleted = new Set(
  git(["diff", "--diff-filter=D", "--name-only", "HEAD"]).split("\n").filter(Boolean),
);

const additions = [];
for (const path of [...changed].sort()) {
  if (deleted.has(path)) continue;
  const abs = resolve(root, path);
  if (!existsSync(abs)) continue;
  additions.push({
    path,
    contents: readFileSync(abs).toString("base64"),
  });
}

const deletions = [...deleted].sort().map((path) => ({ path }));

if (additions.length === 0 && deletions.length === 0) {
  console.error("No file changes to commit.");
  process.exit(1);
}

const expectedHeadOid =
  process.env.GITHUB_EXPECTED_HEAD_OID || git(["rev-parse", `origin/${branch}`]);

const query = `
mutation ($input: CreateCommitOnBranchInput!) {
  createCommitOnBranch(input: $input) {
    commit { oid url }
  }
}
`;

const input = {
  branch: {
    repositoryNameWithOwner: `${owner}/${name}`,
    branchName: branch,
  },
  message: { headline },
  expectedHeadOid,
  fileChanges: {
    ...(additions.length ? { additions } : {}),
    ...(deletions.length ? { deletions } : {}),
  },
};

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    "User-Agent": "orbit-id-github-commit-on-branch",
  },
  body: JSON.stringify({ query, variables: { input } }),
});

const body = await res.json();
if (!res.ok || body.errors) {
  console.error(JSON.stringify(body.errors || body, null, 2));
  process.exit(1);
}

const commit = body.data?.createCommitOnBranch?.commit;
if (!commit?.oid) {
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log(`created ${commit.oid} ${commit.url}`);
