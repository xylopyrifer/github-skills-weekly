# GitHub Skills Weekly

[中文](README.md) · **English** · [Visit the website](https://xylopyrifer.github.io/github-skills-weekly/)

Discover trending AI Agent Skills on GitHub, understand what they do, and find tools by capability.

## Features

- Chinese and English interfaces, five recent weekly rankings and cumulative leaders.
- Practical capability descriptions, stars, forks, weekly growth and rank changes.
- Search names, descriptions and tags; sort by heat, stars, update time or name.
- Sign in on GitHub to choose existing tags or submit custom tags through “Other”.

## Updates and tags

Data collection starts daily at **00:00 UTC / 08:00 Beijing time**. Monday runs settle the previous week. GitHub scheduling may be delayed; actual collection times are displayed.

Custom tags become public after submission and successful publication, before review. Weekly review retains tags that match a project's capabilities, or whose previous-week distinct supporters **exceed one third of estimated repository visitors, with a minimum of 5 accounts**. Unrelated tags are removed; unavailable evidence defers a decision. Each account counts once, and a new submission replaces its previous selections. Submit up to five custom tags, 2–32 characters each. Custom labels retain their original text in both interface languages.

System classifications, community submissions and review decisions are stored separately and combined for display. Accepted tags persist on their project even after withdrawal of the original submission; rejection records prevent reappearance during synchronization. Fixed capability tags continue to update automatically. Semantic weekly review runs through this project's Codex automation; forks must configure their own review task.

Official weekly growth compares consecutive Monday snapshots. Bootstrap backfill is labeled separately and excluded from official cumulative scores. Official weeks gradually replace the homepage backfill. Current metadata is overwritten daily, weekly aggregates are retained, and raw boundary snapshots are kept for about eight weeks.

## Run locally

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Use `npm test` to validate changes and `npm run build` to generate `dist/` for GitHub Pages or a static web server.

Deployment, scoring and maintenance details: [English developer guide](docs/DEVELOPMENT.en.md) · [中文开发文档](docs/DEVELOPMENT.zh.md) · [Tag review](docs/TAG-REVIEW.md). Automated publishing remains in `.github/workflows/`; daily use requires no manual deployment.

## License

© 2026 **若蘅 Xylopyrifer** · [MIT License](LICENSE). Use, modify, distribute and commercialize while retaining copyright and license notices. Listed third-party projects keep their own licenses.

Traffic is approximated by summing this repository’s daily unique visitors over the previous complete UTC week. Repeat visitors may count across days; this is not website or per-skill traffic. Support uses distinct accounts with active submissions updated in the same week. If traffic is unavailable, review uses content only. No additional server is required.
