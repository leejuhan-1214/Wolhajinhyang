// Exercise real paint/raster calls without a native Canvas dependency.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sandbox={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('environment-renderer.js','utf8'),sandbox);
const api=sandbox.module.exports;
function color(value){
  if(/^#[0-9a-f]{3}$/i.test(value))value='#'+value.slice(1).split('').map(c=>c+c).join('');
  if(/^#[0-9a-f]{6}$/i.test(value))return (0xff000000|parseInt(value.slice(1),16))>>>0;
  if(/^#[0-9a-f]{8}$/i.test(value))return ((parseInt(value.slice(7),16)<<24)|parseInt(value.slice(1,7),16))>>>0;
  if(value==='transparent')return 0;
  const rgba=String(value).match(/^rgba?\(([^)]+)\)$/);
  if(rgba){const c=rgba[1].split(',').map(Number);return ((Math.round((c[3]??1)*255)<<24)|(c[0]<<16)|(c[1]<<8)|c[2])>>>0;}
  throw Error('Unsupported paint color: '+value);
}
function canvas(width,height){
  const image={width,height,pixels:new Uint32Array(width*height)},calls=[],stack=[];
  let state={fillStyle:'#000000',globalAlpha:1,tx:0,ty:0,sx:1,sy:1,clipRect:[0,0,width,height]},path=[];
  function box(x,y,w,h){const a=state.tx+x*state.sx,b=state.ty+y*state.sy;return [Math.min(a,a+w*state.sx),Math.min(b,b+h*state.sy),Math.max(a,a+w*state.sx),Math.max(b,b+h*state.sy)];}
  function paint(bounds,pixel){
    const [l,t,r,b]=bounds,c=state.clipRect;
    for(let yy=Math.max(0,Math.ceil(t),Math.ceil(c[1]));yy<Math.min(height,Math.ceil(b),Math.ceil(c[3]));yy++)
      for(let xx=Math.max(0,Math.ceil(l),Math.ceil(c[0]));xx<Math.min(width,Math.ceil(r),Math.ceil(c[2]));xx++)image.pixels[yy*width+xx]=typeof pixel==='function'?pixel(xx,yy):pixel;
  }
  const methods={
    save(){stack.push({...state,clipRect:[...state.clipRect]});},restore(){assert(stack.length,'balanced Canvas saves');state=stack.pop();},
    translate(x,y){state.tx+=x*state.sx;state.ty+=y*state.sy;},scale(x,y){state.sx*=x;state.sy*=y;},
    beginPath(){path=[];},rect(x,y,w,h){path.push(box(x,y,w,h));},
    clip(){assert.equal(path.length,1,'surface clip uses its one real rectangle');const p=path[0],c=state.clipRect;state.clipRect=[Math.max(c[0],p[0]),Math.max(c[1],p[1]),Math.min(c[2],p[2]),Math.min(c[3],p[3])];},
    fillRect(x,y,w,h){paint(box(x,y,w,h),color(state.fillStyle));},
    clearRect(x,y,w,h){paint(box(x,y,w,h),0);},
    drawImage(source,...args){
      let sx=0,sy=0,sw=source.width,sh=source.height,dx,dy,dw,dh;
      if(args.length===2)[dx,dy]=args,dw=sw,dh=sh;
      else if(args.length===4)[dx,dy,dw,dh]=args;
      else if(args.length===8)[sx,sy,sw,sh,dx,dy,dw,dh]=args;
      else throw Error('Unsupported drawImage arity');
      assert(source.pixels,'painted raster has actual pixels');
      paint(box(dx,dy,dw,dh),(x,y)=>{
        const px=Math.min(source.width-1,Math.max(0,Math.floor(sx+(((x+.5-state.tx)/state.sx-dx)/dw)*sw)));
        const py=Math.min(source.height-1,Math.max(0,Math.floor(sy+(((y+.5-state.ty)/state.sy-dy)/dh)*sh)));
        return source.pixels[py*source.width+px];
      });
    },
  };
  const ctx=new Proxy({}, {get(_,key){if(key in state)return state[key];if(key==='canvas')return image;if(key==='calls')return calls;if(key==='balanced')return()=>!stack.length;
    if(key in methods)return(...args)=>{for(const n of args)if(typeof n==='number')assert(Number.isFinite(n),key+' finite argument');calls.push([key,...args]);return methods[key](...args);};
    throw Error('Unsupported surface Canvas operation: '+String(key));},set(_,key,value){state[key]=value;return true;}});
  image.getContext=()=>ctx;return image;
}
const factory=(w,h)=>canvas(w,h),view={x:0,y:0,w:1280,h:720,time:3,mobile:false,worldBottom:1320};
function harness(){let image=canvas(view.w,view.h);const proxy=new Proxy({}, {get(_,key){const value=image.getContext()[key];return typeof value==='function'?value.bind(image.getContext()):value;},set(_,key,value){image.getContext()[key]=value;return true;}});const renderer=api.createRenderer(proxy,{canvasFactory:factory});
  return {renderer,draw(platform,act,changes={}){const v={...view,...changes};image=canvas(v.w,v.h);const ctx=image.getContext();ctx.translate(-v.x,-v.y);for(const surface of Array.isArray(platform)?platform:[platform])assert(renderer.drawPlatform(surface,act,v));assert(ctx.balanced());return {image,calls:ctx.calls,view:v};}};
}
function crop(result,x,y,w,h){const out=[];for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)out.push(result.image.pixels[(yy-result.view.y)*result.image.width+xx-result.view.x]);return out;}
function fingerprint(data){let hash=2166136261;for(const pixel of data){hash^=pixel;hash=Math.imul(hash,16777619);}return (hash>>>0).toString(16);}
function equalPixels(actual,expected,message){assert.equal(actual.length,expected.length,message);let changed=0;for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i])changed++;assert.equal(changed,0,message);}
const floating=Object.freeze({x:100,y:200,w:240,h:24,kind:'roof'});
const wall=Object.freeze({x:400,y:100,w:52,h:500,kind:'wall'});
const smallHashes=[],wallHashes=[];
for(let act=0;act<5;act++){const h=harness();smallHashes.push(fingerprint(crop(h.draw(floating,act),100,200,240,24)));wallHashes.push(fingerprint(crop(h.draw(wall,act),400,100,52,500)));}
if(process.argv.includes('--record-baseline')){console.log(JSON.stringify({smallHashes,wallHashes}));process.exit(0);}
const results=[];
function test(name,run){try{run();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.stack});}}
const baselineSmall=['47a2a8b9','96359e7d','39b6d7a5','8b6e4011','dcfca811'];
const baselineWall=['7f1f9da5','b22961f5','888f0919','3cfdfe65','ecaa7b99'];
test('floating ledges and narrow vertical walls retain their previous pixels',()=>{assert.deepEqual(smallHashes,baselineSmall);assert.deepEqual(wallHashes,baselineWall);});
for(let act=0;act<5;act++)for(const mobile of[false,true]){
  test(`act ${act+1} ${mobile?'mobile':'desktop'} long floor breaks the old 384px repeat`,()=>{
    const h=harness(),floor=Object.freeze({x:0,y:520,w:6144,h:800,kind:'factory'}),before=JSON.stringify(floor),bands=[];
    for(let index=0;index<8;index++){
      const x=index*384,result=h.draw(floor,act,{x,mobile});
      assert(result.calls.some(c=>c[0]==='rect'&&c[1]===floor.x&&c[2]===floor.y&&c[3]===floor.w&&c[4]===floor.h),'exact collision bounds clip every painted ornament');
      assert(result.calls.length<350,'visible drawing work stays bounded');
      const band=crop(result,x,530,384,160);bands.push(band);
      const edge=color(api.themes[act].edge);
      assert(crop(result,x,520,384,2).every(p=>p===edge),'the uninterrupted two-pixel walkable edge is retained');
      assert(crop(result,x,510,384,10).every(p=>p===0),'floor artwork cannot create a false foothold above collision');
    }
    assert(new Set(bands.map(fingerprint)).size>=4,'eight long-floor sections need at least four distinct painted arrangements, not the old three-tile loop');
    const difference=bands[0].filter((p,i)=>p!==bands[1][i]).length/bands[0].length;
    assert(difference>.04,'neighboring macro sections visibly differ beyond a handful of noise pixels');
    assert.equal(JSON.stringify(floor),before,'drawing cannot mutate collision geometry');
    assert(h.renderer.getCacheStats().entries<=32,'floor variety must respect the existing raster cache budget');
  });
  test(`act ${act+1} ${mobile?'mobile':'desktop'} scrolling and backtracking preserve world paint`,()=>{
    const h=harness(),floor=Object.freeze({x:0,y:520,w:6144,h:800,kind:'factory'});
    const first=crop(h.draw(floor,act,{mobile}),512,530,512,160);
    const scroll=crop(h.draw(floor,act,{x:256,time:21,mobile}),512,530,512,160);
    for(let other=0;other<5;other++)h.draw(floor,other,{x:4000,time:44,mobile});
    const back=crop(h.draw(floor,act,{time:90,mobile}),512,530,512,160);
    equalPixels(scroll,first,'overlap must not change with camera position or elapsed time');
    equalPixels(back,first,'returning after cache churn must reconstruct the same ground');
  });
}
test('irregularly split neighboring floors stay painted inside their exact seams',()=>{
  const h=harness();for(const floor of[{x:13,y:520,w:513,h:800,kind:'ground'},{x:526,y:520,w:699,h:800,kind:'ground'}]){
    const result=h.draw(Object.freeze(floor),0);
    assert(crop(result,floor.x,520,floor.w,2).every(p=>p===color(api.themes[0].edge)));
    assert(crop(result,floor.x-1,530,1,160).every(p=>p===0));assert(crop(result,floor.x+floor.w,530,1,160).every(p=>p===0));
  }
});
test('absolute world-x rhythm continues across narrow foundation extensions',()=>{
  for(let act=0;act<5;act++){
    const h=harness(),whole=Object.freeze({x:0,y:520,w:2048,h:800,kind:'factory'});
    const fragments=[{x:0,w:513},{x:513,w:8},{x:521,w:1527}].map(part=>Object.freeze({...whole,...part}));
    const expected=crop(h.draw(whole,act),0,520,1280,190);
    const actual=crop(h.draw(fragments,act),0,520,1280,190);
    equalPixels(actual,expected,'platform object boundaries must not restart the ground pattern or add false seams');
  }
});
test('training base receives floor treatment while suspended training steps keep their fallback',()=>{
  const h=harness(),floor=Object.freeze({x:0,y:520,w:2048,h:800,kind:'training'});
  const expected=h.draw({...floor,kind:'factory'},0),actual=h.draw(floor,0);
  let tickPixels=0,otherChanges=0;
  for(let i=0;i<actual.image.pixels.length;i++)if(actual.image.pixels[i]!==expected.image.pixels[i]){
    const y=Math.floor(i/actual.image.width);
    if(y===floor.y+8||y===floor.y+9)tickPixels++;else otherChanges++;
  }
  assert(tickPixels>0&&tickPixels<256,'training adds only small engraved ticks below the collision edge');
  assert.equal(otherChanges,0,'only the two-pixel training indicator row may differ from normal foundation');
  assert.equal(h.renderer.drawPlatform({x:0,y:300,w:200,h:24,kind:'training'},0,view),false);
});
test('world-bottom eligibility never repaints vertical walls or thin floating ledges',()=>{
  const h=harness();
  for(let act=0;act<5;act++)for(const surface of[wall,floating]){
    const normal=h.draw(surface,act),atBottom=h.draw(surface,act,{worldBottom:surface.y+surface.h});
    equalPixels(normal.image.pixels,atBottom.image.pixels,'walls and thin ledges keep their old pixels even at the supplied world boundary');
  }
});
for(const result of results)console.log(`${result.ok?'PASS':'FAIL'} ${result.name}`);for(const result of results.filter(r=>!r.ok))console.error(result.error);
console.log(`Floor rhythm QA: ${results.filter(r=>r.ok).length}/${results.length} passed`);process.exitCode=Number(results.some(r=>!r.ok));
