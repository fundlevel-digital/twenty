import json, os, sys, time, urllib.parse, urllib.request

SCRATCH = os.path.dirname(os.path.abspath(__file__))
KEY = open(os.path.join(SCRATCH, 'attio-key')).read().strip()


def get(path, params=None):
    url = 'https://api.attio.com/v2' + path + ('?' + urllib.parse.urlencode(params) if params else '')
    for attempt in range(5):
        request = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + KEY})
        try:
            return json.load(urllib.request.urlopen(request, timeout=60))
        except urllib.error.HTTPError as error:
            if error.code == 429:
                time.sleep(2 + attempt * 2)
                continue
            return {'error': error.code, 'body': error.read().decode()[:300]}
    return {'error': 'rate-limited'}


meetings = []
cursor = None
while True:
    params = {'limit': 200}
    if cursor:
        params['cursor'] = cursor
    page = get('/meetings', params)
    if 'error' in page:
        print('meetings error', page)
        break
    meetings.extend(page.get('data', []))
    cursor = (page.get('pagination') or {}).get('next_cursor')
    if not cursor:
        break

print('meetings', len(meetings), file=sys.stderr)
rows = []
for meeting in meetings:
    meeting_id = meeting['id']['meeting_id']
    listing = get(f'/meetings/{meeting_id}/call_recordings', {'limit': 50})
    for recording in listing.get('data', []):
        recording_id = recording['id']['call_recording_id']
        detail = get(f'/meetings/{meeting_id}/call_recordings/{recording_id}').get('data', {})
        rows.append({
            'meeting_id': meeting_id,
            'call_recording_id': recording_id,
            'title': meeting.get('title'),
            'start': (meeting.get('start') or {}).get('datetime') if isinstance(meeting.get('start'), dict) else meeting.get('start'),
            'status': detail.get('status'),
            'has_video': bool(detail.get('video_url')),
            'video_url': detail.get('video_url'),
            'web_url': detail.get('web_url'),
            'has_transcript': bool(((detail.get('transcript') or {}).get('segments'))),
        })

json.dump(rows, open(os.path.join(SCRATCH, 'attio-calls.json'), 'w'), indent=1)
print(json.dumps({
    'recordings': len(rows),
    'with_video': sum(r['has_video'] for r in rows),
    'with_transcript': sum(r['has_transcript'] for r in rows),
    'statuses': {s: sum(1 for r in rows if r['status'] == s) for s in {r['status'] for r in rows}},
}, indent=1))
