import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const modulePath = new URL('../mods/garden-patch/model.js', import.meta.url);
const model = await import(`data:text/javascript;base64,${readFileSync(modulePath).toString('base64')}`);
const { stateFor, cropFor, focusTarget, orderPlants, pageSize, CROPS } = model;
assert.equal(stateFor('working').stage, 'growing');
assert.equal(stateFor('done').stage, 'ripe');
assert.equal(stateFor('idle').stage, 'seedling');
assert.notEqual(stateFor('blocked').badge, stateFor('done').badge);
assert.equal(new Set(['working','blocked','done','idle'].map(s => stateFor(s).label)).size, 4);
assert.deepEqual(stateFor('unknown'), stateFor('idle'));
assert.deepEqual(cropFor('machine/t42'), cropFor('machine/t42'));
assert.ok(CROPS.includes(cropFor('machine/t42')));
assert.deepEqual(focusTarget({pane:'p7',address:'t42'}), {command:'pane.focus',args:{pane:'p7'}});
assert.deepEqual(focusTarget({address:'remote/t42'}), {command:'terminal.peek',args:{terminal:'remote/t42'}});
const items = ['idle','working','done','blocked'].map((status,i) => ({status,address:`t${i}`}));
assert.deepEqual(orderPlants(items).map(i=>i.status), ['blocked','done','working','idle']);
assert.deepEqual(items.map(i=>i.status), ['idle','working','done','blocked']);
for (const width of [280, 720, 1280, 1920]) {
  for (const height of [300, 370, 600]) {
    const page = pageSize(width,height);
    assert.ok(page.count >= 1 && page.count <= 16);
    const agents = Array.from({length:31},(_,i)=>i);
    const paged = Array.from({length:Math.ceil(agents.length/page.count)},(_,i)=>agents.slice(i*page.count,(i+1)*page.count)).flat();
    assert.deepEqual(paged,agents);
  }
}
for (const crop of CROPS) {
  for (const status of ['working','blocked','done','idle']) {
    const path = new URL(`../mods/garden-patch/assets/${crop.key}-${stateFor(status).stage}.svg`,import.meta.url);
    assert.ok(existsSync(fileURLToPath(path)),`Missing ${crop.key} / ${status}`);
  }
}
console.log('Garden model checks passed: states, focus, ordering, pagination, asset coverage.');
