// Local, read-only sparring playback. No input injection, physics or combat entities.
(() => {
  "use strict";
  const CAP=1536, STRIDE=18, TICK=1/16, TAU=Math.PI*2;
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const wrap=x=>(x%TAU+TAU)%TAU;
  const oct=x=>Math.round(clamp(Number(x)||0,0,1)*255);
  const aim=(x,y)=>Math.round(wrap(Math.atan2(y||0,x||0))/TAU*255);
  const read=k=>{try{return globalThis.localStorage?.getItem(k);}catch{return null;}};
  const write=(k,v)=>{try{globalThis.localStorage?.setItem(k,v);}catch{/* Session copy still works without browser storage. */}};
  const cache=new Map(), prefix="moonlit-echo-ghost-v1:", pref=prefix+"visible";
  let visible=read(pref)!=="off", attempt=null, reference=null, layer=null, painter=null;
  const actor={}, clock={stage:0,time:0};
  function sample(t,p,origin) {
    const attack=p.attackTimer>0, shot=p.recoilTimer>0;
    return [Math.max(0,Math.round(t*1000)),clamp(Math.round(p.x-origin),-32768,32767),clamp(Math.round(p.y),-32768,32767),
      clamp(Math.round((p.vx||0)/8),-128,127),clamp(Math.round((p.vy||0)/12),-128,127),
      (p.facing<0?1:0)|(p.grounded?2:0)|(p.wallLeft?4:0)|(p.wallRight?8:0)|(attack?16:0)|(shot?32:0)|(p.crossShotTimer>0?64:0)|(p.slashComboActive?128:0),
      oct(wrap(p.runCycle||0)/TAU),attack?oct(1-p.attackTimer/Math.max(.001,p.attackDuration)):0,
      shot?oct(1-p.recoilTimer/.3):0,aim(p.attackDir?.x,p.attackDir?.y),aim(p.shotAimX,p.shotAimY),
      clamp(p.slashComboIndex||0,0,3),oct((p.squash||0)/2+.5)];
  }
  function encode(frames) {
    const bytes=new Uint8Array(frames.length*STRIDE), view=new DataView(bytes.buffer);
    frames.forEach((f,i)=>{const o=i*STRIDE;view.setUint32(o,f[0],true);view.setInt16(o+4,f[1],true);view.setInt16(o+6,f[2],true);
      view.setInt8(o+8,f[3]);view.setInt8(o+9,f[4]);for(let k=5;k<13;k++)bytes[o+5+k]=f[k];});
    return btoa(String.fromCharCode(...bytes));
  }
  function decode(s) {
    if(typeof s!=="string"||s.length<STRIDE*2||s.length>CAP*STRIDE*4/3+8)return null;
    const raw=atob(s);if(raw.length%STRIDE || raw.length<2*STRIDE)return null;
    const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),view=new DataView(bytes.buffer),frames=[];
    for(let o=0;o<bytes.length;o+=STRIDE){
      const f=[view.getUint32(o,true),view.getInt16(o+4,true),view.getInt16(o+6,true),view.getInt8(o+8),view.getInt8(o+9),...bytes.slice(o+10,o+18)];
      if((!frames.length&&f[0]!==0)||(frames.length&&f[0]<=frames.at(-1)[0]))return null;frames.push(f);
    }
    return frames;
  }
  function record(key) {
    if(cache.has(key))return cache.get(key);
    try {
      const data=JSON.parse(read(prefix+key)||"null"), frames=data?.v===1&&decode(data.path);
      if(frames && Number.isFinite(data.time) && data.time>0 && Math.abs(frames.at(-1)[0]-data.time*1000)<2){
        const track={frames,time:data.time};cache.set(key,track);return track;
      }
    } catch { /* A damaged ghost never affects the record book or campaign. */ }
    return null;
  }
  function clear(){attempt=null;reference=null;}
  function begin(key,origin,player,racing) {
    clear();attempt={key,origin,spacing:TICK,frames:[sample(0,player,origin)]};
    reference=racing?record(key):null;
  }
  function capture(t,p,force=false) {
    if(!attempt||!Number.isFinite(t)||t<0||t>4294966)return;
    const a=attempt,f=a.frames,last=f.at(-1)[0],ms=Math.round(t*1000);
    if(ms<last||(!force&&ms-last+1<a.spacing*1000))return;
    if(ms===last){if(force)f[f.length-1]=sample(t,p,a.origin);return;}
    if(f.length>=CAP){a.frames=f.filter((_,i)=>i%2===0);a.spacing*=2;}
    a.frames.push(sample(t,p,a.origin));
  }
  function finish(key,t,player) {
    if(!attempt||attempt.key!==key)return;
    capture(t,player,true);
    const prior=record(key),frames=attempt.frames;
    if(frames.length>=2&&Number.isFinite(t)&&t>0&&(!prior||t<prior.time)){
      const track={frames,time:t};cache.set(key,track);
      write(prefix+key,JSON.stringify({v:1,time:t,path:encode(frames)}));
    }
    clear();
  }
  function frameAt(t) {
    if(!visible||!attempt||!reference||!Number.isFinite(t)||t<0||t>reference.time)return null;
    const ms=t*1000,f=reference.frames;let lo=0,hi=f.length-1;
    while(lo+1<hi){const m=(lo+hi)>>1;if(f[m][0]<=ms)lo=m;else hi=m;}
    const a=f[lo],b=f[hi],u=clamp((ms-a[0])/Math.max(1,b[0]-a[0]),0,1),p=u<.5?a:b;
    const flags=p[5],lerp=(x,y)=>x+(y-x)*u;
    const lerpCycle=(x,y)=>x+(((y-x+384)%256)-128)*u;
    const attackAngle=p[9]/255*TAU,shotAngle=p[10]/255*TAU;
    return {x:attempt.origin+lerp(a[1],b[1]),y:lerp(a[2],b[2]),vx:lerp(a[3],b[3])*8,vy:lerp(a[4],b[4])*12,
      facing:flags&1?-1:1,grounded:!!(flags&2),wallLeft:!!(flags&4),wallRight:!!(flags&8),runCycle:lerpCycle(a[6],b[6])/255*TAU,
      attackDuration:1,attackTimer:flags&16?Math.max(.001,1-p[7]/255):0,recoilTimer:flags&32?.3*Math.max(.001,1-p[8]/255):0,
      crossShotTimer:flags&64?.2:0,attackDir:{x:Math.cos(attackAngle),y:Math.sin(attackAngle)},shotAimX:Math.cos(shotAngle),shotAimY:Math.sin(shotAngle),
      slashComboActive:!!(flags&128),slashComboIndex:p[11],squash:p[12]/255*2-1};
  }
  function draw(ctx,t,player,stage,cameraX,width) {
    const p=frameAt(t);if(!p||p.x<cameraX-130||p.x>cameraX+width+130)return;
    if(!painter){
      layer=document.createElement("canvas");layer.width=256;layer.height=240;
      const c=layer.getContext?.("2d");if(!c)return;
      painter={c,draw:globalThis.MoonlitOperative.createRenderer(c,actor,clock)};
    }
    Object.assign(actor,p,{w:player.w,h:player.h});clock.stage=stage;clock.time=t;
    const {c}=painter;c.clearRect(0,0,256,240);painter.draw(108,100,p.facing,1,false,"player",false);
    c.save();c.globalCompositeOperation="source-in";c.fillStyle="#91edff";c.fillRect(0,0,256,240);c.restore();
    ctx.save();ctx.globalAlpha=.37;ctx.drawImage(layer,Math.round(p.x-108),Math.round(p.y-100));
    ctx.globalAlpha=.87;ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.fillStyle="#bceeff";ctx.strokeStyle="#101f30";ctx.lineWidth=3;
    ctx.strokeText("내 기록",p.x+player.w/2,p.y-14);ctx.fillText("내 기록",p.x+player.w/2,p.y-14);ctx.restore();
  }
  globalThis.MoonlitDuelGhost=Object.freeze({begin,capture,finish,clear,draw,frameAt,
    get enabled(){return visible;},get referenceTime(){return reference?.time??null;},
    setEnabled(on){visible=!!on;write(pref,visible?"on":"off");}});
})();
