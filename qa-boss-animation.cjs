// Real renderer checks for articulated artillery and exactly anchored warning effects.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync('qa-boss-redesign.cjs','utf8')
  .replace("if(process.argv.includes('--render'))",'if(false)')
  .replace('releaseBossChargedShot};','releaseBossChargedShot,drawEnemyTelegraph,getFurnaceArmPose:typeof getFurnaceArmPose === "function" ? getFurnaceArmPose : null};');
const {q,boss,recorder,setTarget}=new Function('require',source+'\nreturn {q,boss,recorder,setTarget(value){target=value;}};')(require);
const before=process.argv.includes('--before'),results=[];
function test(name,body){try{body();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.stack});}}
function charge(kind,pattern,anim=0){const e=boss(kind);Object.assign(e,{anim,vx:120,bossAction:'chargeShot',bossShotPattern:pattern,bossChargeDuration:1,windup:.35,targetX:1100,targetY:270});return e;}
if(!before){
  test('furnace barrel and surface detail use one shared articulated pose',()=>{
    assert.equal(typeof q.getFurnaceArmPose,'function');
    const e=charge('furnace','furnace-rifle');
    for(const side of[-1,1])for(const anim of[0,.3,.7,1.2]){
      e.anim=anim;const pose=q.getFurnaceArmPose(e,side);
      assert.equal(pose.x,side*20);assert([pose.y,pose.angle].every(Number.isFinite));
      const ctx=recorder();setTarget(ctx);q.drawEnemy(e);
      assert(!ctx.rects.some(r=>r.w===15&&r.h===13&&r.y===31),'old fixed forearm sleeve must not remain under the moving cannon');
    }
  });
  test('furnace rifle warning follows the actual articulated muzzle in both facings',()=>{
    for(const facing of[-1,1])for(const anim of[0,.3,.7,1.2]){
      const e=charge('furnace','furnace-rifle',anim);e.facing=facing;
      const ctx=recorder();setTarget(ctx);q.drawEnemy(e);
      const pose=q.getFurnaceArmPose(e,1),r=5+.65*9;
      const expected={x:e.x+e.w/2+facing*(pose.x+Math.cos(pose.angle)*61-Math.sin(pose.angle)*.5),y:e.y+Math.sin(anim*2.8)*1.25+pose.y+Math.sin(pose.angle)*61+Math.cos(pose.angle)*.5};
      const arcs=ctx.arcs.filter(a=>Math.abs(a.r-r)<1e-8);
      assert.equal(arcs.length,1,'one and only one local muzzle charge ring');
      assert(Math.hypot(arcs[0].center.x-expected.x,arcs[0].center.y-expected.y)<1e-7,'warning follows barrel, not a hard-coded point');
    }
  });
  test('mortar warnings belong to the two back launch tubes, never the rifle muzzle',()=>{
    const e=charge('furnace','furnace-mortar',.5),ctx=recorder();setTarget(ctx);q.drawEnemy(e);
    const tubeR=4+.65*6,rifleR=5+.65*9;
    assert.equal(ctx.arcs.filter(a=>Math.abs(a.r-tubeR)<1e-8).length,2);
    assert.equal(ctx.arcs.filter(a=>Math.abs(a.r-rifleR)<1e-8).length,0);
  });
  test('furnace and hunter no longer get a second world-space fake muzzle ring',()=>{
    for(const [kind,pattern]of[['furnace','furnace-rifle'],['furnace','furnace-mortar'],['hunter','hunter-rifle']]){
      const e=charge(kind,pattern),ctx=recorder();setTarget(ctx);q.drawEnemyTelegraph(e);
      assert.equal(ctx.arcs.length,0,'local weapon renderer owns the warning light');
      const origin=ctx.calls.find(c=>c[0]==='moveTo');
      assert(origin);assert.equal(origin[1],e.x+e.w/2);
      assert.equal(origin[2],e.y+(pattern==='furnace-mortar'?12:e.h*.38),'aim guide preserves actual projectile source');
    }
  });
  test('hovering body keeps wisps above the collision floor without changing physics',()=>{
    const e=boss('furnace'),original=structuredClone(e);
    for(let time=0;time<5;time+=.04){e.anim=time;q.game.time=time;const bob=Math.sin(time*2.8)*1.25;for(const tip of q.getFurnaceWispPose(e,time))assert(tip.tipY+bob<e.h);setTarget(recorder());q.drawEnemy(e);}
    e.anim=original.anim;assert.deepEqual(e,original);
  });
}
if(process.argv.includes('--render')||before){
  const {createCanvas}=require('@napi-rs/canvas'),canvas=createCanvas(1600,960),ctx=canvas.getContext('2d');setTarget(ctx);
  ctx.fillStyle='#07121b';ctx.fillRect(0,0,1600,960);ctx.font='bold 25px sans-serif';ctx.fillStyle='#e1ecf1';ctx.fillText(before?'BEFORE · artillery / shield motion':'AFTER · single attached weapon warning',22,34);
  const cases=[['furnace','',0],['furnace','',.55],['furnace','furnace-rifle',0],['furnace','furnace-rifle',.45],['furnace','furnace-rifle',.9],['furnace','furnace-rifle',1.3],['furnace','furnace-mortar',0],['furnace','furnace-mortar',.65],['hunter','hunter-rifle',0],['hunter','hunter-rifle',.6],['hunter','',0],['hunter','',.6]];
  cases.forEach(([kind,pattern,anim],i)=>{
    const e=pattern?charge(kind,pattern,anim):boss(kind);e.anim=anim;q.game.time=anim;e.targetX=e.x+e.w/2+260;e.targetY=e.y+e.h*.38;
    if(i===5||i===9)e.facing=-1;if(i===10){e.reflectBreakTimer=1.9;e.reflectTimer=0;}if(i===11){e.reflectBreakTimer=1.4;e.reflectTimer=0;}
    const x=i%4*400,y=50+Math.floor(i/4)*300;
    ctx.fillStyle='#102430';ctx.fillRect(x+8,y,384,286);ctx.fillStyle='#bfd5df';ctx.font='bold 15px sans-serif';ctx.fillText(`${kind.toUpperCase()} · ${pattern.replace(kind+'-','')||'hover/shield'} · ${anim}`,x+18,y+24);
    ctx.save();ctx.beginPath();ctx.rect(x+9,y+30,382,255);ctx.clip();ctx.translate(x+195,y+62);ctx.scale(1.8,1.8);ctx.translate(-e.x-e.w/2,-e.y);
    ctx.strokeStyle='#34505c';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(e.x-90,e.y+e.h);ctx.lineTo(e.x+e.w+90,e.y+e.h);ctx.stroke();q.drawEnemy(e);ctx.restore();
  });
  const out=path.resolve('..','..','outputs','v3.11.1-review',before?'boss-animation-before.png':'boss-animation-after.png');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,canvas.toBuffer('image/png'));console.log('RENDER '+out);
}
for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}`);for(const r of results.filter(r=>!r.ok))console.error(r.error);
console.log(`Boss animation QA: ${results.filter(r=>r.ok).length}/${results.length} passed`);process.exitCode=process.exitCode||Number(results.some(r=>!r.ok));
