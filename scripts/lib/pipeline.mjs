import path from 'node:path';
import { readJson, writeJson, readWeeks } from './storage.mjs';
import { monday, dateKey, previousWeek, isBoundaryWindow, isoWeek, DAY, BOUNDARY_TOLERANCE } from './calendar.mjs';
import { relevance } from './discovery.mjs';
import { activityScore, weeklyRanking, aggregateAllTime } from './scoring.mjs';

const validName = name => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(name);
const repoPath = name => '/repos/' + name.split('/').map(encodeURIComponent).join('/');
export async function updateData({ root, get, now = new Date(), clock = () => new Date(), log = console.log, discover = true }) {
  const config = await readJson(path.join(root,'config/repositories.json'));
  const catalogPath = path.join(root,'data/catalog.json');
  const catalog = await readJson(catalogPath, { schema_version: 1, updated_at: null, repositories: [] });
  const excluded = new Set(config.exclude.map(n => n.toLowerCase()));
  const included = new Set(config.include.map(n => n.toLowerCase()));
  const known = new Map(catalog.repositories.filter(r => !excluded.has(r.full_name.toLowerCase())).map(r => [r.full_name.toLowerCase(),r]));
  const warnings = [];
  const warn = message => { warnings.push(message); log('WARN ' + message); };
  const candidates = new Map();
  for (const name of [...config.include, ...known.keys()]) {
    if (!validName(name)) throw new Error('Invalid configured repository name');
    if (!excluded.has(name.toLowerCase())) candidates.set(name.toLowerCase(), { name, manual: included.has(name.toLowerCase()) });
  }
  // Prioritize the durable pool. Discovery can consume only the remaining budget.
  let successes = 0;
  const observations = {};
  const metadataCache = new Map();
  const span = previousWeek(now);
  const boundaryKey = dateKey(monday(now));
  const boundaryPath = path.join(root,`data/boundaries/${boundaryKey}.json`);
  const boundary = await readJson(boundaryPath, { schema_version: 1, boundary: boundaryKey, repositories: {} });
  const previous = await readJson(path.join(root,`data/boundaries/${span.start}.json`), { repositories: {} });
  const inWindow = isBoundaryWindow(now);

  async function inspect(candidate) {
    const key = candidate.name.toLowerCase();
    try {
      const meta = metadataCache.get(key) || await get(repoPath(candidate.name));
      const canonical = meta.full_name.toLowerCase();
      if (excluded.has(canonical) || meta.archived || meta.disabled || meta.fork || meta.private) { known.delete(key); return; }
      let assessment = known.get(key)?.relevance;
      if (!assessment || !known.get(key)?.relevance_checked_at || +now - +new Date(known.get(key).relevance_checked_at) > 28 * DAY) {
        const readme = await get(repoPath(meta.full_name) + '/readme');
        const tree = await get(repoPath(meta.full_name) + '/git/trees/' + encodeURIComponent(meta.default_branch) + '?recursive=1');
        if (tree.truncated) warn(`${meta.full_name}: tree truncated; relevance uses returned files only`);
        assessment = relevance({ description: meta.description || '', topics: meta.topics || [], readme: Buffer.from(readme.content || '', 'base64').toString('utf8').slice(0,150000), paths: tree.tree.filter(f => f.type === 'blob').map(f => f.path) });
        if (!candidate.manual && (!assessment.structural || assessment.score < config.discovery.threshold)) { known.delete(key); return; }
      }
      if (!candidate.manual && (!assessment.structural || assessment.score < config.discovery.threshold)) return;
      const capturedAt = clock().toISOString();
      // Capture the actual instant for each repository; tests inject a clock.
      const observedAt = capturedAt;
      const old = known.get(key) || known.get(canonical);
      const record = {
        full_name: meta.full_name, owner: meta.owner.login, name: meta.name, url: 'https://github.com/' + meta.full_name,
        description: (meta.description || '').slice(0,500), language: meta.language, topics: (meta.topics || []).slice(0,12),
        stars: meta.stargazers_count, forks: meta.forks_count, discovered_at: old?.discovered_at || observedAt,
        last_updated: observedAt, pushed_at: meta.pushed_at, relevance: assessment,
        relevance_checked_at: old?.relevance === assessment ? old.relevance_checked_at : observedAt, manual: candidate.manual
      };
      known.delete(key); known.set(canonical, record);
      successes++;
      observations[canonical] = { full_name: meta.full_name, stars: record.stars, forks: record.forks, observed_at: observedAt };
      if (inWindow && +new Date(observedAt) - +monday(now) <= BOUNDARY_TOLERANCE) {
        // On reruns, preserve successful counts from the first observation.
        if (!boundary.repositories[canonical]) boundary.repositories[canonical] = observations[canonical];
        const point = boundary.repositories[canonical];
        if (previous.repositories[canonical] && point.activity === undefined) {
          try {
            const commits = await get(repoPath(meta.full_name) + '/commits?since=' + span.start + 'T00:00:00Z&until=' + span.end + 'T00:00:00Z&per_page=100');
            const dated = commits.filter(c => c.commit?.committer?.date >= span.start + 'T00:00:00Z' && c.commit.committer.date < span.end + 'T00:00:00Z');
            const days = new Set(dated.map(c => c.commit.committer.date.slice(0,10))).size;
            point.activity = activityScore(dated.length, days);
            point.commits_sampled = dated.length;
            point.activity_capped = commits.length === 100;
          } catch(e) { warn(`${meta.full_name}: activity unavailable; omitted from this week's ranking (${e.message})`); }
        }
      }
      log(`TRACK ${meta.full_name} (${assessment.score}/100)`);
    } catch(e) { warn(`${candidate.name}: ${e.message}`); }
  }
  for (const candidate of candidates.values()) await inspect(candidate);
  if (discover && config.discovery.enabled) {
    let added = 0;
    for (const query of config.discovery.queries) {
      if (added >= config.discovery.maxNewPerRun || known.size >= config.discovery.maxTracked) break;
      try {
        const search = await get('/search/repositories?q=' + encodeURIComponent(query + ` stars:>=${config.discovery.minStars} archived:false fork:false`) + '&sort=updated&order=desc&per_page=20');
        for (const item of search.items) {
          const key = item.full_name.toLowerCase();
          if (candidates.has(key) || excluded.has(key) || known.has(key)) continue;
          if (added >= config.discovery.maxNewPerRun || known.size >= config.discovery.maxTracked) break;
          candidates.set(key, { name: item.full_name, manual: false });
          metadataCache.set(key,item);
          await inspect(candidates.get(key));
          added++;
        }
      } catch(e) { warn(`Discovery: ${e.message}`); if (e.rateLimited) break; }
    }
  }
  if (!successes) throw new Error('No repositories fetched successfully. Existing data preserved.');
  if (inWindow && Object.keys(boundary.repositories).length) await writeJson(boundaryPath, boundary);
  const existingWeeks = await readWeeks(root);
  const oldWeek = existingWeeks.find(w => w.start === span.start);
  const before = existingWeeks.find(w => w.end === span.start && w.source_kind !== 'backfill');
  if (inWindow) {
    const rows = Object.entries(boundary.repositories).filter(([key,r]) => previous.repositories[key] && Number.isFinite(r.activity) && !excluded.has(key)).map(([key,r]) => {
      const prev = previous.repositories[key];
      const hours = (+new Date(r.observed_at) - +new Date(prev.observed_at)) / 3600000;
      if (hours < 162 || hours > 174) return null;
      return { ...r, stars_delta: r.stars - prev.stars, forks_delta: r.forks - prev.forks, observed_from: prev.observed_at, observed_to: r.observed_at };
    }).filter(Boolean);
    if (rows.length) {
      const result = weeklyRanking(rows, before?.rows || []);
      const week = { schema_version: 1, week: isoWeek(span.start), ...span, timezone: 'UTC', generated_at: oldWeek?.generated_at || now.toISOString(), algorithm: 'weekly-v1', anchors: result.anchors, rows: result.rows };
      await writeJson(path.join(root,`data/weeks/${span.start}.json`), week);
    }
  }
  const allTime = aggregateAllTime((await readWeeks(root)).filter(w => w.source_kind !== 'backfill'));
  await writeJson(path.join(root,'data/all-time.json'), { schema_version: 1, repositories: allTime });
  await writeJson(catalogPath, { schema_version: 1, updated_at: now.toISOString(), repositories: [...known.values()].sort((a,b) => a.full_name.localeCompare(b.full_name)) });
  const report = { updated_at: now.toISOString(), successful_repositories: successes, tracked_repositories: known.size, boundary_captured: inWindow, warnings };
  await writeJson(path.join(root,'data/update-report.json'), report);
  log(JSON.stringify(report, null, 2));
  return report;
}
