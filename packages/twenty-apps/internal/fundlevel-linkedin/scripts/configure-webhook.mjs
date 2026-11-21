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
    'Pass --container <server> --workspace-id <workspace UUID> [--apply].',
  );
const script = readFileSync(
  new URL('./lib/configure-webhook.cjs', import.meta.url),
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
