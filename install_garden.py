#!/usr/bin/env python3
"""Install only the Garden variant into an initialized Herdr home."""
import argparse
import json
import os
from pathlib import Path
import shutil
import tempfile

ROOT = Path(__file__).resolve().parent
MODS = ('garden-patch', 'garden-bar')
LAYOUTS = ('garden.json', 'garden.svg')


def install(destination, source=ROOT):
    destination, source = Path(destination).expanduser(), Path(source)
    keys_path = destination / 'keys.json'
    original = keys_path.read_bytes()
    keys = json.loads(original)
    additions = json.loads((source / 'garden-keys.json').read_bytes())
    if not isinstance(keys, dict):
        raise ValueError('Existing keys.json must contain an object')
    targets = [destination / 'mods' / name for name in MODS] + [destination / 'layouts' / name for name in LAYOUTS]
    for target in targets:
        if target.exists() or target.is_symlink():
            raise FileExistsError(f'Already exists; nothing installed: {target}')
    for section, bindings in additions.items():
        current = keys.setdefault(section, {})
        if not isinstance(current, dict):
            raise ValueError(f'Invalid key section: {section}')
        for key, action in bindings.items():
            if key in current and current[key] != action:
                raise ValueError(f'Existing binding conflicts: {section} / {key}')
            current[key] = action
    # Stage complete mod folders so Herdr sees their place:none manifest on first discovery.
    with tempfile.TemporaryDirectory(prefix='.garden-install-', dir=destination) as folder:
        stage = Path(folder)
        for name in MODS:
            source_mod = source / 'mods' / name
            if any(p.is_symlink() for p in source_mod.rglob('*')):
                raise ValueError(f'Symlinks are not supported in {source_mod}')
            shutil.copytree(source_mod, stage / name, ignore=shutil.ignore_patterns('*.d.ts', 'jsconfig.json', '__pycache__', '*.error'))
        for name in LAYOUTS:
            shutil.copyfile(source / 'layouts' / name, stage / name)
        staged_keys = stage / 'keys.json'
        staged_keys.write_text(json.dumps(keys, indent=2, ensure_ascii=False) + '\n')
        shutil.copymode(keys_path, staged_keys)
        installed = []
        try:
            for name in MODS:
                target = destination / 'mods' / name
                # mkdir reserves the destination without replacing an existing folder.
                target.mkdir()
                installed.append(target)
                shutil.copyfile(stage / name / 'mod.json', target / 'mod.json')
                shutil.copytree(stage / name, target, dirs_exist_ok=True)
            for name in LAYOUTS:
                target = destination / 'layouts' / name
                with target.open('xb') as stream:
                    installed.append(target)
                    stream.write((stage / name).read_bytes())
            if keys_path.read_bytes() != original:
                raise RuntimeError('keys.json changed during installation; retry after it settles')
            with tempfile.NamedTemporaryFile(prefix='keys.before-garden-', suffix='.json', dir=destination, delete=False) as backup:
                backup.write(original)
                backup_path = Path(backup.name)
            os.replace(staged_keys, keys_path)
        except Exception:
            for path in reversed(installed):
                if path.is_dir():
                    shutil.rmtree(path)
                else:
                    path.unlink()
            raise
    return backup_path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--home', type=Path, default=Path.home() / '.config' / 'herdr-app')
    args = parser.parse_args()
    try:
        backup = install(args.home)
    except (OSError, ValueError) as error:
        parser.exit(1, f'Garden installation stopped: {error}\n')
    print(f'Garden installed. Previous keys: {backup}')
    print('Check both mods, then activate: herdr-app do layout.switch \'{"name":"garden"}\'')


if __name__ == '__main__':
    main()
