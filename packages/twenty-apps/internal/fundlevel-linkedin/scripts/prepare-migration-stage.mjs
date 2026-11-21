import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { output: { type: 'string' } } });
if (!values.output)
  throw new Error('Pass --output <new directory> for the migration-stage app.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(values.output);
if (output === root || output.startsWith(`${root}${sep}`))
  throw new Error(
    'Prepare the migration stage outside the app source directory.',
  );
if (existsSync(output))
  throw new Error(
    'Use a new output directory to avoid overwriting another app.',
  );
mkdirSync(output, { recursive: true });
for (const name of [
  'src',
  'public',
  'package.json',
  'yarn.lock',
  'tsconfig.json',
  'tsconfig.spec.json',
]) {
  cpSync(join(root, name), join(output, name), { recursive: true });
}
symlinkSync(join(root, 'node_modules'), join(output, 'node_modules'), 'dir');
const templates = join(root, 'migration');
for (const file of readdirSync(templates, { recursive: true })) {
  if (!file.endsWith('.template')) continue;
  const target = join(output, 'src', file.slice(0, -'.template'.length));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(join(templates, file)));
}
const role = join(output, 'src/roles/default-function.role.ts');
const source = readFileSync(role, 'utf8');
if (!source.includes('        OBJECT.CONNECTION,'))
  throw new Error(
    'Review the function role before preparing migration access.',
  );
writeFileSync(
  role,
  source.replace(
    '        OBJECT.CONNECTION,',
    '        OBJECT.CONNECTION,\n        OBJECT.MESSAGE,\n        OBJECT.CHAT,',
  ),
);
console.log(
  `Migration-stage app prepared at ${output}. Apply it with --no-prune, migrate and reconcile before applying the final app with --prune.`,
);
