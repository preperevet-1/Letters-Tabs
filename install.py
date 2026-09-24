"""Install this local Sine package into the detected user's release profile."""
import json
import pathlib
import shutil
import datetime

source = pathlib.Path(__file__).resolve().parent
profile = pathlib.Path('/Users/artemdrobot/Library/Application Support/zen/Profiles/rnjotx0u.Default (release)')
mods = profile / 'chrome/sine-mods'
registry = mods / 'mods.json'
css = mods / 'chrome.css'
metadata = json.loads((source / 'theme.json').read_text())
entries = json.loads(registry.read_text())
stamp = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
for path in (registry, css):
    if path.exists():
        shutil.copy2(path, path.with_name(path.name + '.backup-' + stamp))
destination = mods / metadata['id']
if destination.exists():
    shutil.copytree(destination, mods / (metadata['id'] + '.backup-' + stamp))
destination.mkdir(exist_ok=True)
for name in ('theme.json', 'chrome.css', 'LetterTabs.uc.js'):
    shutil.copy2(source / name, destination / name)
metadata.update({'enabled': True, 'no-updates': True, 'preferences': ''})
entries[metadata['id']] = metadata
text = json.dumps(entries, ensure_ascii=False, indent=2) + '\n'
temp = registry.with_suffix('.json.tmp')
temp.write_text(text)
temp.replace(registry)
line = '@import "' + (destination / 'chrome.css').as_uri() + '";'
styles = css.read_text() if css.exists() else ''
if line not in styles:
    css.write_text(styles.rstrip() + '\n' + line + '\n')
assert json.loads(registry.read_text())['zen-letter-tabs']['enabled']
assert (destination / 'LetterTabs.uc.js').read_bytes() == (source / 'LetterTabs.uc.js').read_bytes()
print('Installed Letter Tabs in', destination)
