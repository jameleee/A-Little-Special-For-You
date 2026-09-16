// No dependencies. Exercise the actual production validator in an isolated VM.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('js/app.js', 'utf8');
const original = JSON.parse(fs.readFileSync('data/content.json', 'utf8'));
const sandbox = {
  document: {getElementById: () => ({})},
  matchMedia: () => ({matches: false}),
  console: {info() {}, error() {}}
};
vm.runInNewContext(source.replace(/  boot\(\);\s*\}\)\(\);\s*$/, '  globalThis.validate = validate; globalThis.pageFoldGeometry = pageFoldGeometry;\n})();'), sandbox);
assert.equal(typeof sandbox.validate, 'function');
let count = 0;
function test(name, edit, invalid = false) {
  const value = structuredClone(original);
  edit(value);
  if (invalid) assert.throws(() => sandbox.validate(value), undefined, name);
  else assert.doesNotThrow(() => sandbox.validate(value), name);
  console.log('PASS', name); count++;
}
test('default content', () => {});
test('duplicate ID', d => d.screens[1].id = d.screens[0].id, true);
test('unknown screen type', d => d.screens[0].type = 'unknown', true);
test('broken goto target', d => d.screens[0].buttons[0] = {label: 'x', action: 'goto', target: 'absent'}, true);
test('missing required title', d => delete d.screens[0].title, true);
test('missing letter paragraphs', d => delete d.screens[3].paragraphs, true);
test('invalid start screen', d => d.settings.startScreen = 'absent', true);
test('unknown action', d => d.screens[0].buttons[0].action = 'delete', true);
test('reject external media path', d => d.screens.find(s => s.type === 'music').src = 'https://example.com/song.mp3', true);
test('reject traversal path', d => d.screens.find(s => s.type === 'music').src = '../song.mp3', true);
test('missing UI labels', d => delete d.ui.play, true);
test('invalid animation', d => d.screens[0].animation.enter = 'bounce', true);
test('invalid decoration', d => d.screens[0].decorations[0].position = 'elsewhere', true);
test('invalid ending paragraphs', d => d.screens.find(s => s.type === 'music').endingParagraphs = {}, true);
test('tease messages are configurable', d => {
  const tease = d.screens.find(s => s.type === 'question').tease;
  tease.messages.push('Một câu nhây mới.');
  tease.reactions.push('🙂');
});
test('empty tease messages', d => d.screens.find(s => s.type === 'question').tease.messages = [], true);
test('empty recipient name', d => d.settings.recipientName = '', true);
test('tease reactions align with messages', d => d.screens.find(s => s.type === 'question').tease.reactions = ['🥺'], true);
test('tease action outside question', d => d.screens.find(s => s.type === 'intro').buttons[0].action = 'tease', true);
test('scratch gift screen', () => {});
test('missing scratch gift', d => delete d.screens.find(s => s.type === 'scratch-gift').gift, true);
test('invalid scratch image path', d => d.screens.find(s => s.type === 'scratch-gift').gift.src = 'https://example.com/gift.jpg', true);
test('missing scratch alt', d => d.screens.find(s => s.type === 'scratch-gift').gift.alt = '', true);
test('scratch threshold too low', d => d.screens.find(s => s.type === 'scratch-gift').gift.revealThreshold = 0.05, true);
test('scratch threshold too high', d => d.screens.find(s => s.type === 'scratch-gift').gift.revealThreshold = 0.95, true);
test('scratch progress messages cannot be empty', d => d.screens.find(s => s.type === 'scratch-gift').gift.progressMessages = [], true);
test('scratch needs a reveal action', d => d.screens.find(s => s.type === 'scratch-gift').buttons[0].showAfterReveal = false, true);
test('music fade duration is bounded', d => d.settings.musicFadeDuration = 9000, true);
test('new ending screen needs no JavaScript changes', d => d.screens.push({id: 'new-ending', type: 'ending', title: 'New screen', paragraphs: ['Added only in JSON']})); 
for (const layout of ['single-polaroid', 'polaroid-stack', 'two-polaroid', 'three-polaroid']) {
  test('gallery ' + layout, d => d.screens.find(s => s.type === 'gallery').layout = layout);
}
test('photo-template slot count must match images', d => d.screens.find(s => s.layout === 'photo-template').template.slots.pop(), true);
test('photo-template slot stays inside template', d => d.screens.find(s => s.layout === 'photo-template').template.slots[0].width = 95, true);
test('photo-template path stays relative', d => d.screens.find(s => s.layout === 'photo-template').template.src = 'https://example.com/frame.jpg', true);
test('reordered screens with explicit start', d => d.screens.reverse());
test('missing assets remain valid for graceful fallbacks', d => d.screens.find(s => s.type === 'music').src = 'assets/audio/absent.mp3');
test('portal target must exist', d => d.screens[1].transition.target = 'missing', true);
test('portal cannot recurse', d => d.screens[1].transition.target = 'envelope', true);
test('portal duration must contain ignition and zoom', d => d.screens[1].transition.duration = 1100, true);
test('portal image stays local', d => d.screens[1].transition.background.src = '../outside.png', true);
test('portal ignition stays inside paper', d => d.screens[1].transition.ignition.x = 2, true);
test('page turn invalid duration', d => d.screens.find(s=>s.type==='letter').transition.duration = -1, true);
test('page turn backward must use left corner', d => d.screens.find(s=>s.type==='letter').transition.backward.origin = 'bottom-right', true);
assert.throws(() => sandbox.validate({screens: []}));
assert.throws(() => sandbox.validate(null));
assert.throws(() => JSON.parse('{invalid json'));
console.log(count + ' cases passed, plus empty/null/malformed input checks.');

// Physical Back must mirror the corner, crease and reverse face, not reverse time.
for (const progress of [0, .1, .4, .7, .99]) {
  const forward=sandbox.pageFoldGeometry(390,844,progress,'forward');
  const backward=sandbox.pageFoldGeometry(390,844,progress,'backward');
  for(const face of ['front','back','crease']) {
    assert.equal(forward[face].length,backward[face].length);
    forward[face].forEach(([x,y],i)=>{
      assert.ok(Math.abs(backward[face][i][0]-(390-x))<1e-8);
      assert.equal(backward[face][i][1],y);
    });
  }
}
const area = points => Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
let last=390*844;
for(let i=0;i<=20;i++) {
 const next=area(sandbox.pageFoldGeometry(390,844,i/20,'forward').front);
 assert.ok(next<=last+1e-7);last=next;
}
assert.equal(last,0);
console.log('PASS mirrored fold geometry and progressive reveal');
