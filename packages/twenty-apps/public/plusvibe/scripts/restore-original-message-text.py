import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
import time
from datetime import datetime


def read_json(path):
    return json.loads(path.read_text())


def load_operator(root):
    specification = importlib.util.spec_from_file_location('private_operator', root / 'recovery-operator.py')
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


def read_messages(operator, identities):
    result = {}
    for start in range(0, len(identities), 100):
        page = operator.query(
            'query($ids:[UUID!]!){messages(first:100,filter:{id:{in:$ids},source:{eq:PLUSVIBE}}){totalCount edges{node{id subject text receivedAt messageThreadId}}}}',
            {'ids': identities[start:start + 100]}, '/graphql',
        )['messages']
        result.update({edge['node']['id']: edge['node'] for edge in page['edges']})
    return result


def assert_legacy_idle(operator, root):
    run_id = read_json(root / 'recovery/resumed-history.json')['runId']
    script = '''const {Queue}=require('bullmq');const Redis=require('ioredis');
(async()=>{const connection=new Redis(process.env.REDIS_QUEUE_URL||process.env.REDIS_URL,{maxRetriesPerRequest:null});
const queue=new Queue('logic-function-queue',{connection,prefix:process.env.REDIS_QUEUE_PREFIX||'bull'});
const active=(await queue.getJobs(['active'],0,199)).filter(job=>job.data?.payload?.runId===RUN_ID&&job.data?.payload?.workspaceId===SOURCE_WORKSPACE);
console.log(JSON.stringify({active:active.length}));await queue.close();await connection.quit()})().catch(error=>{console.error(error.message);process.exit(1)});'''
    script = script.replace('RUN_ID', json.dumps(run_id)).replace('SOURCE_WORKSPACE', json.dumps(operator.WORKSPACE))
    result = subprocess.run([
        'ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
        '-o', 'ControlPath=/tmp/twenty-plusvibe-maintenance.sock', 'claudy',
        'docker exec -i fundlevel-twenty-trial-worker-1 node',
    ], input=script, text=True, capture_output=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError('Could not verify old replay executions are idle')
    if json.loads(result.stdout)['active'] != 0:
        raise RuntimeError('Old replay executions are still active; restoration has not started')


def timestamp(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')) if value else None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--private-root', type=Path, default=Path('/tmp/twenty-plusvibe-sync-fix'))
    parser.add_argument('--apply', action='store_true')
    arguments = parser.parse_args()
    root = arguments.private_root
    operator = load_operator(root)
    before = read_json(root / 'recovery/messages-before.json')
    plan = read_json(root / 'recovery/message-repair-plan.json')
    if len(before) != plan['summary']['nativeMessages'] or not before:
        raise RuntimeError('Original snapshot count guard failed')
    identities = [row['id'] for row in before]
    if len(set(identities)) != len(before):
        raise RuntimeError('Original identity uniqueness guard failed')
    current = read_messages(operator, identities)
    differences = []
    for old in before:
        record = current.get(old['id'])
        if not record or any(old.get(field) != record.get(field) for field in ['subject', 'messageThreadId']) or timestamp(old.get('receivedAt')) != timestamp(record.get('receivedAt')):
            raise RuntimeError('Original subject, timestamp, thread or existence guard failed')
        if old.get('text') != record.get('text'):
            differences.append({'id': old['id'], 'originalText': old['text'], 'currentText': record['text']})
    script = '''import fs from 'node:fs';import{pathToFileURL}from'node:url';
const{extractEmailReply}=await import(pathToFileURL(process.argv[1]).href);
const rows=JSON.parse(fs.readFileSync(0,'utf8'));
console.log(JSON.stringify({verified:rows.filter(row=>extractEmailReply(row.originalText).slice(0,262144)===row.currentText).length}));'''
    checked = subprocess.run(['node', '--input-type=module', '-e', script, str(root / 'src/logic-functions/utils/email-content.ts')], input=json.dumps(differences), text=True, capture_output=True, cwd=root, timeout=30)
    if checked.returncode or json.loads(checked.stdout)['verified'] != len(differences):
        raise RuntimeError('Some changed text does not match the proven reply-extraction mutation; no restoration started')
    operator.save(root / 'recovery/original-text-restoration-current.json', list(current.values()))
    operator.save(root / 'recovery/original-text-restoration-plan.json', differences)
    print(json.dumps({'originalMessagesChecked': len(before), 'provenExtractionChanges': len(differences), 'apply': arguments.apply}), flush=True)
    if not arguments.apply:
        return
    deployment = read_json(root / 'deploy-durable-sync.json')
    if not deployment.get('ok'):
        raise RuntimeError('Successful preservation-guard deployment is required')
    assert_legacy_idle(operator, root)
    restored = 0
    for row in differences:
        result = operator.query(
            'mutation($data:MessageUpdateInput!,$filter:MessageFilterInput!){updateMessages(data:$data,filter:$filter){id}}',
            {'data': {'text': row['originalText']}, 'filter': {'id': {'eq': row['id']}, 'source': {'eq': 'PLUSVIBE'}, 'text': {'eq': row['currentText']}}},
            '/graphql',
        )
        if len(result.get('updateMessages', [])) != 1:
            raise RuntimeError('A text compare-and-set guard failed; rerun dry-run before resuming')
        restored += 1
        operator.save(root / 'recovery/original-text-restoration-progress.json', {'restored': restored, 'planned': len(differences)})
        time.sleep(1)
    after = read_messages(operator, identities)
    if any(after.get(row['id'], {}).get('text') != row.get('text') for row in before):
        raise RuntimeError('Original text readback failed')
    summary = {'originalMessagesChecked': len(before), 'restored': restored, 'originalTextMismatches': 0, 'complete': True}
    operator.save(root / 'recovery/original-text-restoration-result.json', summary)
    print(json.dumps(summary), flush=True)


if __name__ == '__main__':
    main()
