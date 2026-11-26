// Exercise the actual viewport sync body without starting a browser/game loop.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('game.js','utf8');
const match=source.match(/  function syncVisibleViewport\(\) \{[\s\S]*?\n  \}/);
assert(match,'actual syncVisibleViewport function must be present');
function sync({visualViewport,innerWidth=390,innerHeight=844,clientWidth=390,clientHeight=844}){
  const styles=new Map(),viewport=visualViewport&&Object.freeze({...visualViewport});
  const context={window:{visualViewport:viewport,innerWidth,innerHeight},document:{documentElement:{clientWidth,clientHeight,style:{setProperty:(key,value)=>styles.set(key,value)}}}};
  vm.runInNewContext(`let viewportSyncFrame=17;\n${match[0]}\nsyncVisibleViewport();globalThis.pendingFrame=viewportSyncFrame;`,context);
  assert.equal(context.pendingFrame,0,'executing the resize clears its scheduled frame');
  assert.equal(styles.size,2,'sync only updates width and height');
  return [styles.get('--app-width'),styles.get('--app-height')];
}
const cases=[
  {name:'normal portrait',visualViewport:{width:390,height:844,scale:1},expected:['390px','844px']},
  {name:'landscape',visualViewport:{width:844,height:390,scale:1},expected:['844px','390px']},
  {name:'stale landscape auto-fit after rotation',visualViewport:{width:844,height:1826.5025634765625,scale:.4620853066444397},expected:['390px','844px']},
  {name:'page zoom stays separate from layout',visualViewport:{width:312,height:675.2,scale:1.25},expected:['390px','844px']},
  {name:'desktop page zoom',visualViewport:{width:1024,height:576,scale:1.25},expected:['1280px','720px']},
  {name:'legacy viewport without scale',visualViewport:{width:390,height:844},expected:['390px','844px']},
  {name:'no visualViewport',innerWidth:1280,innerHeight:720,expected:['1280px','720px']},
  {name:'document fallback',innerWidth:0,innerHeight:0,clientWidth:768,clientHeight:1024,expected:['768px','1024px']},
];
for(const c of cases)assert.deepEqual(sync(c),c.expected,c.name);
console.log(`Viewport QA: ${cases.length}/${cases.length} passed (real sync function, auto-fit, zoom and fallbacks).`);
