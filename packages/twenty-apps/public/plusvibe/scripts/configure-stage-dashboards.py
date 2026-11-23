import argparse
import json
import os
import urllib.request
import uuid


def configure(remote_name, dashboard_id, update_computations=False):
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

    def mutate(name, input_type, payload, selection='id'):
        return query('mutation($input:' + input_type + '!){' + name + '(input:$input){' + selection + '}}', {'input': payload})[name]

    objects = {edge['node']['nameSingular']: edge['node'] for edge in query(
        '{objects(paging:{first:200}){edges{node{id nameSingular fields(paging:{first:250}){edges{node{id name type computation}}}}}}}')['objects']['edges']}
    fields = {name: {edge['node']['name']: edge['node'] for edge in item['fields']['edges']} for name, item in objects.items()}
    created = {'fields': 0, 'views': 0, 'tabs': 0, 'widgets': 0}

    def field(object_name, name, label, field_type, computation):
        existing = fields[object_name].get(name)
        if existing:
            actual = {key: value for key, value in (existing.get('computation') or {}).items() if key != 'bindings'}
            if existing['type'] != field_type:
                raise RuntimeError('Conflicting field: ' + object_name + '.' + name)
            if actual != computation:
                if not update_computations:
                    raise RuntimeError('Conflicting computation: ' + object_name + '.' + name)
                mutate('updateOneField', 'UpdateOneFieldMetadataInput', {'id': existing['id'], 'update': {'computation': computation}})
                print('Updated computation:', object_name + '.' + name, flush=True)
            return existing['id']
        payload = {'objectMetadataId': objects[object_name]['id'], 'name': name, 'label': label,
            'type': field_type, 'icon': 'IconMail', 'isNullable': True, 'isUIReadOnly': True,
            'description': 'Recorded PlusVibe email history only. Missing imports and LinkedIn activity are not inferred.',
            'computation': computation}
        if field_type == 'NUMBER':
            payload['settings'] = {'dataType': 'int', 'decimals': 0}
        result = mutate('createOneField', 'CreateOneFieldMetadataInput', {'field': payload}, 'id name type computation')
        fields[object_name][name] = result
        created['fields'] += 1
        print('Created field:', object_name + '.' + name, flush=True)
        return result['id']

    def rollup(object_name, name, label, relation, operation='COUNT', expression=None, condition=None, field_type='NUMBER', order_by=None):
        computation = {'kind': 'ROLLUP', 'relationFieldName': relation, 'operation': operation}
        for key, value in [('expression', expression), ('filter', condition), ('orderBy', order_by)]:
            if value is not None:
                computation[key] = value
        return field(object_name, name, label, field_type, computation)

    inbound = "role == 'FROM' and message.source == 'PLUSVIBE' and message.isDraft != true"
    outbound = "(role == 'TO' or role == 'CC' or role == 'BCC') and message.source == 'PLUSVIBE' and message.isDraft != true"
    sender = 'message.plusvibeSenderRecord.emails.primaryEmail'
    for name, label, operation in [('stageFirstReplyAt', 'First Recorded Email Reply', 'MIN'), ('stageLastReplyAt', 'Last Recorded Email Reply', 'MAX')]:
        rollup('person', name, label, 'messageParticipants', operation, 'message.receivedAt', inbound, 'DATE_TIME')
    for name, label, expression, condition in [
        ('stageLatestReplyText', 'Latest Recorded Reply', 'message.text', inbound),
        ('stageFirstReplyInbox', 'First Inbox With A Recorded Reply', sender, inbound + ' and message.receivedAt == person.stageFirstReplyAt'),
        ('stageLastReplyInbox', 'Latest Inbox With A Recorded Reply', sender, inbound),
        ('stageLastSenderInbox', 'Latest Recorded Sending Inbox', sender, outbound),
    ]:
        rollup('person', name, label, 'messageParticipants', 'LATEST', expression, condition, 'TEXT', 'message.receivedAt')
    rollup('person', 'stageUnansweredEmailCount', 'Recorded Unanswered Emails', 'messageParticipants', condition=outbound + ' and (isEmpty(person.lastInboundAt) or message.receivedAt > person.lastInboundAt)')
    for stage in ['Cold', 'Ghosted']:
        rollup('person', 'stage' + stage + 'CreatorCount', stage + ' Creators', 'influencerContactLinks', condition="influencer.stage == '" + stage.upper() + "'")
    for name, label, expression, field_type in [
        ('stageReplyingPoc', 'Last Replying POC', "if(isEmpty(person.name.firstName), person.name.lastName, concat(person.name.firstName, ' ', person.name.lastName))", 'TEXT'),
        ('stageReplyingPocUnanswered', 'Unanswered To Last Replying POC', 'person.stageUnansweredEmailCount', 'NUMBER'),
        ('stageLatestReplyText', 'Latest Recorded Reply', 'person.stageLatestReplyText', 'TEXT'),
        ('stageFirstReplyInbox', 'First Reply Inbox Of Last Replying POC', 'person.stageFirstReplyInbox', 'TEXT'),
        ('stageLastReplyInbox', 'Latest Recorded Reply Inbox', 'person.stageLastReplyInbox', 'TEXT'),
    ]:
        rollup('influencer', name, label, 'contactLinks', 'LATEST', expression, 'isDefined(person.lastInboundAt)', field_type, 'person.lastInboundAt')
    rollup('influencer', 'stageUnansweredAllPocs', 'Unanswered Across All POCs', 'contactLinks', 'SUM', 'person.stageUnansweredEmailCount')
    rollup('influencer', 'stageLastReplyAt', 'Last Recorded Email Reply', 'contactLinks', 'MAX', 'person.stageLastReplyAt', field_type='DATE_TIME')
    rollup('influencer', 'stageLastSenderInbox', 'Latest Recorded Sending Inbox', 'contactLinks', 'LATEST', 'person.stageLastSenderInbox', field_type='TEXT', order_by='person.outreachPlusvibeLastSendAt')
    field('messageParticipant', 'stageIsGhostedPocEmail', 'Ghosted POC Email', 'BOOLEAN', {'kind': 'FORMULA', 'expression': "message.source == 'PLUSVIBE' and message.isDraft != true and person.stageGhostedCreatorCount > 0"})
    field('messageParticipant', 'stageIsGhostedPocReply', 'Ghosted POC Reply', 'BOOLEAN', {'kind': 'FORMULA', 'expression': "role == 'FROM' and stageIsGhostedPocEmail == true"})
    field('messageParticipant', 'stageOwnedInbox', 'Recorded Owned Inbox', 'TEXT', {'kind': 'FORMULA', 'expression': sender})

    relation_targets = {'contactLinks': 'influencerContact', 'person': 'person', 'influencerContactLinks': 'influencerContact', 'influencer': 'influencer', 'plusvibeLeads': 'plusvibeLead', 'message': 'message', 'plusvibeSenderRecord': 'plusvibeSender', 'messageThread': 'messageThread'}

    def field_id(object_name, name):
        return fields[object_name][name]['id']

    def view(object_name, name, columns, filters, sort=None):
        existing = query('query($object:String!){getViews(objectMetadataId:$object){id name type}}', {'object': objects[object_name]['id']})['getViews']
        match = next((item for item in existing if item['name'] == name and item['type'] == 'TABLE_WIDGET'), None)
        view_id = match['id'] if match else mutate('createView', 'CreateViewInput', {'name': name, 'objectMetadataId': objects[object_name]['id'], 'type': 'TABLE_WIDGET', 'icon': 'IconMail', 'visibility': 'WORKSPACE'})['id']
        created['views'] += 0 if match else 1
        current = query('query($id:String!){getView(id:$id){viewFields{id fieldMetadataId relationTargetFieldMetadataId relationPathFieldMetadataIds} viewFilters{fieldMetadataId operand value} viewSorts{fieldMetadataId}}}', {'id': view_id})['getView']
        for item in current['viewFields']:
            if 'stageFirstReplyInbox' not in columns and item['fieldMetadataId'] == fields[object_name].get('stageFirstReplyInbox', {}).get('id'):
                mutate('deleteViewField', 'DeleteViewFieldInput', {'id': item['id']})
        additions = []
        for position, column in enumerate(columns):
            parts = column.split('.')
            current_object = object_name
            relations = []
            for relation in parts[:-1]:
                relations.append(field_id(current_object, relation))
                current_object = relation_targets[relation]
            payload = {'viewId': view_id, 'position': position, 'isVisible': True, 'size': 260 if 'Inbox' in column or column.endswith('Text') else 180}
            if relations:
                payload.update({'fieldMetadataId': relations[0], 'isCanonical': False, 'relationPathFieldMetadataIds': relations[1:], 'relationTargetFieldMetadataId': field_id(current_object, parts[-1])})
            else:
                payload['fieldMetadataId'] = field_id(object_name, parts[0])
            if not any(row['fieldMetadataId'] == payload['fieldMetadataId'] and row.get('relationTargetFieldMetadataId') == payload.get('relationTargetFieldMetadataId') and (row.get('relationPathFieldMetadataIds') or []) == payload.get('relationPathFieldMetadataIds', []) for row in current['viewFields']):
                additions.append(payload)
        if additions:
            query('mutation($inputs:[CreateViewFieldInput!]!){createManyViewFields(inputs:$inputs){id}}', {'inputs': additions})
        for filter_name, operand, value in filters:
            if not any(row['fieldMetadataId'] == field_id(object_name, filter_name) and row['operand'] == operand and row['value'] == json.dumps(value) for row in current['viewFilters']):
                mutate('createViewFilter', 'CreateViewFilterInput', {'viewId': view_id, 'fieldMetadataId': field_id(object_name, filter_name), 'operand': operand, 'value': json.dumps(value)})
        if sort and not any(row['fieldMetadataId'] == field_id(object_name, sort[0]) for row in current['viewSorts']):
            mutate('createViewSort', 'CreateViewSortInput', {'viewId': view_id, 'fieldMetadataId': field_id(object_name, sort[0]), 'direction': sort[1]})
        print('Configured view:', name, flush=True)
        return view_id

    dashboard = query('query($id:UUID!){dashboard(filter:{id:{eq:$id}}){id pageLayoutId}}', {'id': dashboard_id}, '/graphql')['dashboard']
    layout_id = dashboard['pageLayoutId']
    layout = query('query($id:String!){getPageLayout(id:$id){tabs{id title position widgets{id title}}}}', {'id': layout_id})['getPageLayout']

    def tab(title):
        target = next((item for item in layout['tabs'] if item['title'] == title), None)
        if target:
            return target
        target = mutate('createPageLayoutTab', 'CreatePageLayoutTabInput', {'title': title, 'pageLayoutId': layout_id, 'position': len(layout['tabs']), 'layoutMode': 'GRID'}, 'id title')
        target['widgets'] = []
        layout['tabs'].append(target)
        created['tabs'] += 1
        return target

    def widget(target, title, kind, configuration, row, height, object_name=None, column=0, width=12):
        existing = next((item for item in target['widgets'] if item['title'] == title), None)
        if existing:
            if kind == 'STANDALONE_RICH_TEXT':
                query('mutation($id:String!,$input:UpdatePageLayoutWidgetInput!){updatePageLayoutWidget(id:$id,input:$input){id}}', {'id': existing['id'], 'input': {'configuration': configuration}})
            return
        payload = {'pageLayoutTabId': target['id'], 'title': title, 'type': kind, 'configuration': configuration,
            'position': {'layoutMode': 'GRID', 'row': row, 'column': column, 'rowSpan': height, 'columnSpan': width}}
        if object_name:
            payload['objectMetadataId'] = objects[object_name]['id']
        result = mutate('createPageLayoutWidget', 'CreatePageLayoutWidgetInput', payload)
        target['widgets'].append({'id': result['id'], 'title': title})
        created['widgets'] += 1

    def table(target, title, object_name, columns, filters, row, sort=None):
        view_id = view(object_name, 'Stage Dashboard: ' + title, columns, filters, sort)
        widget(target, title, 'RECORD_TABLE', {'configurationType': 'RECORD_TABLE', 'viewId': view_id}, row, 13, object_name)

    def metric(target, title, filters, column, width=3):
        record_filters = [{'id': str(uuid.uuid4()), 'fieldMetadataId': field_id('influencer', name), 'operand': operand, 'value': json.dumps(value)} for name, operand, value in filters]
        widget(target, title, 'GRAPH', {'configurationType': 'AGGREGATE_CHART', 'aggregateFieldMetadataId': field_id('influencer', 'id'), 'aggregateOperation': 'COUNT', 'label': title, 'filter': {'recordFilters': record_filters, 'recordFilterGroups': []}}, 3, 3, 'influencer', column, width)

    cold = tab('Cold')
    ghosted = tab('Ghosted')
    cold_filter = [('stage', 'IS', ['COLD'])]
    ghosted_filter = [('stage', 'IS', ['GHOSTED'])]
    widget(cold, 'Cold Outreach Context', 'STANDALONE_RICH_TEXT', {'configurationType': 'STANDALONE_RICH_TEXT', 'body': {'markdown': 'Review creators in **Cold**, their POCs, source lead status, last outreach and email usage. **Outreach not confirmed is not proof of never contacted**: imports are incomplete and LinkedIn outreach is not included. Sequence status is shown from imported leads; active enrollment and completed waterfall rounds are not inferred. Ranking and automatic enrollment remain deferred.'}}, 0, 3)
    for title, extra, column in [('Cold Creators', [], 0), ('Outreach Confirmed', [('outreachPocsWithConfirmedOutreach', 'GREATER_THAN_OR_EQUAL', 1)], 3), ('Outreach Not Confirmed', [('outreachPocsWithConfirmedOutreach', 'IS', 0)], 6), ('Missing POCs', [('outreachPocCount', 'IS', 0)], 9)]:
        metric(cold, title, cold_filter + extra, column)
    cold_columns = ['name', 'stage', 'outreachPlusvibeCoverage', 'outreachPocCount', 'outreachPocsWithConfirmedOutreach', 'lastOutboundAt', 'outreachPlusvibeLastSendAt', 'contactLinks.person.name', 'contactLinks.person.emails']
    table(cold, 'Cold Creator Coverage', 'influencer', cold_columns, cold_filter, 6, ('lastOutboundAt', 'ASC'))
    table(cold, 'Cold Outreach Not Confirmed', 'influencer', cold_columns, cold_filter + [('outreachPocsWithConfirmedOutreach', 'IS', 0)], 19)
    table(cold, 'Cold POCs And Sequence Status', 'person', ['name', 'emails', 'outreachPlusvibeCoverage', 'outreachPlusvibeSendCount', 'outreachPlusvibeLastSendAt', 'plusvibeLeads.emails', 'plusvibeLeads.status', 'plusvibeLeads.sentStep', 'plusvibeLeads.isSequenceCompleted', 'plusvibeLeads.lastSentAt', 'influencerContactLinks.influencer.name'], [('stageColdCreatorCount', 'GREATER_THAN_OR_EQUAL', 1)], 32)
    widget(ghosted, 'Ghosted Reactivation Context', 'STANDALONE_RICH_TEXT', {'configurationType': 'STANDALONE_RICH_TEXT', 'body': {'markdown': 'Review **Ghosted** creators without changing their stage. Counts and inbox history below use recorded **PlusVibe emails only**, across sending inboxes. This POC is the person with the latest CRM inbound timestamp. Each POC count starts after their own CRM last-inbound timestamp; the all-POC total sums those counts and includes the last replying POC. Incomplete history can undercount. Use the reply evidence table, sorted oldest first, to inspect the original responding inbox. The exact first-inbox calculation is available on a single POC but excluded from bulk tables to keep them responsive. **LinkedIn history, inbox access, sequence activity and waterfall rounds are not inferred.** Open a POC or email to inspect context; the email evidence table includes reply text, inbox and thread relations. Ghosted remains a judgment-based stage.'}}, 0, 3)
    metric(ghosted, 'Ghosted Creators', ghosted_filter, 0, 4)
    metric(ghosted, 'With Recorded Replies', ghosted_filter + [('outreachPocsWithReplies', 'GREATER_THAN_OR_EQUAL', 1)], 4, 4)
    metric(ghosted, 'Reply History Missing', ghosted_filter + [('outreachPocsWithReplies', 'IS', 0)], 8, 4)
    table(ghosted, 'Ghosted Conversations', 'influencer', ['name', 'stageReplyingPoc', 'stageReplyingPocUnanswered', 'stageUnansweredAllPocs', 'lastInboundAt', 'lastOutboundAt', 'stageLastReplyAt', 'stageLatestReplyText', 'contactLinks.person.name'], ghosted_filter, 6, ('lastOutboundAt', 'ASC'))
    table(ghosted, 'Ghosted Inbox History', 'influencer', ['name', 'stageReplyingPoc', 'stageLastReplyInbox', 'stageLastSenderInbox', 'stageLastReplyAt', 'outreachPlusvibeLastSendAt'], ghosted_filter, 19)
    table(ghosted, 'Ghosted POC Follow-Ups', 'person', ['name', 'emails', 'stageUnansweredEmailCount', 'stageLastReplyAt', 'outreachPlusvibeLastSendAt', 'stageLastReplyInbox', 'stageLastSenderInbox', 'stageLatestReplyText', 'influencerContactLinks.influencer.name'], [('stageGhostedCreatorCount', 'GREATER_THAN_OR_EQUAL', 1)], 32)
    table(ghosted, 'Ghosted Reply And Thread Evidence', 'messageParticipant', ['handle', 'person.name', 'message.receivedAt', 'message.plusvibeSenderRecord.emails', 'message.subject', 'message.text', 'message'], [('stageIsGhostedPocReply', 'IS', True)], 45)
    for title, role_values, column in [('Recorded Replies By Inbox', ['FROM'], 0), ('Recorded Send Recipients By Inbox', ['TO', 'CC', 'BCC'], 6)]:
        widget(ghosted, title, 'GRAPH', {
            'configurationType': 'BAR_CHART',
            'aggregateFieldMetadataId': field_id('messageParticipant', 'id'),
            'aggregateOperation': 'COUNT',
            'primaryAxisGroupByFieldMetadataId': field_id('messageParticipant', 'stageOwnedInbox'),
            'primaryAxisOrderBy': 'VALUE_DESC', 'layout': 'HORIZONTAL',
            'displayDataLabel': True, 'displayLegend': False, 'omitNullValues': True,
            'filter': {'recordFilters': [
                {'id': str(uuid.uuid4()), 'fieldMetadataId': field_id('messageParticipant', 'stageIsGhostedPocEmail'), 'operand': 'IS', 'value': 'true'},
                {'id': str(uuid.uuid4()), 'fieldMetadataId': field_id('messageParticipant', 'role'), 'operand': 'IS', 'value': json.dumps(role_values)},
            ], 'recordFilterGroups': []},
        }, 58, 10, 'messageParticipant', column, 6)
    workspace_urls = query('{currentWorkspace{workspaceUrls{subdomainUrl customUrl}}}')['currentWorkspace']['workspaceUrls']
    workspace_url = (workspace_urls.get('customUrl') or workspace_urls['subdomainUrl']).rstrip('/')
    print(json.dumps({'created': created, 'layoutId': layout_id, 'coldTabId': cold['id'], 'ghostedTabId': ghosted['id'], 'url': workspace_url + '/page/' + layout_id}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Configure native Cold and Ghosted tabs in an existing Twenty dashboard.')
    parser.add_argument('--remote', required=True)
    parser.add_argument('--dashboard-id', required=True)
    parser.add_argument('--update-computations', action='store_true')
    arguments = parser.parse_args()
    configure(arguments.remote, arguments.dashboard_id, arguments.update_computations)
