import { fileURLToPath } from 'node:url';
import { githubClient } from './lib/github.mjs';
import { updateData } from './lib/pipeline.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
try {
  await updateData({ root, get: githubClient(), discover: !process.argv.includes('--no-discovery') });
} catch(e) { console.error('Update failed:', e.message); process.exitCode = 1; }
