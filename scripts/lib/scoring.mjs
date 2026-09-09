export const WEIGHTS = Object.freeze({ stars: 0.60, forks: 0.15, activity: 0.15, size: 0.10 });
const positive = value => Math.max(0, Number.isFinite(value) ? value : 0);
export const logScore = (value, anchor) => Math.min(100, 100 * Math.log1p(positive(value)) / Math.log1p(Math.max(1, anchor)));
export function percentile(values, p = 0.9) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.ceil(p * sorted.length) - 1];
}
export function activityScore(commits, activeDays) {
  return 0.7 * logScore(commits, 20) + 0.3 * Math.min(7, positive(activeDays)) / 7 * 100;
}
export function weeklyRanking(rows, previous = []) {
  const eligible = rows.filter(r => Number.isFinite(r.stars_delta) && Number.isFinite(r.forks_delta) && Number.isFinite(r.activity));
  const effectiveForks = r => Math.min(positive(r.forks_delta), Math.max(20, positive(r.stars_delta) * 0.5));
  const anchors = { stars: Math.max(100, percentile(eligible.map(r => positive(r.stars_delta)))), forks: Math.max(20, percentile(eligible.map(effectiveForks))) };
  const prev = new Map(previous.map(r => [r.full_name.toLowerCase(), r.rank]));
  const ranked = eligible.map(r => {
    const components = { stars: logScore(r.stars_delta, anchors.stars), forks: logScore(effectiveForks(r), anchors.forks), activity: Math.max(0, Math.min(100, r.activity)), size: logScore(r.stars, 100000) };
    const score = Object.keys(WEIGHTS).reduce((sum, k) => sum + WEIGHTS[k] * components[k], 0);
    return { ...r, components, heat_score: Math.round(score * 10) / 10 };
  }).sort((a,b) => b.heat_score - a.heat_score || b.stars_delta - a.stars_delta || a.full_name.localeCompare(b.full_name));
  return { anchors, rows: ranked.map((r, i) => ({ ...r, rank: i + 1, rank_change: prev.has(r.full_name.toLowerCase()) ? prev.get(r.full_name.toLowerCase()) - i - 1 : null })) };
}
export function aggregateAllTime(weeks) {
  const stats = new Map();
  const ordered = weeks.slice().sort((a,b) => a.start.localeCompare(b.start));
  for (const week of ordered) {
    for (const r of week.rows) {
      const key = r.full_name.toLowerCase();
      const s = stats.get(key) || { full_name: r.full_name, total_heat: 0, weeks_ranked: 0, best_rank: null, current_streak: 0, weekly_scores: [] };
      const consecutive = s.last_end === week.start;
      s.current_streak = r.rank <= 10 ? (consecutive ? s.current_streak : 0) + 1 : 0;
      if (r.rank <= 10) s.weeks_ranked++;
      s.best_rank = s.best_rank === null ? r.rank : Math.min(s.best_rank, r.rank);
      // Weekly heat already incorporates total size, growth, and activity.
      s.total_heat += r.heat_score * (1 + (r.rank <= 10 ? (11-r.rank) / 50 : 0)) + Math.min(s.current_streak, 12) * 0.5;
      s.weekly_scores.push({ week: week.start, heat_score: r.heat_score, rank: r.rank });
      s.last_end = week.end;
      stats.set(key, s);
    }
  }
  const latestEnd = ordered.at(-1)?.end;
  return Array.from(stats.values()).map(s => ({ ...s, current_streak: s.last_end === latestEnd ? s.current_streak : 0, total_heat: Math.round(s.total_heat * 10) / 10 })).sort((a,b) => b.total_heat - a.total_heat || a.full_name.localeCompare(b.full_name)).map((s,i) => ({ ...s, current_rank: i+1 }));
}
