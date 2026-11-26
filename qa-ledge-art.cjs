// Renderer-level ledge regression tests; no browser or native Canvas dependency.
const assert=require('node:assert/strict');
const {api,canvas,color,harness,crop,fingerprint,equalPixels,view}=require('./qa-floor-rhythm.cjs');
const results=[];
function test(name,body){try{body();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.stack});}}
const floor={x:0,y:520,w:4096,h:800,kind:'factory'},wall={x:400,y:100,w:52,h:500,kind:'wall'};
const groundHashes=[],wallHashes=[],backdropHashes=[];
for(let act=0;act<5;act++){
  const h=harness();groundHashes.push(fingerprint(crop(h.draw(floor,act),0,520,1280,190)));
  wallHashes.push(fingerprint(crop(h.draw(wall,act),400,100,52,500)));
  const image=canvas(1280,720),renderer=api.createRenderer(image.getContext(),{canvasFactory:canvas});
  renderer.drawBackground(act,{...view,x:777,stageX:0});backdropHashes.push(fingerprint(image.pixels));
}
if(process.argv.includes('--record-baseline')){console.log(JSON.stringify({groundHashes,wallHashes,backdropHashes}));process.exit(0);}
const baselineGround=['6c30907d','f86b72b9','4a7243e5','9d677429','9288b52d'];
const baselineWall=['7f1f9da5','b22961f5','888f0919','3cfdfe65','ecaa7b99'];
const baselineBackdrop=['e599e37d','b2853845','9d6c09f1','8e5b8049','7e336cd1'];
test('new ledges cannot alter the established ground faces, vertical walls or rear scenery',()=>{
  assert.deepEqual(groundHashes,baselineGround);assert.deepEqual(wallHashes,baselineWall);assert.deepEqual(backdropHashes,baselineBackdrop);
});
for(let act=0;act<5;act++)for(const mobile of[false,true])test(`act ${act+1} ${mobile?'mobile':'desktop'} ledge silhouette stays inside the physical bounds`,()=>{
  const h=harness();
  for(const [width,height]of[[64,16],[72,18],[174,24],[193,25],[320,32],[511,39]]){
    const ledge=Object.freeze({x:173,y:200,w:width,h:height,kind:'roof'}),before=JSON.stringify(ledge);
    const r=h.draw(ledge,act,{mobile});
    assert(r.calls.some(c=>c[0]==='rect'&&c[1]===ledge.x&&c[2]===ledge.y&&c[3]===width&&c[4]===height),'every cap and underside is clipped to the real rectangle');
    const edge=color(api.themes[act].edge);assert(crop(r,ledge.x,ledge.y,width,2).every(p=>p===edge),'two-pixel top tells the player exactly where landing begins');
    assert(crop(r,ledge.x,ledge.y-1,width,1).every(p=>p===0),'no false lip above landing surface');
    assert(crop(r,ledge.x,ledge.y+height,width,1).every(p=>p===0),'no painted supports below the collision shape');
    assert(crop(r,ledge.x-1,ledge.y,1,height).every(p=>p===0));assert(crop(r,ledge.x+width,ledge.y,1,height).every(p=>p===0));
    assert.equal(JSON.stringify(ledge),before);assert(r.calls.length<300,'ledge has a bounded visible draw budget');
  }
});
for(let act=0;act<5;act++)test(`act ${act+1} complete end-caps and a recessed underside distinguish a ledge from a wall strip`,()=>{
  const h=harness(),ledge=Object.freeze({x:173,y:200,w:320,h:32,kind:'roof'}),r=h.draw(ledge,act);
  const left=crop(r,173,205,12,23),middle=crop(r,173+154,205,12,23),right=crop(r,173+308,205,12,23);
  assert.notEqual(fingerprint(left),fingerprint(middle),'left end is authored, not an arbitrary tile crop');
  assert.notEqual(fingerprint(right),fingerprint(middle),'right end is authored, not an arbitrary tile crop');
  const lower=crop(r,173,226,320,6),upper=crop(r,173,202,320,6);
  assert.notEqual(fingerprint(lower),fingerprint(upper),'underside reads differently from the walkable face');
});
for(let act=0;act<5;act++)test(`act ${act+1} ledge paint is deterministic through scrolling and cache churn`,()=>{
  const h=harness(),ledge=Object.freeze({x:400,y:240,w:1400,h:32,kind:'bridge'});
  const first=crop(h.draw(ledge,act),512,240,512,32);
  const shifted=crop(h.draw(ledge,act,{x:256,time:99}),512,240,512,32);
  for(let other=0;other<5;other++)h.draw(floor,other,{x:2304});
  const back=crop(h.draw(ledge,act,{time:250}),512,240,512,32);
  equalPixels(shifted,first,'ledge detail must not scroll inside the physical platform');equalPixels(back,first,'cache eviction cannot change the restored ledge');
});
test('the five acts remain different ledge materials rather than recolors of one strip',()=>{
  const h=harness(),signatures=[];
  for(let act=0;act<5;act++){
    const r=h.draw({x:173,y:200,w:320,h:32,kind:'roof'},act),pixels=crop(r,173,202,320,30),colors=new Map();
    signatures.push(pixels.map(p=>{if(!colors.has(p))colors.set(p,colors.size);return colors.get(p);}).join(','));
  }
  assert.equal(new Set(signatures).size,5,'normalized color IDs still reveal five different material geometries');
});
test('custom odd-width bridges remain one landable span and do not repaint on every frame',()=>{
  const h=harness();
  for(const w of [641,1279,1800]){
    const ledge=Object.freeze({x:100,y:200,w,h:23,kind:'roof'});
    for(const cameraX of [0,Math.max(0,w-760)]){
      const img=h.draw(ledge,3,{x:cameraX});
      const visibleLeft=Math.max(cameraX,100),visibleRight=Math.min(cameraX+img.view.w,100+w);
      assert(crop(img,visibleLeft,200,visibleRight-visibleLeft,2).every(p=>p===color(api.themes[3].edge)));
      const builds=h.renderer.getCacheStats().rasterBuilds;
      h.draw(ledge,3,{x:cameraX,time:44});
      assert.equal(h.renderer.getCacheStats().rasterBuilds,builds);
    }
  }
  assert(h.renderer.getCacheStats().ledgeEntries<=48);
});
test('eligible training ledges use clear landing art without erasing the no-canvas fallback',()=>{
  const h=harness(),ledge=Object.freeze({x:100,y:200,w:240,h:24,kind:'training'});
  const r=h.draw(ledge,0);
  assert(crop(r,100,200,240,2).every(p=>p===color(api.themes[0].edge)));
  assert.equal(h.renderer.drawPlatform({...ledge,w:40},0,view),false,'ineligible training blocks retain their drill renderer');
  const fallback=api.createRenderer(canvas(1280,720).getContext(),{canvasFactory:()=>null});
  assert.equal(fallback.drawPlatform(ledge,0,view),false,'no-canvas training still falls back to the established drill rendering');
});
for(const result of results)console.log(`${result.ok?'PASS':'FAIL'} ${result.name}`);for(const result of results.filter(r=>!r.ok))console.error(result.error);
console.log(`Ledge art QA: ${results.filter(r=>r.ok).length}/${results.length} passed`);process.exitCode=Number(results.some(r=>!r.ok));
