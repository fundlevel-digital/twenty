import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent


def build_workflow():
    workflow = json.loads((ROOT / 'workflow.template.json').read_text())
    selector = (ROOT / 'select-reply.ts').read_text()
    loader = (ROOT / 'find-thread.ts').read_text()
    formatter = (ROOT / 'write-reply.ts').read_text()

    # Inline workflow code cannot resolve relative source files.
    selector_import, separator, loader_body = loader.partition(';\n')
    if not separator or "from './select-reply.ts'" not in selector_import:
        raise ValueError('The thread loader must start with its local selector import.')

    code_steps = [step for step in workflow['steps'] if step['type'] == 'CODE']
    code_steps[0]['settings']['input']['code'] = selector + '\n' + loader_body
    code_steps[1]['settings']['input']['code'] = formatter
    return workflow


if __name__ == '__main__':
    print(json.dumps(build_workflow(), indent=2))
