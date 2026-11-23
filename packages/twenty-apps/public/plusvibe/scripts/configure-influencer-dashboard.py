import argparse
import json
import os
import urllib.request
import uuid


def configure_dashboard(config_path, remote_name, dashboard_id):
    remote = json.load(open(os.path.expanduser(config_path)))['remotes'][remote_name]

    def query(path, document, variables=None):
        request = urllib.request.Request(
            remote['apiUrl'] + path,
            data=json.dumps({'query': document, 'variables': variables or {}}).encode(),
            headers={
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + remote['twentyCLIAccessToken'],
            },
        )
        with urllib.request.urlopen(request, timeout=55) as response:
            result = json.load(response)
        if result.get('errors'):
            raise RuntimeError(json.dumps(result['errors']))
        return result['data']

    def mutate(name, input_type, payload, selection='id'):
        return query(
            '/metadata',
            'mutation($input:' + input_type + '!){' + name
            + '(input:$input){' + selection + '}}',
            {'input': payload},
        )[name]

    objects = query('/metadata', '''{
      objects(paging:{first:200}) { edges { node {
        id nameSingular fields(paging:{first:250}) { edges { node {
          id name type computation
        } } }
      } } }
    }''')['objects']['edges']
    objects = {edge['node']['nameSingular']: edge['node'] for edge in objects}
    fields = {
        name: {edge['node']['name']: edge['node'] for edge in item['fields']['edges']}
        for name, item in objects.items()
    }
    if 'outreachPocsWithConfirmedOutreach' in fields['influencer']:
        print('Source-backed dashboard already configured; use configure-source-coverage.py for source coverage updates.')
        return
    dashboard = query('/graphql', '''query($id:UUID!){
      dashboard(filter:{id:{eq:$id}}){id pageLayoutId}
    }''', {'id': dashboard_id})['dashboard']
    layout_id = dashboard['pageLayoutId']
    created = {'fields': 0, 'views': 0, 'tabs': 0, 'widgets': 0}

    def field(object_name, name, label, field_type, computation, description):
        if name in fields[object_name]:
            existing = fields[object_name][name]
            actual = {key: value for key, value in (existing['computation'] or {}).items()
                      if key != 'bindings'}
            if existing['type'] != field_type or actual != computation:
                raise RuntimeError('Existing field differs: ' + object_name + '.' + name)
            return existing['id']
        payload = {
            'objectMetadataId': objects[object_name]['id'], 'name': name,
            'label': label, 'type': field_type, 'icon': 'IconMail',
            'isNullable': True, 'isUIReadOnly': True,
            'description': description, 'computation': computation,
        }
        if field_type == 'NUMBER':
            payload['settings'] = {'dataType': 'int', 'decimals': 0}
        result = mutate('createOneField', 'CreateOneFieldMetadataInput',
                        {'field': payload}, 'id name type computation')
        fields[object_name][name] = result
        created['fields'] += 1
        print('Created Field:', object_name + '.' + name, flush=True)
        return result['id']

    def rollup(object_name, name, label, relation, operation='COUNT',
               expression=None, condition=None, field_type='NUMBER'):
        computation = {'kind': 'ROLLUP', 'relationFieldName': relation,
                       'operation': operation}
        if expression:
            computation['expression'] = expression
        if condition:
            computation['filter'] = condition
        return field(object_name, name, label, field_type, computation,
                     'Live calculation from recorded CRM data. Missing history is not proof of no outreach.')

    send_filter = "(role == 'TO' or role == 'CC' or role == 'BCC') and message.source == 'PLUSVIBE' and message.isDraft != true"
    reply_filter = "role == 'FROM' and message.source == 'PLUSVIBE' and message.isDraft != true"
    rollup('person', 'outreachPlusvibeLeadCount', 'Recorded PlusVibe Leads', 'plusvibeLeads')
    rollup('person', 'outreachInfluencerCount', 'Related Influencers',
           'influencerContactLinks', condition='isDefined(influencer.id)')
    rollup('person', 'outreachPlusvibeSendCount', 'Recorded PlusVibe Sends',
           'messageParticipants', condition=send_filter)
    rollup('person', 'outreachPlusvibeReplyCount', 'Recorded PlusVibe Replies',
           'messageParticipants', condition=reply_filter)
    rollup('person', 'outreachPlusvibeLastSendAt', 'Last Recorded PlusVibe Send',
           'messageParticipants', 'MAX', 'message.receivedAt', send_filter, 'DATE_TIME')
    field('person', 'outreachPlusvibeCoverage', 'PlusVibe Coverage', 'TEXT', {
        'kind': 'FORMULA',
        'expression': "if(outreachPlusvibeReplyCount > 0, 'Reply Recorded', if(outreachPlusvibeSendCount > 0, 'Sends Recorded', if(outreachPlusvibeLeadCount > 0, 'Lead Without Recorded Sends', 'No Recorded Lead Or Sends')))"
    }, 'Coverage across all addresses on this Person; not sequence completion or email-specific eligibility.')
    rollup('influencer', 'outreachPocCount', 'POCs', 'contactLinks',
           condition='isDefined(person.id)')
    for name, label, person_field in [
        ('outreachPocsWithLeads', 'POCs With Recorded Leads', 'outreachPlusvibeLeadCount'),
        ('outreachPocsWithSends', 'POCs With Recorded Sends', 'outreachPlusvibeSendCount'),
        ('outreachPocsWithReplies', 'POCs With Recorded Replies', 'outreachPlusvibeReplyCount'),
    ]:
        rollup('influencer', name, label, 'contactLinks', condition='person.' + person_field + ' > 0')
    rollup('influencer', 'outreachPlusvibeLastSendAt', 'Last Recorded PlusVibe Send',
           'contactLinks', 'MAX', 'person.outreachPlusvibeLastSendAt', field_type='DATE_TIME')
    field('influencer', 'outreachPlusvibeCoverage', 'PlusVibe Coverage', 'TEXT', {
        'kind': 'FORMULA',
        'expression': "if(outreachPocCount == 0, 'No POC', if(outreachPocsWithReplies > 0, 'POC Reply Recorded', if(outreachPocsWithSends > 0, 'POC Sends Recorded', if(outreachPocsWithLeads > 0, 'Lead Without Recorded Sends', 'No Recorded Lead Or Sends'))))"
    }, 'Activity on related POCs. A shared POC may represent multiple influencers; this is not campaign attribution.')
    field('messageParticipant', 'outreachIsInfluencerPlusvibeSend',
          'Influencer POC PlusVibe Recipient', 'BOOLEAN', {
              'kind': 'FORMULA',
              'expression': '(' + send_filter + ') and person.outreachInfluencerCount > 0',
          }, 'Recorded PlusVibe TO, CC or BCC recipient related to an influencer POC. Excludes drafts and reply-to headers.')

    def field_id(object_name, name):
        return fields[object_name][name]['id']

    def make_view(object_name, name, columns, filters=(), sort=None, view_type='TABLE_WIDGET'):
        existing = query('/metadata', '''query($object:String){
          getViews(objectMetadataId:$object){id name type}
        }''', {'object': objects[object_name]['id']})['getViews']
        found = next((view for view in existing if view['name'] == name and view['type'] == view_type), None)
        view_id = found['id'] if found else mutate('createView', 'CreateViewInput', {
            'name': name, 'objectMetadataId': objects[object_name]['id'],
            'type': view_type, 'icon': 'IconMail', 'visibility': 'WORKSPACE',
        })['id']
        created['views'] += 0 if found else 1
        current = query('/metadata', '''query($id:String!){getView(id:$id){
          viewFields{fieldMetadataId relationTargetFieldMetadataId relationPathFieldMetadataIds}
          viewFilters{fieldMetadataId operand value} viewSorts{fieldMetadataId direction}
        }}''', {'id': view_id})['getView']
        missing_columns = []
        for position, column in enumerate(columns):
            path = column.split('.')
            current_object = object_name
            relation_ids = []
            relation_targets = {'person': 'person', 'influencer': 'influencer',
                                'message': 'message', 'contactLinks': 'influencerContact',
                                'influencerContactLinks': 'influencerContact',
                                'plusvibeLeads': 'plusvibeLead'}
            for relation in path[:-1]:
                relation_ids.append(field_id(current_object, relation))
                current_object = relation_targets[relation]
            payload = {'viewId': view_id, 'position': position, 'isVisible': True,
                       'size': 240 if len(path) > 1 or path[-1] in ['name', 'outreachPlusvibeCoverage'] else 150}
            if relation_ids:
                payload.update({'fieldMetadataId': relation_ids[0],
                                'isCanonical': False,
                                'relationPathFieldMetadataIds': relation_ids[1:],
                                'relationTargetFieldMetadataId': field_id(current_object, path[-1])})
            else:
                payload['fieldMetadataId'] = field_id(object_name, path[0])
            if not any(item['fieldMetadataId'] == payload['fieldMetadataId']
                       and item.get('relationTargetFieldMetadataId') == payload.get('relationTargetFieldMetadataId')
                       and (item.get('relationPathFieldMetadataIds') or []) == payload.get('relationPathFieldMetadataIds', [])
                       for item in current['viewFields']):
                missing_columns.append(payload)
        if missing_columns:
            query('/metadata', '''mutation($inputs:[CreateViewFieldInput!]!){
              createManyViewFields(inputs:$inputs){id}
            }''', {'inputs': missing_columns})
        for filter_name, operand, value in filters:
            if any(item['fieldMetadataId'] == field_id(object_name, filter_name)
                   and item['operand'] == operand and item['value'] == json.dumps(value)
                   for item in current['viewFilters']):
                continue
            mutate('createViewFilter', 'CreateViewFilterInput', {
                'viewId': view_id, 'fieldMetadataId': field_id(object_name, filter_name),
                'operand': operand, 'value': json.dumps(value),
            })
        if sort and not any(item['fieldMetadataId'] == field_id(object_name, sort[0])
                            for item in current['viewSorts']):
            mutate('createViewSort', 'CreateViewSortInput', {
                'viewId': view_id, 'fieldMetadataId': field_id(object_name, sort[0]),
                'direction': sort[1],
            })
        print('Configured View:', name, flush=True)
        return view_id

    influencer_columns = ['name', 'outreachPlusvibeCoverage', 'outreachPocCount',
                          'outreachPocsWithLeads', 'outreachPocsWithSends',
                          'outreachPocsWithReplies', 'outreachPlusvibeLastSendAt',
                          'contactLinks.person.name', 'contactLinks.person.emails']
    poc_columns = ['name', 'emails', 'influencerContactLinks.influencer.name',
                   'outreachPlusvibeCoverage', 'outreachPlusvibeLeadCount',
                   'outreachPlusvibeSendCount', 'outreachPlusvibeReplyCount',
                   'outreachPlusvibeLastSendAt', 'plusvibeLeads.emails', 'plusvibeLeads.status']
    poc_filter = [('outreachInfluencerCount', 'GREATER_THAN_OR_EQUAL', 1)]
    views = {}
    views['All Influencers'] = ('influencer', make_view('influencer', 'Outreach: All Influencers', influencer_columns, sort=('name', 'ASC')))
    views['No Recorded Sends'] = ('influencer', make_view('influencer', 'Outreach: No Recorded Sends', influencer_columns, [('outreachPocsWithSends', 'IS', 0)], ('name', 'ASC')))
    views['All POCs'] = ('person', make_view('person', 'Outreach: All POCs', poc_columns, poc_filter, ('outreachPlusvibeSendCount', 'DESC')))
    views['POCs Without Leads'] = ('person', make_view('person', 'Outreach: POCs Without Leads', poc_columns, poc_filter + [('outreachPlusvibeLeadCount', 'IS', 0)], ('name', 'ASC')))
    views['POCs Without Sends'] = ('person', make_view('person', 'Outreach: POCs Without Sends', poc_columns, poc_filter + [('outreachPlusvibeSendCount', 'IS', 0)], ('name', 'ASC')))
    views['Email Send Details'] = ('messageParticipant', make_view('messageParticipant', 'Outreach: Email Send Details',
        ['handle', 'person.name', 'role', 'message.receivedAt', 'message.subject', 'person.influencerContactLinks.influencer.name'],
        [('outreachIsInfluencerPlusvibeSend', 'IS', True)]))
    for title in ['All Influencers', 'All POCs', 'Email Send Details']:
        object_name = views[title][0]
        columns = influencer_columns if object_name == 'influencer' else poc_columns if object_name == 'person' else ['handle', 'person.name', 'role', 'message.receivedAt', 'message.subject']
        filters = () if object_name == 'influencer' else poc_filter if object_name == 'person' else [('outreachIsInfluencerPlusvibeSend', 'IS', True)]
        make_view(object_name, 'Outreach: ' + title, columns, filters, view_type='TABLE')

    layout = query('/metadata', '''query($id:String!){getPageLayout(id:$id){
      id tabs{id title widgets{id title}}
    }}''', {'id': layout_id})['getPageLayout']

    def tab(title):
        existing = next((item for item in layout['tabs'] if item['title'] == title), None)
        if existing:
            return existing
        result = mutate('createPageLayoutTab', 'CreatePageLayoutTabInput', {
            'title': title, 'pageLayoutId': layout_id, 'position': len(layout['tabs']),
            'layoutMode': 'GRID',
        }, 'id title')
        result['widgets'] = []
        layout['tabs'].append(result)
        created['tabs'] += 1
        return result

    def widget(target, title, kind, object_name, configuration, row, height, column=0, width=12):
        if any(item['title'] == title for item in target['widgets']):
            return
        payload = {
            'pageLayoutTabId': target['id'], 'title': title, 'type': kind,
            'configuration': configuration,
            'position': {'layoutMode': 'GRID', 'row': row, 'column': column,
                         'rowSpan': height, 'columnSpan': width},
        }
        if object_name:
            payload['objectMetadataId'] = objects[object_name]['id']
        result = mutate('createPageLayoutWidget', 'CreatePageLayoutWidgetInput', payload)
        target['widgets'].append({'id': result['id'], 'title': title})
        created['widgets'] += 1

    coverage = tab('Outreach Coverage')
    widget(coverage, 'How To Read Coverage', 'STANDALONE_RICH_TEXT', None, {
        'configurationType': 'STANDALONE_RICH_TEXT', 'body': {'markdown':
            'All influencers are included. Counts reflect PlusVibe records currently imported into this CRM. '
            '**No recorded sends does not prove an address was never contacted.** '
            'POC counts cover all their email addresses; shared POC activity appears on every related influencer. '
            'Lead existence and sends are separate. Ranking and waterfall automation are deferred.'}}, 0, 3)
    for index, (title, name, operand, value) in enumerate([
        ('All Influencers', None, None, None),
        ('No Recorded Sends', 'outreachPocsWithSends', 'IS', 0),
        ('POCs Have Recorded Sends', 'outreachPocsWithSends', 'GREATER_THAN_OR_EQUAL', 1),
        ('No POC', 'outreachPocCount', 'IS', 0),
    ]):
        filters = [] if name is None else [{'id': str(uuid.uuid4()), 'fieldMetadataId': field_id('influencer', name), 'operand': operand, 'value': json.dumps(value)}]
        widget(coverage, title, 'GRAPH', 'influencer', {
            'configurationType': 'AGGREGATE_CHART', 'aggregateFieldMetadataId': field_id('influencer', 'id'),
            'aggregateOperation': 'COUNT', 'label': title,
            'filter': {'recordFilters': filters, 'recordFilterGroups': []},
        }, 3, 3, index * 3, 3)
    for row, title in [(6, 'All Influencers'), (19, 'No Recorded Sends')]:
        object_name, view_id = views[title]
        widget(coverage, title + ' — Details', 'RECORD_TABLE', object_name,
               {'configurationType': 'RECORD_TABLE', 'viewId': view_id}, row, 13)
    pocs = tab('POC Coverage')
    for index, title in enumerate(['All POCs', 'POCs Without Leads', 'POCs Without Sends']):
        object_name, view_id = views[title]
        widget(pocs, title, 'RECORD_TABLE', object_name,
               {'configurationType': 'RECORD_TABLE', 'viewId': view_id}, index * 13, 13)
    emails = tab('Email Usage')
    widget(emails, 'Email Usage Counting', 'STANDALONE_RICH_TEXT', None, {
        'configurationType': 'STANDALONE_RICH_TEXT', 'body': {'markdown':
            'Counts use actual recipient email addresses on recorded PlusVibe sends to influencer POCs (To, Cc and Bcc). '
            'Drafts, sender rows and Reply-To headers are excluded. '
            'The POC Coverage tab shows all current POC emails alongside imported lead emails, including POCs with no recorded sends. '
            'Email usage does not measure completed sequences or waterfall rounds.'}}, 0, 3)
    widget(emails, 'Recorded Sends By Email', 'GRAPH', 'messageParticipant', {
        'configurationType': 'BAR_CHART', 'aggregateFieldMetadataId': field_id('messageParticipant', 'id'),
        'aggregateOperation': 'COUNT', 'primaryAxisGroupByFieldMetadataId': field_id('messageParticipant', 'handle'),
        'primaryAxisOrderBy': 'VALUE_DESC', 'layout': 'HORIZONTAL', 'displayDataLabel': True,
        'displayLegend': False, 'omitNullValues': True,
        'filter': {'recordFilters': [{'id': str(uuid.uuid4()),
            'fieldMetadataId': field_id('messageParticipant', 'outreachIsInfluencerPlusvibeSend'),
            'operand': 'IS', 'value': 'true'}], 'recordFilterGroups': []},
    }, 3, 12)
    object_name, view_id = views['Email Send Details']
    widget(emails, 'Email Send Details', 'RECORD_TABLE', object_name,
           {'configurationType': 'RECORD_TABLE', 'viewId': view_id}, 15, 13)
    print(json.dumps({'created': created, 'dashboardId': dashboard_id, 'pageLayoutId': layout_id}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Configure native influencer outreach coverage in an existing dashboard.')
    parser.add_argument('--config', default='~/.twenty/config.json')
    parser.add_argument('--remote', required=True)
    parser.add_argument('--dashboard-id', required=True)
    args = parser.parse_args()
    configure_dashboard(args.config, args.remote, args.dashboard_id)
