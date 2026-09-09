export class GitHubError extends Error {
  constructor(message, status, rateLimited = false) { super(message); this.status = status; this.rateLimited = rateLimited; }
}
export function githubClient({ token = process.env.GITHUB_TOKEN, fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), maxRequests = 800, apiVersion = '2022-11-28' } = {}) {
  let requests = 0;
  let exhausted = false;
  return async function get(path) {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid API path');
    if (exhausted || requests >= maxRequests) throw new GitHubError('API request budget exhausted; remaining repositories deferred', 429, true);
    for (let attempt = 0; attempt < 3; attempt++) {
      if (requests >= maxRequests) throw new GitHubError('API request budget exhausted', 429, true);
      requests++;
      let response;
      try {
        response = await fetchImpl('https://api.github.com' + path, {
          headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'GitHub-Skills-Weekly', 'X-GitHub-Api-Version': apiVersion, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          signal: AbortSignal.timeout(20000)
        });
      } catch (e) {
        if (attempt === 2) throw new GitHubError(`GitHub request failed (${e.name})`, 0);
        await sleep(1000 * 2 ** attempt); continue;
      }
      if (response.ok) return response.json();
      const limited = response.status === 429 || (response.status === 403 && (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')));
      if (limited) {
        const retrySeconds = Number(response.headers.get('retry-after') || 0);
        const resetSeconds = Math.max(0, Number(response.headers.get('x-ratelimit-reset') || 0) - Date.now()/1000);
        const wait = Math.ceil(Math.max(retrySeconds, resetSeconds, 2) * 1000);
        if (wait <= 15000 && attempt < 2) { await sleep(wait); continue; }
        exhausted = true;
        throw new GitHubError('GitHub rate limit reached; retry on the next run', response.status, true);
      }
      if (response.status >= 500 && attempt < 2) { await sleep(1000 * 2 ** attempt); continue; }
      throw new GitHubError(`GitHub returned HTTP ${response.status} for ${path.split('?')[0]}`, response.status);
    }
  };
}
