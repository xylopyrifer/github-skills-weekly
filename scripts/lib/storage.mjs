import { mkdir, readFile, writeFile, rename, readdir } from 'node:fs/promises';
import path from 'node:path';
export async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT' && fallback !== undefined) return fallback; throw e; }
}
export async function writeJson(file, data) {
  const text = JSON.stringify(data, null, 2) + '\n';
  try { if (await readFile(file, 'utf8') === text) return false; } catch(e) { if(e.code !== 'ENOENT') throw e; }
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file + '.tmp', text);
  await rename(file + '.tmp', file);
  return true;
}
export async function readWeeks(root) {
  const folder = path.join(root, 'data/weeks');
  let files;
  try { files = await readdir(folder); } catch(e) { if(e.code === 'ENOENT') return []; throw e; }
  return Promise.all(files.filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().map(f => readJson(path.join(folder, f))));
}
