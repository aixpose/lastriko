import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(join(root, 'dist/theme'), { recursive: true });
const srcCss = join(root, 'src/theme/lastriko.css');
await copyFile(srcCss, join(root, 'dist/theme/lastriko.css'));
await copyFile(srcCss, join(root, 'dist/style.css'));
