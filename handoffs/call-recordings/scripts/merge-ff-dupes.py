import json, os, re, subprocess, sys

SCRATCH = os.path.dirname(os.path.abspath(__file__))
DRY_RUN = '--apply' not in sys.argv
FILL_FIELDS = ['calendarEventId', 'startedAt', 'endedAt']


def graphql(query, variables=None):
    command = ['npx', '-y', 'twenty@2.59.0', '--no-input', '--json', 'api', 'graphql', '--query', query]
    if variables is not None:
        command += ['--variables', json.dumps(variables)]
    output = subprocess.run(command, capture_output=True, text=True).stdout
    data = json.loads(output)
    if data.get('errors'):
        raise RuntimeError(data['errors'])
    return data.get('data', data)


def is_empty(value):
    return value is None or value == '' or value == [] or value == {}


pairs = []
for line in open(os.path.join(SCRATCH, 'ff-pairs.txt')):
    ids = re.findall(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', line)
    if len(ids) == 2:
        pairs.append(ids)

fields = ' '.join(['id', 'title', 'externalRecordingId', 'summary { markdown blocknote }'] + FILL_FIELDS)
for app_id, hermes_id in pairs:
    app = graphql(f'query($id: UUID!) {{ callRecording(filter: {{ id: {{ eq: $id }} }}) {{ {fields} }} }}', {'id': app_id})['callRecording']
    hermes = graphql(f'query($id: UUID!) {{ callRecording(filter: {{ id: {{ eq: $id }} }}) {{ {fields} }} }}', {'id': hermes_id})['callRecording']
    patch = {field: hermes[field] for field in FILL_FIELDS if is_empty(app.get(field)) and not is_empty(hermes.get(field))}
    if is_empty((app.get('summary') or {}).get('markdown')) and not is_empty((hermes.get('summary') or {}).get('markdown')):
        patch['summary'] = hermes['summary']
    if app['title'].startswith('Conference Link:') and not hermes['title'].startswith('Conference Link:'):
        patch['title'] = hermes['title']
    print(f"{app['title'][:50]:50} fill={sorted(patch)}")
    if DRY_RUN:
        continue
    if patch:
        graphql('mutation($id: UUID!, $data: CallRecordingUpdateInput!) { updateCallRecording(id: $id, data: $data) { id } }', {'id': app_id, 'data': patch})
    graphql('mutation($id: UUID!) { deleteCallRecording(id: $id) { id } }', {'id': hermes_id})

print('dry run' if DRY_RUN else f'merged {len(pairs)} pairs')
