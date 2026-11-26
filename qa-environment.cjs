const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const moduleSource=fs.readFileSync('environment-renderer.js','utf8');
const sandbox={module:{exports:{}}};vm.runInNewContext(moduleSource,sandbox);
const api=sandbox.MoonlitEnvironment;
assert.equal(api.themes.length,5);
assert.equal(new Set(api.themes.map(theme=>theme.name)).size,5);
function recorder(){
  let style={globalAlpha:1},stack=[],path=[];
  const commands=[],shapes=[];
  const methods={
    save(){stack.push({...style});},restore(){assert(stack.length,'balanced canvas saves');style=stack.pop();},
    beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},
    fill(){shapes.push({kind:'path',points:path.slice(),color:style.fillStyle});},
    stroke(){shapes.push({kind:'stroke',points:path.slice(),color:style.strokeStyle});},
    fillRect(x,y,w,h){assert(w>0&&h>0);shapes.push({kind:'rect',points:[[x,y],[x+w,y+h]],color:style.fillStyle});},
    arc(x,y,r){assert(r>=0);},ellipse(x,y,rx,ry){assert(rx>=0&&ry>=0);},
  };
  const context=new Proxy({}, {
    get(_,name){if(name in style)return style[name];return(...args)=>{
      for(const arg of args)if(typeof arg==='number')assert(Number.isFinite(arg),`${name} finite geometry`);
      commands.push([name,...args]);methods[name]?.(...args);
    };},
    set(_,name,value){if(name==='globalAlpha')assert(value>=0&&value<=1);style[name]=value;return true;},
  });
  return{context,commands,shapes,balanced:()=>stack.length===0};
}
const view=Object.freeze({x:0,y:0,w:1280,h:720,time:3,mobile:false});
const fixtures=[
  {x:50,y:160,w:280,h:24,kind:'roof'},
  {x:400,y:100,w:52,h:500,kind:'wall'},
  {x:-200,y:540,w:2200,h:780,kind:'factory'},
  {x:-50000,y:-50000,w:100000,h:100000,kind:'factory'},
];
const signatures=[],mobileSignatures=[];let maxCommands=0;
for(let act=0;act<5;act++)for(const mobile of[false,true]){
  for(const source of fixtures){
    const platform=Object.freeze({...source}),record=recorder(),renderer=api.createRenderer(record.context);
    const before=JSON.stringify(platform);
    assert.equal(renderer.drawPlatform(platform,act,{...view,mobile}),true);
    assert.equal(JSON.stringify(platform),before,'surface rendering cannot alter any collision property');
    assert(record.balanced(),'surface rendering must restore canvas style and clip');
    assert(record.commands.length<2600,'visible detail budget must not scale with world-size rectangles');
    maxCommands=Math.max(maxCommands,record.commands.length);
    assert(record.commands.some(command=>command[0]==='rect'&&command[1]===platform.x&&command[2]===platform.y&&command[3]===platform.w&&command[4]===platform.h),
      'every surface must be clipped to the exact solid bounds');
    if(source===fixtures[0]){
      const edge=record.shapes.find(shape=>shape.kind==='rect'&&shape.color===api.themes[act].edge&&shape.points[0][1]===platform.y);
      assert(edge&&edge.points[0][1]===platform.y&&edge.points[1][1]===platform.y+2,'walkable edge must remain exactly on the collision top');
      const geometry=JSON.stringify(record.commands);(mobile?mobileSignatures:signatures).push(geometry);
    }
  }
  const record=recorder(),renderer=api.createRenderer(record.context);
  const zone=Object.freeze({x:-1000,end:9000,template:'boss'});
  renderer.drawArena(zone,act,{...view,mobile,floorY:670});
  assert(record.commands.length>40&&record.commands.length<1300,'nearby arena architecture must be visible and bounded');
  assert(record.balanced());
}
assert.equal(new Set(signatures).size,5,'platform identities must differ in geometry, not just palette');
assert.equal(new Set(mobileSignatures).size,5,'lower-density mobile art must retain each act identity');
{
  const record=recorder(),renderer=api.createRenderer(record.context);
  renderer.drawPlatform({x:9999,y:0,w:200,h:40,kind:'roof'},0,view);
  renderer.drawArena({x:9999,end:12000},1,view);
  assert.equal(record.commands.length,0,'offscreen art must cost no draw operations');
  assert.equal(renderer.drawPlatform({x:0,y:30,w:200,h:24,kind:'training'},0,view),false,'training keeps its established fallback');
}

// Exercise the real dispatch hooks while preserving all authored collisions
// and hazard positions, then verify direct legacy harnesses can omit the module.
new Function('require',fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0])(require);
for(const name of['operative-renderer.js','story-data.js','environment-renderer.js'])vm.runInThisContext(fs.readFileSync(name,'utf8'));
const gameSource=fs.readFileSync('game.js','utf8');
const hook='window.__ENVIRONMENT_QA__={drawPlatform,drawBossArenaBackdrop,platforms,hazards,stages,zones,camera,environmentRenderer};';
function loadGame(){window.__MOONLIT_ECHO_RUNTIME_ACTIVE__=false;vm.runInThisContext(gameSource.replace(/\}\)\(\);\s*$/,hook+'\n})();'));return window.__ENVIRONMENT_QA__;}
const q=loadGame();assert(q.environmentRenderer,'published dispatch must use the new architecture renderer');
const before=JSON.stringify([q.platforms,q.hazards]);
for(let act=0;act<5;act++){
  q.camera.x=q.stages[act].x;q.camera.y=0;
  for(const platform of q.platforms.filter(p=>p.x>=q.stages[act].x&&p.x<q.stages[act].end).slice(0,24))q.drawPlatform(platform);
  const zone=q.zones.filter(zone=>zone.stageIndex===act).at(-1);q.camera.x=zone.x+160;q.drawBossArenaBackdrop(q.camera.x-200,q.camera.x+1480);
}
assert.equal(JSON.stringify([q.platforms,q.hazards]),before,'render integration must preserve the entire layout and all hazards');
delete window.MoonlitEnvironment;
const legacy=loadGame();assert.equal(legacy.environmentRenderer,null);
legacy.drawPlatform(legacy.platforms[0]);legacy.drawBossArenaBackdrop(0,1280);
console.log(JSON.stringify({environment:'passed',acts:5,surfaceCases:40,maxCommands,collisionMutation:false,legacyFallback:true}));
