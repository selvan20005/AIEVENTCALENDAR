#!/usr/bin/env node
// Bump the version everywhere it lives and add a CHANGELOG entry.
// Usage: npm run release -- <patch|minor|major> "Summary line" ["more notes" ...]
import { readFile, writeFile } from 'node:fs/promises';

const [kind = 'patch', ...notes] = process.argv.slice(2);
const cur = (await readFile('VERSION', 'utf8')).trim();
let [M, m, p] = cur.split('.').map(Number);
if (kind === 'major') { M++; m = 0; p = 0; } else if (kind === 'minor') { m++; p = 0; } else p++;
const next = `${M}.${m}.${p}`;

const edit = async (file, fn) => writeFile(file, fn(await readFile(file, 'utf8')));
await writeFile('VERSION', next + '\n');
await edit('js/version.js', s => s.replace(/VERSION = '[\d.]+'/, `VERSION = '${next}'`));
await edit('sw.js', s => s.replace(/aiec-v[\d.]+/, `aiec-v${next}`));
await edit('package.json', s => s.replace(/"version": "[\d.]+"/, `"version": "${next}"`));
await edit('CHANGELOG.md', s => s.replace('\n## v', `\n## v${next} — ${new Date().toISOString().slice(0, 10)}\n${(notes.length ? notes : ['Maintenance']).map(n => `- ${n}`).join('\n')}\n\n## v`));
// keep the "Version: x.y.z" header comments in pages / modules in sync
const { readdir } = await import('node:fs/promises');
for (const f of [...(await readdir('.')).filter(n => n.endsWith('.html')), 'js/version.js', 'sw.js']) {
  await edit(f, s => s.replace(/Version: [\d.]+/, `Version: ${next}`));
}
console.log(`${cur} → ${next}`);
