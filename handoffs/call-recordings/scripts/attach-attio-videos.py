import json, os, re, shlex, subprocess, sys, urllib.parse

SCRATCH = os.path.dirname(os.path.abspath(__file__))
VIDEO_FIELD_METADATA_ID = '3afc7720-3770-4565-9ca5-05c224f13348'
LOCAL_SERVER_ORIGIN = 'http://127.0.0.1:3350'
LOG_PATH = os.path.join(SCRATCH, 'attach-attio-videos.log.jsonl')


def twenty(query, variables=None, metadata=False):
    command = ['npx', '-y', 'twenty@2.59.0', '--no-input', '--json', 'api', 'graphql', '--query', query]
    if metadata:
        command.append('--metadata')
    if variables is not None:
        command += ['--variables', json.dumps(variables)]
    result = subprocess.run(command, capture_output=True, text=True)
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise RuntimeError((result.stdout + result.stderr)[-800:])
    if data.get('errors') or data.get('ok') is False:
        raise RuntimeError(json.dumps(data.get('errors') or data)[:800])
    return data.get('data', data)


def remote(command, timeout=3600):
    return subprocess.run(['ssh', 'claudy', command], capture_output=True, text=True, timeout=timeout)


def content_length(video_url):
    result = remote(f'curl -sfIL {shlex.quote(video_url)} | grep -i "^content-length" | tail -1')
    match = re.search(r'(\d+)', result.stdout)
    if not match:
        raise RuntimeError(f'no content length: {result.stdout} {result.stderr}')
    return int(match.group(1))


def attach(call_recording_id, recording):
    video_url = recording['video_url']
    size = content_length(video_url)
    filename = f"attio-{recording['call_recording_id']}.mp4"
    target = twenty(
        'mutation($filename: String!, $size: Float!, $fieldMetadataId: String!) { createFileUpload(filename: $filename, size: $size, fileFolder: FilesField, fieldMetadataId: $fieldMetadataId) { fileId uploadUrl contentType } }',
        {'filename': filename, 'size': size, 'fieldMetadataId': VIDEO_FIELD_METADATA_ID},
        metadata=True,
    )['createFileUpload']
    parsed = urllib.parse.urlparse(target['uploadUrl'])
    local_upload_url = LOCAL_SERVER_ORIGIN + parsed.path + ('?' + parsed.query if parsed.query else '')
    # Streams Attio to the server without touching disk; -T - sends chunked PUT from stdin
    upload = remote(
        f'set -o pipefail; curl -sfL {shlex.quote(video_url)} | curl -sf -T - -H {shlex.quote("Content-Type: " + target["contentType"])} -w "%{{http_code}}" {shlex.quote(local_upload_url)}'
    )
    if upload.returncode != 0:
        raise RuntimeError(f'upload failed ({upload.returncode}): {upload.stdout} {upload.stderr}')
    twenty('mutation($fileId: String!) { completeFileUpload(fileId: $fileId) { id } }', {'fileId': target['fileId']}, metadata=True)
    twenty(
        'mutation($id: UUID!, $data: CallRecordingUpdateInput!) { updateCallRecording(id: $id, data: $data) { id } }',
        {'id': call_recording_id, 'data': {'video': [{'fileId': target['fileId'], 'label': filename}]}},
    )
    return {'fileId': target['fileId'], 'size': size}


if __name__ == '__main__':
    recordings = {row['call_recording_id']: row for row in json.load(open(os.path.join(SCRATCH, 'attio-calls.json')))}
    jobs = json.load(open(os.path.join(SCRATCH, 'attio-video-jobs.json')))
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else len(jobs)
    done = set()
    if os.path.exists(LOG_PATH):
        done = {json.loads(line)['callRecordingId'] for line in open(LOG_PATH) if json.loads(line).get('ok')}
    for job in [job for job in jobs if job['callRecordingId'] not in done][:limit]:
        recording = recordings[job['attioCallRecordingId']]
        try:
            result = attach(job['callRecordingId'], recording)
            entry = {'callRecordingId': job['callRecordingId'], 'ok': True, **result}
        except Exception as error:
            entry = {'callRecordingId': job['callRecordingId'], 'ok': False, 'error': str(error)[:600]}
        with open(LOG_PATH, 'a') as log:
            log.write(json.dumps(entry) + '\n')
        print(json.dumps(entry), flush=True)
