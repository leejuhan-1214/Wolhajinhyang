// Dependency-free regression for the actual drone/shield drawing branches.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
new Function('require',fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0])(require);
for(const file of['operative-renderer.js','story-data.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'));
const hook='window.__COMMON_ART_QA__={drawEnemy,enemies,player,game,ctx};';
vm.runInThisContext(fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/,hook+'\n})();'));
const q=window.__COMMON_ART_QA__;
const templates=new Map(['drone','shield'].map(type=>[type,{...q.enemies.find(enemy=>enemy.type===type)}]));
let calls=[],shapes=[],ellipses=[],stack=[];
for(const method of['save','restore','translate','scale','rotate','fillRect','strokeRect','moveTo','lineTo','arc','ellipse','quadraticCurveTo','fill','stroke']){
  const original=q.ctx[method];
  q.ctx[method]=(...args)=>{
    for(const arg of args)if(typeof arg==='number')assert(Number.isFinite(arg),`${method} must draw finite geometry`);
    calls.push([method,...args]);
    if(method==='save')stack.push({fillStyle:q.ctx.fillStyle,strokeStyle:q.ctx.strokeStyle,globalAlpha:q.ctx.globalAlpha,globalCompositeOperation:q.ctx.globalCompositeOperation});
    if(method==='restore'){assert(stack.length,'canvas saves must balance');Object.assign(q.ctx,stack.pop());}
    if(method==='fill'||method==='fillRect')shapes.push({method,args,color:q.ctx.fillStyle});
    if(method==='ellipse')ellipses.push(args);
    return original(...args);
  };
}
let cases=0,maxDrawCalls=0;
for(const type of['drone','shield'])for(const facing of[-1,1])for(const phase of[0,.27,.6])for(const hurt of[0,.1]){
  const states=type==='shield'?[{shieldGuard:2,shieldBreakTimer:0},{shieldGuard:1,shieldBreakTimer:0},{shieldGuard:0,shieldBreakTimer:2.2}]:[{windup:0},{windup:.25}];
  for(const state of states){
    const enemy=Object.freeze({...templates.get(type),x:500+phase*20,originX:500,y:350,facing,anim:phase*6,vx:phase?58*facing:0,vy:0,grounded:type!=='drone',alive:true,hurt,windup:0,...state});
    const before=JSON.stringify(enemy),playerBefore=JSON.stringify(q.player);
    calls=[];shapes=[];ellipses=[];stack=[];
    q.drawEnemy(enemy);
    assert.equal(JSON.stringify(enemy),before,'art must not alter health, guard, collision or attack state');
    assert.equal(JSON.stringify(q.player),playerBefore,'common enemy rendering must not borrow player state');
    assert.equal(stack.length,0,'art must restore canvas transforms and styles');
    assert(calls.length<900,'common enemy detail must remain within a compact draw budget');
    maxDrawCalls=Math.max(maxDrawCalls,calls.length);
    if(type==='drone'){
      assert.equal(ellipses.filter(args=>args[2]===11.5&&args[3]===6.5).length,2,'both visible duct-fan rims must be drawn');
      assert(shapes.some(shape=>shape.color===(state.windup>0?'#e8b765':'#bd536e')),'the actual lens must distinguish attack windup from idle');
      if(hurt>0)assert(shapes.some(shape=>shape.color==='#f2ffff'),'the scout shell must retain a visible hit flash');
    }else{
      const broken=state.shieldBreakTimer>0;
      assert(shapes.some(shape=>shape.color===(broken?'#985662':'#82949a')),'the real shield face must distinguish broken and intact plating');
      const slots=shapes.filter(shape=>shape.method==='fillRect'&&shape.args[1]===-6&&shape.args[2]===4&&shape.args[3]===8);
      assert.equal(slots.length,2,'both actual guard-capacity cells must remain visible');
      assert.equal(slots.filter(shape=>shape.color==='#ffcd70').length,broken?0:state.shieldGuard,'yellow guard cells must follow remaining guard hits');
      if(broken)assert(slots.every(shape=>shape.color==='#ff496c'),'broken guard cells must be red, never falsely yellow');
      if(hurt>0)assert(shapes.some(shape=>shape.color==='#ffffff'),'the riot chassis must retain its hit flash');
    }
    cases++;
  }
}
console.log(JSON.stringify({commonEnemyArt:'passed',cases,maxDrawCalls,guardStates:3,physicsMutation:false}));
