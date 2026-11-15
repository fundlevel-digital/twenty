// Copies the Worker's secrets from Infisical (prod, /apps/unipile-archive) to Cloudflare. Values go
// from one child process to the other through memory and are never printed.
import { execFileSync } from 'node:child_process';

const INFISICAL_PROJECT_ID = '281e238a-9499-4165-9b87-5a03065ab578';
const SECRET_NAMES = ['UNIPILE_WEBHOOK_SECRET', 'INGEST_TOKEN'];

const exported = JSON.parse(
  execFileSync(
    'infisical',
    ['export', '--projectId', INFISICAL_PROJECT_ID, '--env', 'prod', '--path', '/apps/unipile-archive', '--format', 'json', '--silent'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  ),
);

const secrets = Object.fromEntries(
  exported.filter((secret) => SECRET_NAMES.includes(secret.key)).map((secret) => [secret.key, secret.value]),
);
const missing = SECRET_NAMES.filter((name) => !secrets[name]);
if (missing.length > 0) throw new Error(`Missing in Infisical: ${missing.join(', ')}`);

execFileSync('npx', ['wrangler', 'secret', 'bulk'], { input: JSON.stringify(secrets), stdio: ['pipe', 'inherit', 'inherit'] });
