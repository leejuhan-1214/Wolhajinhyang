// Test the real scene painters, including the no-Path2D compatibility path.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('environment-renderer.js','utf8');
const acts=Array.from({length:5},(_,i)=>{const start=n=>4000*n+4*n*(n-1);return {x:start(i*8),end:start((i+1)*8)};});
const view={x:0,y:20,w:1280,h:720,time:12,mobile:false};
function testCommands(usePaths) {
  let saves=0,clips=[],translations=[],draws=[],rects=[],built=0;
  class Shape{constructor(){this.rects=[];built++;}rect(...a){this.rects.push(a);}}
  const mod=usePaths?{Path2D:Shape}:{};
  vm.runInNewContext(source,mod);
  const ctx={save(){saves++;},restore(){saves--;},translate(x,y){translations.push([x,y]);},
    beginPath(){},rect(...a){rects.push(a);},clip(p){clips.push(p||null);},fillRect(){},drawImage(tile){draws.push(tile);}};
  const raster={getContext(){return {fillRect(){}};}};
  const engine=mod.MoonlitEnvironment.createRenderer(ctx,{canvasFactory:()=>raster});
  const paint=x=>{clips=[];translations=[];draws=[];rects=[];
    assert(engine.drawCampaignBackground(acts,{...view,x}));assert.equal(saves,0);};
  paint(acts[0].x+2500);const steady=draws.length;assert.equal(clips.length,0);
  for(const act of acts.slice(1)){
    const edge=act.x;
    for(const x of [edge-1200,edge-640,edge-20,edge+10,edge-640]){
      paint(x);assert.equal(clips.length,1,'two biomes only when the viewport shows the seam');
      assert.deepEqual(translations,[[edge-x,0],[x-edge,0]]);
      assert.equal(draws.length,2*steady);
      if(usePaths){assert(clips[0].rects.length>100);assert.equal(built,1,'stencil must be shared between all frames/acts');}
      else assert.deepEqual(rects[0],[0,0,view.w+32,view.h]);
    }
    paint(edge+100);assert.equal(clips.length,0);assert.equal(draws.length,steady);
  }
  assert(engine.getCacheStats().entries<=32);
}
testCommands(true);testCommands(false);
if(process.env.MOONLIT_CANVAS_MODULE){
  // Optional color-level validation using an installed native Canvas2D.
  const {createCanvas,Path2D}=require(process.env.MOONLIT_CANVAS_MODULE),mod={Path2D};
  vm.runInNewContext(source,mod);
  const make=()=>{const c=createCanvas(view.w,view.h),ctx=c.getContext('2d');return {c,ctx,e:mod.MoonlitEnvironment.createRenderer(ctx,{canvasFactory:createCanvas})};};
  const left=make(),right=make(),split=make(),trace=[];
  for(let i=1;i<5;i++){
    const v={...view,x:acts[i].x-640};
    left.e.drawBackground(i-1,{...v,stageX:acts[i-1].x});
    right.e.drawBackground(i,{...v,stageX:acts[i].x});split.e.drawCampaignBackground(acts,v);
    const sample=(t,x,y,w,h)=>Buffer.from(t.ctx.getImageData(x,y,w,h).data);
    assert.deepEqual(sample(left,0,0,600,720),sample(split,0,0,600,720),'left scene is unchanged');
    assert.deepEqual(sample(right,680,0,600,720),sample(split,680,0,600,720),'right scene is visible before entry');
    const a=sample(left,608,0,64,720),b=sample(right,608,0,64,720),s=sample(split,608,0,64,720);
    let oldPixels=0,newPixels=0;
    for(let p=0;p<s.length;p+=4){const q=s.readUInt32LE(p),l=a.readUInt32LE(p),r=b.readUInt32LE(p);assert(q===l||q===r,'no blurred intermediate pixels');if(l!==r){if(q===l)oldPixels++;else newPixels++;}}
    assert(oldPixels>5000&&newPixels>5000,'the doorway feather actually includes both scenes');
    trace.push([oldPixels,newPixels]);
  }
  console.log('Native campaign seam raster verified:',trace);
}
console.log('All four act boundaries: forward, reverse, stationary, one-scene fast path and shared mask passed.');
