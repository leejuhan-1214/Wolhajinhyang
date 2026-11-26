// Art regressions use real game drawing; native Canvas is optional for preview.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
new Function('require',fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0])(require);
global.setTimeout=()=>1;global.clearTimeout=()=>{};
function recorder(){
  let matrix=[1,0,0,1,0,0],stack=[];const rects=[],calls=[];
  const multiply=([a,b,c,d,e,f])=>{const m=matrix;matrix=[m[0]*a+m[2]*b,m[1]*a+m[3]*b,m[0]*c+m[2]*d,m[1]*c+m[3]*d,m[0]*e+m[2]*f+m[4],m[1]*e+m[3]*f+m[5]];};
  const point=(x,y)=>({x:matrix[0]*x+matrix[2]*y+matrix[4],y:matrix[1]*x+matrix[3]*y+matrix[5]});
  const methods={rects,calls,save(){stack.push([...matrix]);},restore(){matrix=stack.pop()||[1,0,0,1,0,0];},translate(x,y){multiply([1,0,0,1,x,y]);},scale(x,y){multiply([x,0,0,y,0,0]);},rotate(a){multiply([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);},
    setTransform(a,b,c,d,e,f){matrix=[a,b,c,d,e,f];},measureText(s){return{width:String(s).length*8};},createLinearGradient(){return{addColorStop(){}};},createRadialGradient(){return{addColorStop(){}};}};
  for(const name of ['fillRect','strokeRect'])methods[name]=function(x,y,w,h){rects.push({name,x,y,w,h,center:point(x+w/2,y+h/2)});calls.push([name,x,y,w,h]);};
  return new Proxy(methods,{get(t,key){if(key in t)return t[key];return(...args)=>calls.push([key,...args]);},set(t,key,value){t[key]=value;return true;}});
}
let target=recorder();
const proxy=new Proxy({}, {get(_,key){const value=target[key];return typeof value==='function'?value.bind(target):value;},set(_,key,value){target[key]=value;return true;}});
document.getElementById('game').getContext=()=>proxy;
for(const file of ['operative-renderer.js','story-data.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const hook=`window.__BOSS_ART_QA__={game,player,enemies,bullets,drawEnemy,drawFurnaceGhostLower,drawHunterRedesign,getFurnaceWispPose,getHunterShieldPose,getBossWeakParts,releaseBossChargedShot};`;
vm.runInThisContext(fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/,hook+'\n})();'),{filename:'game-boss-art-test.js'});
const q=window.__BOSS_ART_QA__,templates=structuredClone(q.enemies),results=[];
function boss(kind){const e=structuredClone(templates.find(e=>e.type==='boss'&&e.bossKind===kind));assert(e);Object.assign(e,{x:300,y:200,originX:300,spawnX:300,alive:true,facing:1,vx:0,vy:0,hurt:0,anim:0,combatStarted:true,windup:0,bossAction:null,reflectBreakTimer:0,reflectTimer:1,hunterClaspBroken:false});q.game.time=0;return e;}
function test(name,body){try{target=recorder();body();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.stack});}}
test('furnace ghost uses three tapered animated wisps above the collision floor',()=>{
  const e=boss('furnace'),a=q.getFurnaceWispPose(e,0),b=q.getFurnaceWispPose(e,.65);assert.equal(a.length,3);assert.notDeepEqual(a,b);
  for(let time=0;time<5;time+=.1)for(const w of q.getFurnaceWispPose(e,time))assert(w.tipY<e.h&&w.tipY>70);
});
test('ghost lower drawing emits curved wisps and no mechanical leg primitives',()=>{
  q.drawFurnaceGhostLower(boss('furnace'));assert(target.calls.filter(c=>c[0]==='bezierCurveTo').length>=8);
  assert(!target.calls.some(c=>c[0]==='arc'),'no knee hubs');assert(target.rects.every(r=>r.w<=2&&r.h<=2),'only small embers, no boot rectangles');
  const source=fs.readFileSync('game.js','utf8'),start=source.indexOf('// The artillery shell hovers');assert(start>=0);assert(!source.slice(start,source.indexOf('} else if (rawBossKind === "oracle")',start)).includes('limb('));
});
for(const kind of ['furnace','hunter'])test(`${kind} art does not mutate combat, collision or persistent state`,()=>{
  const e=boss(kind),before=structuredClone(e);for(let frame=0;frame<8;frame++){q.game.time=frame*.17;q.drawEnemy(e);}assert.deepEqual(e,before);
});
for(const facing of [-1,1])for(const moving of [false,true])test(`hunter visible clasp and real hitbox share center facing ${facing}, moving ${moving}`,()=>{
  const e=boss('hunter');Object.assign(e,{facing,reflectBreakTimer:1.4,reflectTimer:0,vx:moving?130:0,x:moving?307:300,bossAction:moving?'chargeShot':null,windup:moving?.4:0,bossChargeDuration:1});
  const part=q.getBossWeakParts(e)[0];assert(part);q.drawEnemy(e);
  const marker=target.rects.find(r=>r.name==='strokeRect'&&r.w===12&&r.h===14);assert(marker,'physical rear clasp marker must be drawn');
  assert(Math.hypot(marker.center.x-part.x-part.w/2,marker.center.y-part.y-part.h/2)<1e-7);
});
test('front shield has no exposed clasp, broken clasp keeps a grey rear marker',()=>{
  const e=boss('hunter');q.drawEnemy(e);assert(!target.rects.some(r=>r.name==='strokeRect'&&r.w===12&&r.h===14));
  target=recorder();Object.assign(e,{reflectBreakTimer:0,reflectTimer:0,hunterClaspBroken:true});q.drawEnemy(e);assert.equal(q.getBossWeakParts(e).length,0);assert(target.rects.some(r=>r.name==='strokeRect'&&r.w===12&&r.h===14));
});
test('furnace artillery and hunter gun patterns retain native projectile behavior',()=>{
  for(const [kind,pattern] of [['furnace','furnace-mortar'],['furnace','furnace-rifle'],['hunter','hunter-shotgun'],['hunter','hunter-rifle']]){
    const e=boss(kind);q.bullets.length=0;e.bossShotPattern=pattern;e.targetX=e.x+500;e.targetY=e.y+70;q.releaseBossChargedShot(e);assert(q.bullets.length>0,pattern);
  }
});
if(process.argv.includes('--render')){
  const {createCanvas}=require('@napi-rs/canvas'),canvas=createCanvas(1600,820);target=canvas.getContext('2d');
  target.fillStyle='#07121b';target.fillRect(0,0,1600,820);target.fillStyle='#dceaf0';target.font='bold 26px sans-serif';target.fillText('FURNACE / HUNTER — actual in-game redesign',25,37);
  const labels=['FURNACE · HOVER','FURNACE · DRIFT','FURNACE · ARTILLERY','FURNACE · REVERSE','HUNTER · FRONT SHIELD','HUNTER · REAR CLASP','HUNTER · CLASP BROKEN','HUNTER · AIM'];
  for(let i=0;i<8;i++){
    const kind=i<4?'furnace':'hunter',e=boss(kind),x=(i%4)*400,y=58+Math.floor(i/4)*380;
    q.game.time=i*.47;if(i===1){e.vx=120;e.x+=14;}if(i===3)e.facing=-1;
    if(i===2||i===7){e.bossAction='chargeShot';e.bossShotPattern=kind==='furnace'?'furnace-mortar':'hunter-rifle';e.bossChargeDuration=1;e.windup=.45;}
    if(i===5||i===6){e.reflectBreakTimer=1.4;e.reflectTimer=0;}if(i===6)e.hunterClaspBroken=true;
    target.fillStyle='#102430';target.fillRect(x+10,y,380,365);target.font='bold 16px sans-serif';target.fillStyle='#b9d1da';target.fillText(labels[i],x+24,y+28);
    target.save();target.beginPath();target.rect(x+10,y+35,380,329);target.clip();target.translate(x+190,y+94);target.scale(2.15,2.15);target.translate(-e.x-e.w/2,-e.y);
    target.strokeStyle='#27424d';target.lineWidth=.7;target.beginPath();target.moveTo(e.x-90,e.y+e.h);target.lineTo(e.x+e.w+90,e.y+e.h);target.stroke();q.drawEnemy(e);target.restore();
  }
  const out=path.resolve('..','..','outputs','v3.11.0-review','boss-redesign.png');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,canvas.toBuffer('image/png'));console.log('RENDER '+out);
}
const failed=results.filter(r=>!r.ok);for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} ${r.name}`);for(const r of failed)console.error(r.error);
console.log(`Boss redesign QA: ${results.length-failed.length}/${results.length} passed`);process.exitCode=failed.length?1:0;
