const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const source=fs.readFileSync("duel-ghost.js","utf8");
const store=new Map();
function boot(denied=false) {
  const sandbox={btoa,atob,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>{if(denied)throw Error("quota");store.set(k,v);}}};
  vm.runInNewContext(source,sandbox);return sandbox.MoonlitDuelGhost;
}
const prefix="moonlit-echo-ghost-v1:",key="cadet:breaker",origin=50000;
const p={w:34,h:64,x:origin+16,y:430,vx:210,vy:0,grounded:true,facing:1,runCycle:0}, frozen=()=>JSON.stringify(p);
let ghost=boot();
function run(t,tag) {
  p.x=origin+tag;p.y=430;p.grounded=true;p.facing=1;ghost.begin(key,origin,p,true);
  for(let i=1;i<Math.ceil(t*60);i++){
    const s=i/60;p.x=origin+tag+s*190;p.y=430-s*30;p.grounded=false;p.vy=-30;p.runCycle=s*10;
    p.attackTimer=.25;p.attackDuration=.5;p.attackDir={x:0,y:-1};p.slashComboActive=true;p.slashComboIndex=2;
    ghost.capture(s,p);
  }
  ghost.finish(key,t,p);
}
assert.equal(ghost.frameAt(.1),null);
run(4,0);const saved=store.get(prefix+key);assert(saved);
run(5,600);assert.equal(store.get(prefix+key),saved,"slow win must not replace any path");
ghost=boot();ghost.begin(key,origin,p,true);assert.equal(ghost.referenceTime,4);
let pose=ghost.frameAt(1);assert(Math.abs(pose.x-origin-190)<2 && Math.abs(pose.y-400)<2);assert.equal(pose.grounded,false);
assert(pose.attackTimer>0 && pose.attackDir.y<-.98);assert.equal(pose.slashComboIndex,2);
const before=frozen();ghost.frameAt(.5);assert.equal(frozen(),before);
ghost.setEnabled(false);assert.equal(ghost.frameAt(1),null);assert.equal(boot().enabled,false);
ghost.setEnabled(true);assert(ghost.frameAt(1));assert.equal(ghost.frameAt(4.01),null,"no wrap at finish");
ghost.clear();assert.equal(ghost.frameAt(.1),null);ghost.begin(key,origin,p,false);assert.equal(ghost.frameAt(1),null,"campaign never draws another player");
ghost.begin("darkhorse:breaker",origin,p,true);assert.equal(ghost.frameAt(1),null,"difficulty-specific");
ghost.begin("cadet:echo",origin,p,true);assert.equal(ghost.frameAt(1),null,"boss-specific");
run(3,50);assert.notEqual(store.get(prefix+key),saved);
const winner=store.get(prefix+key);ghost.begin(key,origin,p,true);ghost.capture(.3,p);ghost.clear();assert.equal(store.get(prefix+key),winner,"abandon/death is never saved");
store.set(prefix+"cadet:broken",'{"v":1,"time":4,"path":"bad data"}');
ghost.begin("cadet:broken",origin,p,true);assert.equal(ghost.frameAt(.1),null);
ghost=boot(true);ghost.begin("cadet:hunter",origin,p,false);ghost.capture(.1,p);ghost.finish("cadet:hunter",2,p);ghost.begin("cadet:hunter",origin,p,true);
assert.equal(ghost.referenceTime,2,"quota fallback preserves session ghost");
ghost=boot();ghost.begin("cadet:long",origin,p,false);
for(let i=1;i<=8000;i++){p.x=origin+100*Math.sin(i/60);ghost.capture(i/16,p);}
ghost.finish("cadet:long",500,p);assert(store.get(prefix+"cadet:long").length<40000);
ghost=boot();ghost.begin("cadet:long",origin,p,true);assert(ghost.frameAt(499),"decimation preserves end of long fights");
console.log("Ghost path QA passed: true positions, pose, aim, independent storage, timeout, preference, quotas and long-run sampling.");
