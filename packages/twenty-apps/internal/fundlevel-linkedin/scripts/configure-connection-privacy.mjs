import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    container: { type: 'string' },
    'workspace-id': { type: 'string' },
    apply: { type: 'boolean', default: false },
  },
});
if (!values.container || !values['workspace-id'])
  throw new Error(
    'Pass --container <Twenty server container> --workspace-id <workspace UUID> [--apply]. This administrator command uses native private-record sharing; it does not edit built-in roles.',
  );
const script = readFileSync(
  new URL('./lib/configure-private-records.cjs', import.meta.url),
  'utf8',
);
const result = spawnSync(
  'docker',
  [
    'exec',
    '-i',
    values.container,
    'node',
    '-e',
    script,
    '--',
    values['workspace-id'],
    ...(values.apply ? ['--apply'] : []),
  ],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
