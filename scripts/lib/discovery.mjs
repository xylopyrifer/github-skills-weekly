const context = /agent[ -]?skills?|claude[ -]?code|codex|cursor|coding[ -]?agent/i;
export function relevance({ description = '', topics = [], readme = '', paths = [] }) {
  const evidence = [];
  let score = 0;
  const skillFiles = paths.filter(p => /(^|\/)SKILL\.md$/i.test(p));
  if (skillFiles.length) { score += 50; evidence.push('skill-file'); }
  if (topics.some(t => /^(agent-skills|claude-code-skills|codex-skills|cursor-skills)$/.test(t))) { score += 20; evidence.push('skill-topic'); }
  if (context.test(description) && /skill/i.test(description)) { score += 15; evidence.push('description'); }
  if (context.test(readme) && /skill/i.test(readme)) { score += 15; evidence.push('readme'); }
  if (/SKILL\.md/.test(readme) && /install|\.claude\/skills|\.codex\/skills|skills add|installation/i.test(readme)) { score += 10; evidence.push('install-guide'); }
  // A name or README mention alone is not sufficient.
  const structural = skillFiles.length > 0 || evidence.includes('skill-topic');
  return { score: Math.min(100, score), evidence, skill_files: skillFiles.slice(0,8), structural };
}
