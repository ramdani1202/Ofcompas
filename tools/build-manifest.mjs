// Membuat www/files.json: daftar semua file + hash-nya.
// Dipakai aplikasi untuk tahu file mana yang berubah di GitHub.
// Di GitHub Actions (CI=true) juga menyuntikkan nomor build ke www/sw.js.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = 'www';
const SKIP = new Set(['files.json', 'sw.js', 'config.js']);
const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const files = {};
for (const p of walk(ROOT).sort()) {
  const rel = relative(ROOT, p).split(sep).join('/');
  if (SKIP.has(rel)) continue;
  files[rel] = createHash('sha1').update(readFileSync(p)).digest('hex').slice(0, 12);
}
const build = createHash('sha1').update(JSON.stringify(files)).digest('hex').slice(0, 10);
writeFileSync(join(ROOT, 'files.json'), JSON.stringify({ build, files }));
console.log(`files.json: ${Object.keys(files).length} file, build ${build}`);

if (process.env.CI) {
  const f = join(ROOT, 'sw.js');
  const sw = readFileSync(f, 'utf8').replace(/const BUILD = '[^']*'/, `const BUILD = '${build}'`);
  writeFileSync(f, sw);
  console.log('sw.js diberi nomor build', build);
}
