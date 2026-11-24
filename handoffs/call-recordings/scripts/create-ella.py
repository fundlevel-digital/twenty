import json, os, sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from attach_attio_videos import attach, twenty  # noqa: E402

SCRATCH = os.path.dirname(os.path.abspath(__file__))
recording = json.load(open(os.path.join(SCRATCH, 'ella.json')))['data']
segments = recording['transcript']['segments']

transcript = []
for segment in segments:
    word = {
        'text': segment['speech'],
        'start_timestamp': {'relative': segment['start_time']},
        'end_timestamp': {'relative': segment['end_time']},
    }
    speaker = segment['speaker']['name']
    if transcript and transcript[-1]['participant']['name'] == speaker:
        transcript[-1]['words'].append(word)
    else:
        transcript.append({'participant': {'name': speaker}, 'words': [word]})

started_at = datetime.fromisoformat('2026-10-20T19:00:00+00:00')
ended_at = started_at + timedelta(seconds=segments[-1]['end_time'])
created = twenty(
    'mutation($data: CallRecordingCreateInput!) { createCallRecording(data: $data) { id } }',
    {'data': {
        'title': 'Fundlevel Media Intro - Influencer Marketing between Kareem Yakubu and Ella Sway',
        'startedAt': started_at.isoformat(),
        'endedAt': ended_at.isoformat(),
        'status': 'COMPLETED',
        'externalRecordingId': f"attio:{recording['id']['call_recording_id']}",
        'calendarEventId': 'b0be8d72-5e64-478f-85fa-46ef44f51a3c',
        'transcript': transcript,
    }},
)['createCallRecording']
print('created', created['id'], len(transcript), 'turns')
print('video', attach(created['id'], {'video_url': recording['video_url'], 'call_recording_id': recording['id']['call_recording_id']}))
