# GitHub Skills Weekly

[Live website](https://xylopyrifer.github.io/github-skills-weekly/) · [Source code](https://github.com/xylopyrifer/github-skills-weekly)

A bilingual English / Chinese discovery site for AI Agent Skills. Ranks a tracked repository pool by weekly momentum, preserves all-time influence, and runs on GitHub Pages or any small static server.

**MIT License · Copyright (c) 2026 若蘅 Xylopyrifer.** Retain the copyright and license notices when reusing the code. Tracked third-party repositories retain their own licenses.

## Run

Node.js 22+; no production dependencies or database.

```sh
npm install
npm run dev       # http://127.0.0.1:4173
npm test
npm run build     # dist/
npm run update    # GitHub REST collection
npm run package   # release/github-skills-weekly-web.zip
```

For local authenticated collection, create `.env` from `.env.example` and run `node --env-file=.env scripts/update.mjs`. Never commit tokens. Actions uses its automatic `GITHUB_TOKEN`.

## Publish

Push the source to a public repository with default branch `main`. In **Settings → Pages**, select **GitHub Actions**. Run **Publish website to GitHub Pages** in Actions. The weekly workflow collects, commits changed data, builds, and deploys directly; it does not rely on a bot push triggering another workflow.

Any static host can serve the contents of `dist/`. Hash-based details work under a project subdirectory without rewrite rules. A `Dockerfile` and Nginx configuration are included. Docker images are snapshots: rebuild them after data updates or mount the newly built `dist/`.

## Data integrity

- Real data is the default; an opt-in demo uses entirely fictional `demo/*` projects.
- Five official historical backfill weeks are available. They use daily star aggregates and surviving fork creation records, not exact UTC net growth. Backfilled cumulative scores are kept separate from snapshot scores. Two consecutive Monday samples are still required for a snapshot-based ranking.
- UTC weeks run Monday 00:00 to the next Monday 00:00, exclusive. The schedule starts at 00:00 UTC. Actual per-repository observation times are retained; a six-hour delay tolerance is allowed. Missed weeks are not fabricated.
- Growth is a snapshot difference, not an exact reconstruction of midnight event counts.
- API failures are isolated per repository. Missing observations and activity never become artificial zeros. All-repository failures preserve existing files and fail the job.
- All historical weeks are archived permanently. Only the most recent five calendar weeks and compact cumulative totals are shipped to the browser.

## Scoring

Weekly heat: **60% star growth + 15% fork growth + 15% activity + 10% size**, each normalized to 0–100. Growth uses a logarithm against the pool’s P90 with minimum anchors of 100 stars and 20 forks. Negative deltas remain visible but score zero. Fork scoring is capped at `max(20, 0.5 × positive star growth)`. Activity combines commits (70%) and active days (30%), using up to 100 default-branch commits; size uses logarithmic total stars against 100,000.

All-time heat sums weekly heat with modest TOP 10 rank and consecutive-week bonuses. Rebuilding is deterministic and does not double count weeks.

## Discovery

GitHub Search candidates are checked against file-tree `SKILL.md` paths, explicit skill topics, README, description, and install instructions. A repository name alone never qualifies. Automatic inclusion requires 65/100 relevance and a real skill file or explicit skill topic. `config/repositories.json` supports curated `include` and overriding `exclude` lists.

The interface is fully bilingual. Selected curated repositories have bilingual summaries in `config/editorial.json`; other descriptions stay in their original language and are labeled as source text. No third-party code is executed.

See [the full documentation](README.md) for exact formulas, data schema, workflow configuration, known limitations, and file responsibilities. See [validation](docs/VALIDATION.md) for actual test coverage. Real mobile devices and Docker have not been tested; GitHub Pages deployment and the full cloud update workflow were verified successfully on 2026-09-09.

## Five-week historical backfill

`npm run backfill` fetches the preceding five complete calendar weeks. It uses GitHub's official `/stargazers/history` daily aggregates, surviving fork creation records, and default-branch commits. Source day boundaries are not guaranteed to align with UTC, and fork deletions cannot be recovered. Displayed totals and the size score are collection-time values, not historical balances. The retained audit file stores source aggregates and collection timestamps.

Backfilled rankings are marked `backfill-v1`; their cumulative scores are never merged into the official snapshot cumulative score. Until official snapshot weeks exist, the homepage explicitly displays backfilled cumulative impact. Asterisk markers identify historical backfill points in detail charts. Missing or inconsistent data is rejected, not interpolated. See the Chinese README for the full limitations and reproducible command.


### Tags and retention
Collection runs daily at 00:00 UTC (08:00 Beijing); Monday runs settle weekly rankings. GitHub scheduling may be delayed. Current metadata is overwritten; weekly aggregates are retained permanently and boundary snapshots for about eight weeks. Official weeks replace the five bootstrap weeks naturally; backfill is excluded from official cumulative scores.

config/tags.json defines bilingual capabilities. System classification matches descriptions, topics, README text and SKILL.md paths, preserving evidence and previous results on failures. Community selections use public GitHub Issues, validated and deployed through Actions with daily reconciliation. Internal system_tags and data/community-tags.json remain separate; the UI combines them. The system counts once, plus once per account/tag/project. The latest issue replaces that account’s selections; closing or locking it withdraws them. Moderators can lock inappropriate submissions.

Search all tracked repositories by bilingual tags, name and description; sort by selected-week heat, stars, update time or name. Repository tags describe coverage, not every individual skill.
