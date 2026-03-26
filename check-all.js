import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const roots = [
  path.join(__dirname, 'server.js'),
  path.join(__dirname, 'scripts'),
];

function collectJavaScriptFiles(targetPath) {
  const stats = statSync(targetPath);

  if (stats.isFile()) {
    return targetPath.endsWith('.js') ? [targetPath] : [];
  }

  return readdirSync(targetPath, { withFileTypes: true })
    .flatMap((entry) => collectJavaScriptFiles(path.join(targetPath, entry.name)));
}

const files = roots.flatMap(collectJavaScriptFiles);

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Checked ${files.length} JavaScript files successfully.`);
