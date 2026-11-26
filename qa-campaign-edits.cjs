// Real historical IDs must never be interpreted as new serial IDs by accident.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(`${__dirname}/campaign-edit-compat.js`,'utf8');
const sandbox={module:{exports:{}}};
vm.runInNewContext(source.replace('CURRENT_LAYOUT,LEGACY_LAYOUT,reconcile});','CURRENT_LAYOUT,LEGACY_LAYOUT,reconcile,__legacyRows:LEGACY_ROWS});'),sandbox);
const api=sandbox.CampaignEditCompat,rows=JSON.parse(JSON.stringify(api.__legacyRows));
assert.equal(rows.length,3756,'historical lookup must contain the complete unedited a60820b map');
const retained=[[0,2,5,7,9,12,14,15],[0,1,5,7,9,12,14,15],[0,1,5,7,9,11,14,15],[0,3,6,7,9,10,14,15],[0,1,4,7,10,12,14,15]];
const origin=i=>4000*i+4*i*(i-1),copy=value=>JSON.parse(JSON.stringify(value));
function empty(){return {format:'moonlit-echo-admin-profile',formatVersion:1,gameVersion:'3.10.1',revision:'keep-revision',
  removedEnemies:[],spawnedEnemies:[],placedObjects:[],removedObjects:[],worldEdits:[],
  startScreenEdits:{title:'보존할 제목',buttons:{start:'출격'}},extraMetadata:{keep:true}};}
function synthetic(){
  const layout={zones:[],enemies:[],platforms:[],hazards:[],pickups:[],boostNodes:[],signs:[]};
  for(let index=0;index<40;index++)layout.zones.push({x:origin(index),end:origin(index+1),stageIndex:Math.floor(index/8),authoredLocalIndex:retained[Math.floor(index/8)][index%8]});
  const lists={enemy:'enemies',platform:'platforms',hazard:'hazards',pickup:'pickups',boost:'boostNodes',sign:'signs'};
  for(const row of rows){
    const stage=Math.floor(row[2]/16),local=retained[stage].indexOf(row[2]%16);if(local<0)continue;
    const index=stage*8+local,zone=layout.zones[index],oldWidth=4000+8*row[2],width=zone.end-zone.x;
    const rightAnchored=row[3]>oldWidth-800;
    const object={id:`new:${row[0]}`,x:zone.x+row[3]-(rightAnchored?oldWidth-width:0),y:row[4],w:row[5],h:row[6],kind:row[7]};
    if(row[1]==='enemy'){object.type=row[7];object.homeZoneIndex=index;object.stageIndex=stage;}
    if(row[5]>=oldWidth*.65)object.w=row[5]-(oldWidth-width);
    layout[lists[row[1]]].push(object);
  }
  return layout;
}
const layout=synthetic(),base=empty();
const enemy=rows.find(r=>r[1]==='enemy'&&r[2]===2),platform=rows.find(r=>r[1]==='platform'&&r[2]===2&&r[3]>300&&r[5]>100&&r[5]<1200);
const sign=rows.find(r=>r[1]==='sign'&&r[2]===2),removed=rows.find(r=>r[1]==='enemy'&&r[2]===1);
assert(enemy&&platform&&sign&&removed,'fixture needs genuine retained and removed-room historical IDs');
base.removedEnemies=[enemy[0],removed[0],'unknown:enemy:42','admin-spawn:unique:1:0:runner'];
base.spawnedEnemies=[{id:'admin-spawn:retained:1:0:runner',type:'runner',x:origin(2)+450,y:410,stageIndex:0,homeZoneIndex:2},
  {id:'admin-spawn:removed:1:0:runner',type:'runner',x:origin(1)+450,y:410,stageIndex:0,homeZoneIndex:1}];
base.placedObjects=[{id:'admin-place:retained:1:repair',type:'repair',x:origin(2)+610,y:420},
  {id:'admin-place:removed:1:repair',type:'repair',x:origin(1)+610,y:420}];
base.worldEdits=[{id:platform[0],type:'platform',x:origin(2)+platform[3]+12,y:platform[4]-8,w:321,h:platform[6],hidden:true},
  {id:sign[0],type:'sign',x:origin(2)+sign[3],y:sign[4],text:'보존할 문구',sub:'표지판 내용',hidden:false},
  {id:'admin-world:retained:1:backdrop',type:'backdrop',custom:true,x:origin(2)+800,y:100,w:400,h:300,text:'나의 배경'}];
const untouched=JSON.stringify(base),result=api.reconcile(base,layout),migrated=result.profile;
assert.equal(JSON.stringify(base),untouched,'migration must never erase or mutate the original profile');
assert.equal(migrated.worldLayout,api.CURRENT_LAYOUT);
assert(migrated.removedEnemies.includes('new:'+enemy[0])&&!migrated.removedEnemies.includes(removed[0]),'only matching retained enemy deletion may apply');
assert(migrated.removedEnemies.includes('admin-spawn:unique:1:0:runner'),'unique custom deletion IDs remain safe');
assert.equal(migrated.spawnedEnemies.length,1);assert.equal(migrated.spawnedEnemies[0].x,origin(1)+450);assert.equal(migrated.spawnedEnemies[0].homeZoneIndex,1);
assert.equal(migrated.placedObjects.length,1);assert.equal(migrated.placedObjects[0].x,origin(1)+610);
assert.equal(migrated.worldEdits.find(e=>e.id==='new:'+platform[0]).w,321,'explicitly edited dimensions must be preserved');
assert.equal(migrated.worldEdits.find(e=>e.id==='new:'+sign[0]).text,'보존할 문구');
assert.equal(migrated.worldEdits.find(e=>e.custom).x,origin(1)+800);
assert.equal(JSON.stringify(migrated.startScreenEdits),JSON.stringify(base.startScreenEdits));
assert.equal(JSON.stringify(migrated.extraMetadata),JSON.stringify(base.extraMetadata));assert.equal(migrated.revision,base.revision);
assert(result.quarantine.some(q=>q.reason==='removed-room')&&result.quarantine.some(q=>q.reason==='unknown-or-ambiguous-authored-id'));
assert.equal(JSON.stringify(api.reconcile(migrated,layout).profile),JSON.stringify(migrated),'reloading a converted profile must be idempotent');
assert.equal(JSON.stringify(api.reconcile(base,layout).profile),JSON.stringify(migrated),'the same legacy live revision must migrate deterministically');
const shifted=copy(layout),shiftZone=shifted.zones[1];
const broadFloor=shifted.platforms.filter(p=>p.x>=shiftZone.x&&p.x<shiftZone.end&&p.y>=400&&p.h>=80).sort((a,b)=>b.w-a.w)[0];
const oldFloorY=broadFloor.y;
for(const key of['enemies','platforms','hazards','pickups','boostNodes','signs'])for(const object of shifted[key]){
  if(object.x<shiftZone.x||object.x>=shiftZone.end)continue;
  const isFloor=key==='platforms'&&object.y===oldFloorY&&object.h>=80;
  object.y-=40;if(isFloor)object.h+=40;
}
const shiftedResult=api.reconcile(base,shifted).profile;
assert.equal(shiftedResult.spawnedEnemies[0].y,370,'spawned enemies retain height above the moved floor');
assert.equal(shiftedResult.placedObjects[0].y,380,'repair placement follows its room floor, not another act');
assert.equal(shiftedResult.worldEdits.find(e=>e.id==='new:'+platform[0]).y,platform[4]-48,'authored edit offsets survive a changed floor height');
const objectRow=rows.find(r=>(r[1]==='pickup'||r[1]==='boost')&&retained[Math.floor(r[2]/16)].includes(r[2]%16)&&!r[0].startsWith('air-route:'));
const objectDelete=empty();objectDelete.removedObjects=[objectRow[0]];
assert(api.reconcile(objectDelete,layout).profile.removedObjects.includes('new:'+objectRow[0]),'base healing-item and jump-pad deletion IDs must be remapped');
// A currently authored edit can use any serial/coordinate; never reinterpret it.
const current=empty();current.worldLayout=api.CURRENT_LAYOUT;current.removedEnemies=[removed[0]];current.placedObjects=[{id:'new-live-item',x:origin(2)+900,y:250}];
assert.equal(JSON.stringify(api.reconcile(current,layout).profile),JSON.stringify(current),'current shared edits must bypass legacy interpretation');
const versioned=copy(current);delete versioned.worldLayout;versioned.gameVersion='3.11.0';
assert.equal(api.reconcile(versioned,layout).profile.placedObjects[0].x,versioned.placedObjects[0].x,'new versioned live data cannot be translated twice');
// The same old serial now exists elsewhere: only the retained-room geometry wins.
const withCollision=copy(layout);withCollision.platforms.push({id:platform[0],x:origin(30)+400,y:platform[4],w:platform[5],h:platform[6],kind:platform[7]});
assert.equal(api.reconcile(base,withCollision).profile.worldEdits.find(e=>e.type==='platform').id,'new:'+platform[0]);
const ambiguous=copy(layout),candidate=ambiguous.platforms.find(p=>p.id==='new:'+platform[0]);ambiguous.platforms.push({...candidate,id:'duplicate-shape'});
assert(api.reconcile(base,ambiguous).quarantine.some(q=>q.reason==='ambiguous-authored-geometry'),'ambiguous matching must be quarantined, never guessed');
const invalid=empty();invalid.spawnedEnemies=[{id:'admin-spawn:wrong:1:4:runner',type:'runner',x:origin(2)+10,y:350,stageIndex:4,homeZoneIndex:2}];
assert.equal(api.reconcile(invalid,layout).profile.spawnedEnemies.length,0,'conflicting act metadata cannot move an enemy into another act');
// Check all five acts and then the real compact build, not only synthetic IDs.
for(let stage=0;stage<5;stage++){
  const profile=empty(),oldIndex=stage*16+retained[stage][1];
  profile.placedObjects=[{id:`admin-place:stage${stage}:1:repair`,type:'repair',x:origin(oldIndex)+700,y:380}];
  assert.equal(api.reconcile(profile,layout).profile.placedObjects[0].x,origin(stage*8+1)+700);
}
new Function('require',fs.readFileSync('qa-smoke.cjs','utf8').split('const runtimeSource =')[0])(require);
global.setTimeout=()=>1;global.clearTimeout=()=>{};
for(const key of['removed-enemies','spawned-enemies','placed-objects','removed-objects','world-edits'])localStorage.setItem(`moonlit-echo-admin-${key}-v1`,'[]');
for(const file of['operative-renderer.js','story-data.js','campaign-edit-compat.js'])vm.runInThisContext(fs.readFileSync(file,'utf8'),{filename:file});
const hook='window.__EDIT_COMPAT_QA__={zones,enemies,platforms,hazards,pickups,boostNodes,signs};selectedDifficulty="darkhorse";game.difficulty="darkhorse";buildLevel();';
vm.runInThisContext(fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/,hook+'\n})();'));
const actual=window.__EDIT_COMPAT_QA__;assert.equal(actual.zones.length,40,'integration must use the actual compact campaign');
const bossRows=rows.filter(row=>row[1]==='enemy'&&['breaker','warden','hunter','furnace','oracle','weaver','revenant','censor','proxy','echo'].includes(row[7]));
const actualProfile=empty();actualProfile.removedEnemies=bossRows.map(row=>row[0]);
const actualResult=window.CampaignEditCompat.reconcile(actualProfile,actual);
assert.equal(actualResult.profile.removedEnemies.length,10,`all ten retained boss IDs must match the real rebuilt acts: ${JSON.stringify(actualResult.quarantine)}`);
assert(actualResult.profile.removedEnemies.every(id=>actual.enemies.some(e=>e.id===id&&e.type==='boss')));
const routeProfile=empty();routeProfile.removedEnemies=['air-route:5:drone:1','air-route:43:drone:2'];
assert.equal(JSON.stringify(window.CampaignEditCompat.reconcile(routeProfile,actual).profile.removedEnemies),JSON.stringify(['air-route:2:drone:1','air-route:21:drone:2']),'named aerial-route edit IDs follow the curated retained rooms');
const broad=empty();broad.removedEnemies=rows.filter(r=>r[1]==='enemy').map(r=>r[0]);
broad.removedObjects=rows.filter(r=>r[1]==='pickup'||r[1]==='boost').map(r=>r[0]);
broad.worldEdits=rows.filter(r=>r[1]==='platform'||r[1]==='hazard'||r[1]==='sign').map(r=>({id:r[0],type:r[1],x:origin(r[2])+r[3],y:r[4],w:r[5],h:r[6],hidden:true}));
const coverage=window.CampaignEditCompat.reconcile(broad,actual);
assert(coverage.profile.removedEnemies.length>100&&coverage.profile.worldEdits.length>100,'retained ordinary enemies and structures must really migrate, not only named bosses');
console.log({retainedEnemyDeletes:coverage.profile.removedEnemies.length,retainedObjectDeletes:coverage.profile.removedObjects.length,retainedWorldEdits:coverage.profile.worldEdits.length,quarantined:coverage.quarantine.length});
console.log(`Campaign edit compatibility: ${rows.length} historical objects, five-act translation, removed-room quarantine, exact-ID collision protection, current live bypass, immutable/idempotent profiles and 10 actual boss remaps passed.`);
