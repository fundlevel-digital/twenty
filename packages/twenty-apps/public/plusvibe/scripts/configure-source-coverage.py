import argparse
import json
import os
import urllib.request


def configure(remote_name, dashboard_id):
    remote = json.load(open(os.path.expanduser('~/.twenty/config.json')))['remotes'][remote_name]

    def query(document, variables=None, path='/metadata'):
        request = urllib.request.Request(remote['apiUrl'] + path,
            data=json.dumps({'query': document, 'variables': variables or {}}).encode(),
            headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + remote['twentyCLIAccessToken']})
        with urllib.request.urlopen(request, timeout=55) as response:
            result = json.load(response)
        if result.get('errors'):
            raise RuntimeError(json.dumps(result['errors']))
        return result['data']

    objects = query('{objects(paging:{first:200}){edges{node{id nameSingular fields(paging:{first:250}){edges{node{id name}}}}}}}')['objects']['edges']
    objects = {row['node']['nameSingular']: row['node'] for row in objects}
    fields = {name: {row['node']['name']: row['node']['id'] for row in obj['fields']['edges']} for name, obj in objects.items()}

    def create(object_name, name, label, field_type, computation):
        if name not in fields[object_name]:
            field = {'objectMetadataId': objects[object_name]['id'], 'name': name,
                'label': label, 'type': field_type, 'isNullable': True,
                'isUIReadOnly': True, 'icon': 'IconMail', 'computation': computation}
            result = query('mutation($input:CreateOneFieldMetadataInput!){createOneField(input:$input){id}}', {'input': {'field': field}})
            fields[object_name][name] = result['createOneField']['id']
        return fields[object_name][name]

    source_count = create('person', 'outreachSourceSendLeadCount', 'Leads With Source Sends', 'NUMBER', {
        'kind': 'ROLLUP', 'relationFieldName': 'plusvibeLeads', 'operation': 'COUNT', 'filter': 'hasSentEvidence == true'})
    confirmed = create('person', 'outreachConfirmed', 'Outreach Confirmed', 'BOOLEAN', {
        'kind': 'FORMULA', 'expression': 'outreachSourceSendLeadCount > 0 or outreachPlusvibeSendCount > 0 or outreachPlusvibeReplyCount > 0'})
    confirmed_pocs = create('influencer', 'outreachPocsWithConfirmedOutreach', 'POCs With Confirmed Outreach', 'NUMBER', {
        'kind': 'ROLLUP', 'relationFieldName': 'contactLinks', 'operation': 'COUNT', 'filter': 'person.outreachConfirmed == true'})
    for object_name, expression in [
        ('person', "if(outreachPlusvibeReplyCount > 0, 'Reply Recorded', if(outreachPlusvibeSendCount > 0, 'Emails Recorded', if(outreachSourceSendLeadCount > 0, 'Source Outreach Confirmed; Email History Incomplete', if(outreachPlusvibeLeadCount > 0, 'Lead Without Source Send Evidence', 'No Synced Lead'))))"),
        ('influencer', "if(outreachPocCount == 0, 'No POC', if(outreachPocsWithReplies > 0, 'POC Reply Recorded', if(outreachPocsWithSends > 0, 'POC Emails Recorded', if(outreachPocsWithConfirmedOutreach > 0, 'Source Outreach Confirmed; Email History Incomplete', 'Outreach Not Confirmed In Synced Data'))))"),
    ]:
        query('mutation($input:UpdateOneFieldMetadataInput!){updateOneField(input:$input){id}}', {'input': {
            'id': fields[object_name]['outreachPlusvibeCoverage'], 'update': {'computation': {'kind': 'FORMULA', 'expression': expression}}}})

    for object_name in ['person', 'influencer']:
        views = query('query($object:String!){getViews(objectMetadataId:$object){id name viewFields{id fieldMetadataId relationTargetFieldMetadataId} viewFilters{id fieldMetadataId}}}', {'object': objects[object_name]['id']})['getViews']
        for view in views:
            if not view['name'].startswith('Outreach:'):
                continue
            additions = []
            targets = [source_count, confirmed] if object_name == 'person' else [confirmed_pocs]
            for position, field_id in enumerate(targets):
                if not any(row['fieldMetadataId'] == field_id and not row['relationTargetFieldMetadataId'] for row in view['viewFields']):
                    additions.append({'viewId': view['id'], 'fieldMetadataId': field_id, 'isVisible': True, 'position': 2.1 + position / 10, 'size': 180})
            if object_name == 'person':
                for position, name in enumerate(['sentStep', 'lastSentAt', 'workspaceLastSentAt', 'replyCount', 'isSequenceCompleted']):
                    if not any(row['relationTargetFieldMetadataId'] == fields['plusvibeLead'][name] for row in view['viewFields']):
                        additions.append({'viewId': view['id'], 'fieldMetadataId': fields['person']['plusvibeLeads'],
                            'relationTargetFieldMetadataId': fields['plusvibeLead'][name], 'isCanonical': False,
                            'isVisible': True, 'position': 11 + position, 'size': 180})
            if additions:
                query('mutation($inputs:[CreateViewFieldInput!]!){createManyViewFields(inputs:$inputs){id}}', {'inputs': additions})
            if object_name == 'influencer' and view['name'] == 'Outreach: No Recorded Sends':
                for row in view['viewFilters']:
                    if row['fieldMetadataId'] == fields['influencer']['outreachPocsWithSends']:
                        query('mutation($input:UpdateViewFilterInput!){updateViewFilter(input:$input){id}}', {'input': {'id': row['id'], 'update': {'fieldMetadataId': confirmed_pocs}}})
                query('mutation($id:String!,$input:UpdateViewInput!){updateView(id:$id,input:$input){id}}', {'id': view['id'], 'input': {'name': 'Outreach: Not Yet Confirmed'}})

    dashboard = query('query($id:UUID!){dashboard(filter:{id:{eq:$id}}){pageLayoutId}}', {'id': dashboard_id}, '/graphql')['dashboard']
    layout = query('query($id:String!){getPageLayout(id:$id){tabs{widgets{id title configuration{... on AggregateChartConfiguration{configurationType aggregateFieldMetadataId aggregateOperation label filter}}}}}}', {'id': dashboard['pageLayoutId']})['getPageLayout']
    for tab in layout['tabs']:
        for widget in tab['widgets']:
            updates = {}
            if widget['title'] in ['No Recorded Sends', 'POCs Have Recorded Sends']:
                config = widget['configuration']
                for record_filter in config['filter']['recordFilters']:
                    record_filter['fieldMetadataId'] = confirmed_pocs
                title = 'Outreach Not Yet Confirmed' if widget['title'] == 'No Recorded Sends' else 'Outreach Confirmed'
                config['label'] = title
                updates = {'title': title, 'configuration': config}
            elif widget['title'] == 'No Recorded Sends — Details':
                updates = {'title': 'Outreach Not Yet Confirmed — Details'}
            elif widget['title'] == 'POCs Without Sends':
                updates = {'title': 'POCs Missing Imported Emails'}
            elif widget['title'] == 'How To Read Coverage':
                updates = {'configuration': {'configurationType': 'STANDALONE_RICH_TEXT', 'body': {'markdown':
                    '**Outreach coverage includes PlusVibe source lead send evidence as well as imported messages and replies.** '
                    'Source outreach can be confirmed even when historical email bodies are unavailable. '
                    'Recorded email counts count actual imported recipient messages. Latest Sent Step is a sequence step, not a lifetime send count. '
                    'Outreach Not Yet Confirmed means no evidence in synced data; it is not proof of never being contacted. '
                    'Shared POC activity appears on each related influencer. Ranking is deferred.'}}}
            if updates:
                query('mutation($id:String!,$input:UpdatePageLayoutWidgetInput!){updatePageLayoutWidget(id:$id,input:$input){id}}', {'id': widget['id'], 'input': updates})
    print('Source-backed coverage configured')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--remote', required=True)
    parser.add_argument('--dashboard-id', required=True)
    args = parser.parse_args()
    configure(args.remote, args.dashboard_id)
