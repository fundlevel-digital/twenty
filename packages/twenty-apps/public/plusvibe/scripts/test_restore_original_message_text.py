import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('restore-original-message-text.py')
specification = importlib.util.spec_from_file_location('restoration', SCRIPT)
restoration = importlib.util.module_from_spec(specification)
specification.loader.exec_module(restoration)

OPERATOR = '''import json
from pathlib import Path
ROOT = Path(__file__).parent / 'recovery'
WORKSPACE = 'source-workspace'
def save(path, value):path.write_text(json.dumps(value))
def query(document, variables, path):
 state=json.loads((ROOT/'api-state.json').read_text())
 if document.startswith('query('):
  rows=[row for row in state['rows'] if row['id'] in variables['ids']]
  return {'messages':{'totalCount':len(rows),'edges':[{'node':row} for row in rows]}}
 if state.get('editBeforeMutation'):state['rows'][0]['text']='Manual edit'
 if document.count('updateMessages(')!=1:raise RuntimeError('Duplicate root resolver')
 guard=variables['filter'];fields=variables['data']
 rows=[row for row in state['rows'] if row['id']==guard['id']['eq'] and row['text']==guard['text']['eq']]
 for row in rows:row.update(fields)
 result={'updateMessages':[{'id':row['id']} for row in rows]}
 save(ROOT/'api-state.json',state)
 return result
'''


class OriginalTextRestorationTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.addCleanup(self.directory.cleanup)
        (self.root / 'recovery').mkdir()
        (self.root / 'recovery-operator.py').write_text(OPERATOR)
        module = self.root / 'src/logic-functions/utils/email-content.ts'
        module.parent.mkdir(parents=True)
        real_module = SCRIPT.parent.parent / 'src/logic-functions/utils/email-content.ts'
        module.write_text('export {extractEmailReply} from ' + json.dumps(str(real_module)) + ';')
        self.before = [
            {'id': 'message-1', 'subject': 'Subject', 'text': 'Reply text  \n', 'receivedAt': '2026-11-24T00:00:00Z', 'messageThreadId': 'thread-1'},
            {'id': 'message-2', 'subject': 'Subject', 'text': 'Keep unchanged', 'receivedAt': '2026-11-24T00:00:00Z', 'messageThreadId': 'thread-2'},
        ]
        self.state = {'rows': [{**row, 'text': 'Reply text' if row['id'] == 'message-1' else row['text']} for row in self.before]}
        self.save('messages-before.json', self.before)
        self.save('message-repair-plan.json', {'summary': {'nativeMessages': 2}})
        self.save('api-state.json', self.state)
        (self.root / 'deploy-durable-sync.json').write_text(json.dumps({'ok': True}))

    def save(self, name, value):
        (self.root / 'recovery' / name).write_text(json.dumps(value))

    def run_operator(self):
        with patch.object(sys, 'argv', ['restore', '--private-root', str(self.root), '--apply']), patch.object(restoration, 'assert_legacy_idle'), patch.object(restoration.time, 'sleep'), contextlib.redirect_stdout(io.StringIO()):
            restoration.main()

    def test_restores_only_the_proven_transformation_and_verifies_readback(self):
        self.run_operator()
        state = json.loads((self.root / 'recovery/api-state.json').read_text())
        self.assertEqual(state['rows'], self.before)
        result = json.loads((self.root / 'recovery/original-text-restoration-result.json').read_text())
        self.assertEqual(result['restored'], 1)
        self.assertTrue(result['complete'])

    def test_rejects_unrelated_text_changes_without_writes(self):
        self.state['rows'][0]['text'] = 'A different manual edit'
        self.save('api-state.json', self.state)
        with self.assertRaisesRegex(RuntimeError, 'does not match'):
            self.run_operator()
        state = json.loads((self.root / 'recovery/api-state.json').read_text())
        self.assertEqual(state, self.state)

    def test_compare_and_set_preserves_a_concurrent_manual_edit(self):
        self.state['editBeforeMutation'] = True
        self.save('api-state.json', self.state)
        with self.assertRaisesRegex(RuntimeError, 'compare-and-set'):
            self.run_operator()
        state = json.loads((self.root / 'recovery/api-state.json').read_text())
        self.assertEqual(state['rows'][0]['text'], 'Manual edit')
        self.assertFalse((self.root / 'recovery/original-text-restoration-result.json').exists())

    def test_rejects_other_original_field_changes(self):
        self.state['rows'][0]['messageThreadId'] = 'changed-thread'
        self.save('api-state.json', self.state)
        with self.assertRaisesRegex(RuntimeError, 'guard failed'):
            self.run_operator()
        state = json.loads((self.root / 'recovery/api-state.json').read_text())
        self.assertEqual(state, self.state)


if __name__ == '__main__':
    unittest.main()
