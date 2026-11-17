import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const modulePath = new URL('../mods/garden-patch/model.js', import.meta.url);
const model = await import(`data:text/javascript;base64,${readFileSync(modulePath).toString('base64')}`);
const { stateFor, focusTarget, orderAgents, pageSize } = model;
assert.equal(stateFor('working').pose, 'working');
assert.equal(stateFor('done').pose, 'done');
assert.equal(stateFor('idle').pose, 'idle');
assert.notEqual(stateFor('blocked').badge, stateFor('done').badge);
assert.equal(new Set(['working','blocked','done','idle'].map(s => stateFor(s).label)).size, 4);
assert.deepEqual(stateFor('unknown'), stateFor('idle'));
assert.deepEqual(focusTarget({pane:'p7',address:'t42'}), {command:'pane.focus',args:{pane:'p7'}});
assert.deepEqual(focusTarget({address:'remote/t42'}), {command:'terminal.peek',args:{terminal:'remote/t42'}});
const items = ['idle','working','done','blocked'].map((status,i) => ({status,address:`t${i}`}));
assert.deepEqual(orderAgents(items).map(i=>i.status), ['blocked','done','working','idle']);
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
const poses = ['working','blocked','done','idle'].map(status => stateFor(status).pose);
assert.equal(new Set(poses).size, 4, 'Every status should have a distinct figure pose');
for (const pose of poses) {
  const path = new URL(`../mods/garden-patch/assets/noob-${pose}.svg`,import.meta.url);
  assert.ok(existsSync(fileURLToPath(path)),`Missing noob pose: ${pose}`);
}
console.log('Noob model checks passed: poses, focus, ordering, pagination, asset coverage.');
