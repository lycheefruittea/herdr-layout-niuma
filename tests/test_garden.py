import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('garden_installer', ROOT / 'install_garden.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


class GardenAssets(unittest.TestCase):
    def test_assets_are_valid_local_svg(self):
        files = list((ROOT / 'mods/garden-patch/assets').glob('*.svg')) + [ROOT / 'layouts/garden.svg']
        self.assertGreaterEqual(len(files), 25)
        for path in files:
            with self.subTest(path=path.name):
                root = ET.fromstring(path.read_bytes())
                self.assertTrue(root.tag.endswith('svg'))
                for element in root.iter():
                    self.assertNotIn(element.tag.split('}')[-1], ['script', 'foreignObject'])
                    for name, value in element.attrib.items():
                        if name.endswith('href'):
                            self.assertTrue(value.startswith('#'))

    def test_layout_has_unique_ids_and_installed_mods(self):
        tree = json.loads((ROOT / 'layouts/garden.json').read_bytes())
        ids, mods, terminals = [], [], []
        def walk(value):
            if isinstance(value, dict):
                if 'id' in value: ids.append(value['id'])
                if 'mod' in value: mods.append(value['mod'])
                if 'terminal' in value: terminals.append(value['terminal'])
                for child in value.values(): walk(child)
            elif isinstance(value, list):
                for child in value: walk(child)
        walk(tree)
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(set(mods), {'garden-patch', 'garden-bar', 'pane'})
        self.assertFalse(terminals, 'Shipped layouts must not contain personal terminal IDs')
        self.assertEqual(tree['preview'], 'layouts/garden.svg')

    def test_keys_are_scoped_and_mods_do_not_update_niuma(self):
        keys = json.loads((ROOT / 'garden-keys.json').read_bytes())
        self.assertEqual(set(keys), {'layout:garden'})
        self.assertEqual(keys['layout:garden']['cmd-t'], 'garden-bar.split')
        for folder in ['garden-bar', 'garden-patch']:
            source = (ROOT / 'mods' / folder / 'main.js').read_text()
            self.assertNotIn('niu-ma', source)
            self.assertNotIn('fetch(', source)
            self.assertNotIn('writeTextFile(', source)
            self.assertIn('checking()', source)

    def test_state_behavior(self):
        result = subprocess.run(['node', str(ROOT / 'tests/test_model.mjs')], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


class GardenInstallation(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name)
        (self.home / 'mods').mkdir()
        (self.home / 'layouts').mkdir()
        self.original = b'{"global":{"cmd-t":"tab.new"},"layout:niu-ma":{"cmd-t":"niu-ma-bar.split"}}\n'
        (self.home / 'keys.json').write_bytes(self.original)
        (self.home / 'layouts/niu-ma.json').write_text('{"personal":"unchanged"}')

    def test_installs_additively_and_backs_up_keys(self):
        backup = installer.install(self.home)
        self.assertEqual(backup.read_bytes(), self.original)
        self.assertEqual((self.home / 'layouts/niu-ma.json').read_text(), '{"personal":"unchanged"}')
        keys = json.loads((self.home / 'keys.json').read_bytes())
        self.assertEqual(keys['global'], json.loads(self.original)['global'])
        self.assertEqual(keys['layout:niu-ma'], json.loads(self.original)['layout:niu-ma'])
        self.assertIn('layout:garden', keys)
        for name in installer.MODS:
            self.assertEqual(json.loads((self.home / 'mods' / name / 'mod.json').read_bytes())['place'], 'none')
            self.assertTrue((self.home / 'mods' / name / 'main.js').is_file())

    def test_existing_layout_stops_without_writes(self):
        (self.home / 'layouts/garden.json').write_text('personal layout')
        with self.assertRaises(FileExistsError): installer.install(self.home)
        self.assertEqual((self.home / 'layouts/garden.json').read_text(), 'personal layout')
        self.assertEqual((self.home / 'keys.json').read_bytes(), self.original)
        self.assertFalse((self.home / 'mods/garden-patch').exists())

    def test_key_conflict_stops_without_writes(self):
        keys = json.loads(self.original)
        keys['layout:garden'] = {'cmd-t': 'terminal'}
        before = json.dumps(keys).encode()
        (self.home / 'keys.json').write_bytes(before)
        with self.assertRaises(ValueError): installer.install(self.home)
        self.assertEqual((self.home / 'keys.json').read_bytes(), before)
        self.assertFalse((self.home / 'layouts/garden.json').exists())

    def test_invalid_keys_stops_without_writes(self):
        (self.home / 'keys.json').write_text('broken json')
        with self.assertRaises(ValueError): installer.install(self.home)
        self.assertEqual((self.home / 'keys.json').read_text(), 'broken json')
        self.assertFalse((self.home / 'mods/garden-patch').exists())

    def test_reinstall_refuses_to_replace_customized_mod(self):
        installer.install(self.home)
        main = self.home / 'mods/garden-patch/main.js'
        main.write_text('my edited mod')
        keys = (self.home / 'keys.json').read_bytes()
        with self.assertRaises(FileExistsError): installer.install(self.home)
        self.assertEqual(main.read_text(), 'my edited mod')
        self.assertEqual((self.home / 'keys.json').read_bytes(), keys)


if __name__ == '__main__': unittest.main()
