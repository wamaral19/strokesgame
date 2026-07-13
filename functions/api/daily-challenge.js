// Cloudflare Pages Function: POST /api/daily-challenge
//
// Commits a daily-challenge entry (and any uploaded media) straight to the
// repo via the GitHub API. The push to `main` triggers the normal deploy
// workflow, so the admin page no longer needs to write local files.
//
// Required Pages environment variables (set in the Cloudflare dashboard or via
// `wrangler pages secret put`):
//   GITHUB_TOKEN         fine-grained PAT with Contents: Read and write on this repo
//   DAILY_ADMIN_SECRET   shared secret the admin page must send as x-admin-key
//
// Optional overrides (default to this repo/branch):
//   GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH

const DEFAULTS = {
  owner: "wamaral19",
  repo: "strokesgame",
  branch: "main",
};
const SCHEDULE_PATH = "public/daily-challenges/schedule.json";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function githubApi(token, owner, repo) {
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "user-agent": "strokesgame-daily-admin",
    "x-github-api-version": "2022-11-28",
  };

  async function call(method, path, payload) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      throw new Error(`GitHub ${method} ${path} -> ${res.status}: ${data.message || text}`);
    }
    return data;
  }

  return {
    // Returns { text } for an existing file, or null if it does not exist yet.
    async getFileText(filePath, branch) {
      const res = await fetch(
        `${base}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}?ref=${branch}`,
        { headers },
      );
      if (res.status === 404) return null;
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(`GitHub get contents -> ${res.status}: ${data.message || text}`);
      // atob is available in the Workers runtime.
      const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
      return { text: decoded };
    },

    // Atomically commit multiple files as a single commit on `branch`.
    async commitFiles({ branch, message, files }) {
      const ref = await call("GET", `/git/ref/heads/${branch}`);
      const baseCommitSha = ref.object.sha;
      const baseCommit = await call("GET", `/git/commits/${baseCommitSha}`);

      const tree = [];
      for (const file of files) {
        const blob = await call("POST", "/git/blobs", {
          content: file.content,
          encoding: file.encoding, // "utf-8" or "base64"
        });
        tree.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
      }

      const newTree = await call("POST", "/git/trees", {
        base_tree: baseCommit.tree.sha,
        tree,
      });
      const commit = await call("POST", "/git/commits", {
        message,
        tree: newTree.sha,
        parents: [baseCommitSha],
      });
      await call("PATCH", `/git/refs/heads/${branch}`, { sha: commit.sha });
      return commit.sha;
    },
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.DAILY_ADMIN_SECRET) {
    return json({ error: "Server missing DAILY_ADMIN_SECRET." }, 500);
  }
  if (request.headers.get("x-admin-key") !== env.DAILY_ADMIN_SECRET) {
    return json({ error: "Unauthorized." }, 401);
  }
  if (!env.GITHUB_TOKEN) {
    return json({ error: "Server missing GITHUB_TOKEN." }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }

  const { challenge, images } = payload || {};
  if (!challenge || typeof challenge.date !== "string" || !Array.isArray(challenge.items)) {
    return json({ error: "Invalid challenge payload." }, 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(challenge.date)) {
    return json({ error: "challenge.date must be YYYY-MM-DD." }, 400);
  }

  const owner = env.GITHUB_OWNER || DEFAULTS.owner;
  const repo = env.GITHUB_REPO || DEFAULTS.repo;
  const branch = env.GITHUB_BRANCH || DEFAULTS.branch;
  const gh = githubApi(env.GITHUB_TOKEN, owner, repo);

  try {
    const current = await gh.getFileText(SCHEDULE_PATH, branch);
    let schedule = current ? JSON.parse(current.text) : [];
    if (!Array.isArray(schedule)) schedule = [];

    // Replace any existing entry for this date, then keep the list sorted.
    schedule = schedule.filter((entry) => entry && entry.date !== challenge.date);
    schedule.push(challenge);
    schedule.sort((a, b) => a.date.localeCompare(b.date));

    const files = [
      {
        path: SCHEDULE_PATH,
        content: `${JSON.stringify(schedule, null, 2)}\n`,
        encoding: "utf-8",
      },
    ];
    for (const image of images || []) {
      if (!image || typeof image.path !== "string" || typeof image.base64 !== "string") continue;
      files.push({ path: image.path, content: image.base64, encoding: "base64" });
    }

    const commitSha = await gh.commitFiles({
      branch,
      message: `Add daily challenge ${challenge.date}`,
      files,
    });

    return json({ ok: true, date: challenge.date, commit: commitSha });
  } catch (error) {
    return json({ error: String(error && error.message ? error.message : error) }, 502);
  }
}

export async function onRequest() {
  return json({ error: "Use POST." }, 405);
}
