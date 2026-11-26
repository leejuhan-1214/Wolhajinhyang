// The shipped painter must rasterize on an integer grid, reuse images and never mutate geometry.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),vm=require('node:vm');
const sandbox={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('environment-renderer.js','utf8'),sandbox);
const api=sandbox.MoonlitEnvironment;
const digest=commands=>crypto.createHash('sha256').update(JSON.stringify(commands)).digest('hex');
function recording(){
  const commands=[],stack=[];let styles={fillStyle:'#000000',globalAlpha:1,imageSmoothingEnabled:true};
  return {commands,context:new Proxy({}, {
    get(_,name){if(name in styles)return styles[name];return(...args)=>{
      if(name==='save')stack.push({...styles});
      if(name==='restore'){assert(stack.length);styles=stack.pop();}
      commands.push([name,...args.map(arg=>arg?.tag||arg),styles.fillStyle,styles.globalAlpha,styles.imageSmoothingEnabled]);
    };},set(_,name,value){styles[name]=value;return true;}})};
}
const rasters=[];
function canvasFactory(w,h){
  const record=recording(),canvas={tag:`raster-${rasters.length}`,width:w,height:h,getContext:()=>record.context};
  rasters.push({...record,canvas});return canvas;
}
const record=recording(),renderer=api.createRenderer(record.context,{canvasFactory});
const view={x:1270,y:43,w:1280,h:720,time:9,stageX:0,zoneIndex:0,mobile:false};
const identities=[];let maxFrameDraws=0;
for(let act=0;act<5;act++){
  const firstRaster=rasters.length;record.commands.length=0;
  assert.equal(renderer.drawBackground(act,view),true);
  const first=record.commands.slice(),builds=renderer.getCacheStats().rasterBuilds;
  identities.push(digest(rasters.slice(firstRaster).flatMap(r=>r.commands)));
  record.commands.length=0;renderer.drawBackground(act,view);
  assert.equal(renderer.getCacheStats().rasterBuilds,builds,'same frame must reuse all baked art');
  assert.deepEqual(record.commands,first,'repeat draws are deterministic');
  record.commands.length=0;renderer.drawBackground(act,{...view,zoneIndex:7});
  assert.deepEqual(record.commands,first,'zone boundary must not reseed the physical scenery');
  maxFrameDraws=Math.max(maxFrameDraws,record.commands.length);
  const platform=Object.freeze({x:32,y:450,w:1100,h:430,kind:'factory'}),before=JSON.stringify(platform);
  renderer.drawPlatform(platform,act,view);assert.equal(JSON.stringify(platform),before);
  // Force visible tall and thin collision shapes, not merely offscreen early exits.
  for(const shape of [{x:1300,y:450,w:1100,h:430},{x:1450,y:180,w:220,h:22}]){
    const frozen=Object.freeze({...shape,kind:'roof'});record.commands.length=0;
    renderer.drawPlatform(frozen,act,view);
    assert(record.commands.some(c=>c[0]==='rect'&&c[1]===shape.x&&c[2]===shape.y&&c[3]===shape.w&&c[4]===shape.h),'exact physical rectangle clips all pixels');
    assert(record.commands.some(c=>c[0]==='fillRect'&&c[2]===shape.y&&c[4]===2&&c[5]===api.themes[act].edge),'visible top is exactly the actual collision edge');
  }
  renderer.drawArena(Object.freeze({x:0,end:5000}),act,{...view,floorY:680});
}
assert.equal(new Set(identities).size,5,'five actual artworks differ, not only a title');
assert(maxFrameDraws<48,'steady background submission has a small fixed draw budget');
for(const raster of rasters){
  assert(raster.commands.length>20,'cache cannot hide an empty placeholder');
  assert(raster.commands.every(c=>c[0]==='fillRect'),'raster art uses real pixel plotting only, no antialiased paths');
  for(const command of raster.commands){
    for(const value of command.slice(1,5))assert(Number.isInteger(value),'every cached pixel sits on the integer grid');
    assert(command[3]>0&&command[4]>0);
  }
}
const differentLocations=[];
for(let i=0;i<18;i++){record.commands.length=0;renderer.drawBackground(0,{...view,x:i*4700});differentLocations.push(digest(record.commands));}
assert(new Set(differentLocations).size>15,'long scenes retain different compositions');
assert(renderer.getCacheStats().entries<=32,'bounded LRU prevents world-travel memory growth');
const noCanvas=api.createRenderer(record.context,{canvasFactory:()=>null});
assert.equal(noCanvas.drawBackground(0,view),false,'legacy/no-canvas harnesses retain the old background fallback');
console.log(JSON.stringify({pixelEnvironment:'passed',acts:5,pixelRasters:rasters.length,maxFrameDraws,cacheLimit:32,stableAcrossZones:true}));
