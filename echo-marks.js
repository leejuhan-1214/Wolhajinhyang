// Pixel-authored environmental foreshadowing, with no collision/save ownership.
(() => {
  "use strict";
  const CUTS=Object.freeze([
    Object.freeze({from:[-27,20],to:[9,-22]}),
    Object.freeze({from:[-12,-23],to:[27,18]}),
    Object.freeze({from:[-29,4],to:[30,4]}),
  ]);
  const SITES=Object.freeze([
    {zone:1,text:"올려 베고, 내려 베고, 가로로. 같은 검이 남긴 세 번의 흔적."},
    {zone:10,text:"그을음 아래에도 같은 검흔. 누군가 먼저 이 길을 지나갔다."},
    {zone:18,text:"실패한 동작은 지워지고, 세 번의 궤적만 남아 있다."},
    {zone:26,offset:400,text:"익숙한 검술이다. 마지막 획에는 망설임이 없다."},
  ]);
  const memories=new Map();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let cache=null;
  const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  function getMarks(checkpoints,platforms,hazards=[]) {
    const key=SITES.map(s=>{const c=checkpoints[s.zone];return c?`${c.x}:${c.y}`:"-";}).join("|")+`:${platforms.length}:${hazards.length}`;
    if(cache?.key===key&&cache.first===checkpoints[1])return cache.marks;
    if(cache&&cache.first!==checkpoints[1])memories.clear();
    const marks=[];
    for(const site of SITES){
      const c=checkpoints[site.zone];if(!c)continue;
      const targetFloor=c.y+(c.h||88),candidates=[];
      for(const floor of platforms){
        if(floor.hidden||floor.w<100||Math.abs(floor.y-targetFloor)>100)continue;
        for(const offset of [site.offset||190,280,370,105]){
          const x=c.x+offset;
          if(x-47<floor.x||x+47>floor.x+floor.w)continue;
          const bounds={x:x-44,y:floor.y-93,w:88,h:92};
          if(platforms.some(p=>p!==floor&&!p.hidden&&overlap(bounds,p)))continue;
          if(hazards.some(h=>!h.hidden&&overlap({...bounds,y:floor.y-8,h:20},h)))continue;
          candidates.push({...site,x,y:floor.y-48,floorY:floor.y,bounds,score:Math.abs(offset-(site.offset||190))+Math.abs(floor.y-targetFloor)*2});
        }
      }
      candidates.sort((a,b)=>a.score-b.score);if(candidates[0])marks.push(candidates[0]);
    }
    cache={key,first:checkpoints[1],marks};return marks;
  }
  function pixelLine(ctx,a,b,color,width=2,progress=1){
    const length=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));ctx.fillStyle=color;
    for(let n=0;n<=Math.floor(length*clamp(progress,0,1));n++)ctx.fillRect(Math.round(a[0]+(b[0]-a[0])*n/length),Math.round(a[1]+(b[1]-a[1])*n/length),width,width);
  }
  function grooves(ctx,active=-1,progress=1,glow=false){
    if(active===-2)return;
    CUTS.forEach((c,i)=>{
      if(active>=0&&i>active)return;const p=i===active?progress:1;
      pixelLine(ctx,c.from,c.to,"#080e16",5,p);
      pixelLine(ctx,[c.from[0],c.from[1]+2],[c.to[0],c.to[1]+2],glow?"#7398ab":"#857b68",2,p);
      pixelLine(ctx,c.from,c.to,glow?"#cbeffd":"#b6bbb0",1,p);
    });
  }
  function plate(ctx,mark,active=-1,progress=1,glow=false){
    ctx.save();ctx.translate(Math.round(mark.x),Math.round(mark.y));
    ctx.fillStyle="#0b1720";ctx.fillRect(-43,-44,86,84);
    ctx.fillStyle="#23343c";ctx.fillRect(-40,-42,79,79);
    ctx.fillStyle="#31434a";ctx.fillRect(-40,-42,79,3);
    ctx.fillStyle="#182831";ctx.fillRect(-35,-32,69,61);
    ctx.fillStyle="#405059";ctx.fillRect(-40,-37,3,70);
    ctx.fillStyle="#101d26";ctx.fillRect(36,-37,3,70);
    ctx.fillStyle="#68716b";for(const x of [-35,30])for(const y of [-36,29])ctx.fillRect(x,y,3,3);
    ctx.fillStyle="#5b4b39";for(const [x,y,w] of [[-36,18,6],[22,-30,9],[-22,28,11],[30,6,4]])ctx.fillRect(x,y,w,2);
    ctx.fillStyle="#13212a";ctx.fillRect(-44,40,24,8);ctx.fillRect(21,40,23,8);
    grooves(ctx,active,progress,glow);ctx.restore();
  }
  function lineHitsRect(s,r){
    const a=s.base,b=s.tip;if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))return false;
    let lo=0,hi=1;
    for(const [p,d,low,high] of [[a.x,b.x-a.x,r.x,r.x+r.w],[a.y,b.y-a.y,r.y,r.y+r.h]]){
      if(Math.abs(d)<1e-7){if(p<low||p>high)return false;continue;}
      const t0=(low-p)/d,t1=(high-p)/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));if(lo>hi)return false;
    }return true;
  }
  function wantsInspectAt(x,y,{game,player,checkpoints,platforms,hazards}){
    if(game.mode!=="playing"||game.adminMode||game.cutscene||game.tutorialActive)return false;
    return getMarks(checkpoints,platforms,hazards).some(m=>m.zone===game.zone
      &&Math.abs(player.x+player.w/2-m.x)<145&&Math.abs(player.y+player.h/2-m.y)<115
      &&Math.abs(x-m.x)<51&&Math.abs(y-m.y)<51);
  }
  function inspectBlade({game,player,segments,checkpoints,platforms,hazards,sound}){
    if(game.mode!=="playing"||game.adminMode||game.cutscene||game.tutorialActive)return false;
    for(const m of getMarks(checkpoints,platforms,hazards)){
      if(m.zone!==game.zone||Math.abs(player.x+player.w/2-m.x)>180)continue;
      const old=memories.get(m.zone),age=old?game.time-old.time:Infinity;
      if(age>=0&&age<5)continue;
      if(!segments.some(s=>lineHitsRect(s,{x:m.x-32,y:m.y-27,w:65,h:54})))continue;
      memories.set(m.zone,{time:game.time,attackId:player.attackId});sound?.tone?.(540,.13,"sine",.016,1.4);return true;
    }return false;
  }
  function drawWorld(ctx,{game,player,checkpoints,platforms,hazards,left,right}){
    for(const m of getMarks(checkpoints,platforms,hazards)){
      if(m.x+50<left||m.x-50>right)continue;
      const memory=memories.get(m.zone),elapsed=memory?game.time-memory.time:Infinity,revealing=elapsed>=0&&elapsed<4.8;
      plate(ctx,m,-1,1,false);
      if(revealing){
        const beat=recallBeat(elapsed);
        ctx.save();ctx.translate(Math.round(m.x),Math.round(m.y));
        // Investigation traces the same rising/falling/level order that Echo
        // repeats later, so the clue is readable without explaining the plot.
        grooves(ctx,elapsed<.3?-2:beat.index,beat.progress,true);ctx.restore();
      }
      ctx.save();ctx.textAlign="center";ctx.textBaseline="bottom";
      ctx.font="700 13px 'Malgun Gothic',sans-serif";ctx.shadowColor="#06101a";ctx.shadowBlur=3;
      if(revealing){ctx.globalAlpha=Math.min(1,elapsed*7,(4.8-elapsed)*2);ctx.fillStyle="#cae5e6";ctx.fillText(m.text,m.x,m.floorY+44,365);}
      else if(!memory&&!game.cutscene&&!game.adminMode&&Math.abs(player.x-m.x)<140&&Math.abs(player.y-m.y)<100){ctx.font="700 11px 'Malgun Gothic',sans-serif";ctx.fillStyle="#a5bfc4";ctx.fillText("칼끝으로 흔적 조사",m.x,m.floorY+42);}
      ctx.restore();
    }
  }
  function prepareScene(scene){
    if(scene.id!=="cutscene-echo"||scene.shots.some(s=>s.echoScarRecall))return;
    scene.shots.unshift({echoScarRecall:true,speaker:"잔영-00",text:"",tone:"hostile",duration:2.7});
  }
  function recallBeat(elapsed){
    const t=clamp(elapsed-.3,0,2.1),index=Math.min(2,Math.floor(t/.7));
    return {index,progress:clamp((t-index*.7)/.43,0,1),cutting:elapsed>=.3&&elapsed<2.4&&(t-index*.7)<.43};
  }
  function updateRecall(scene,shot,elapsed,sound){
    if(!shot?.echoScarRecall)return;
    while((scene.echoScarCue||0)<3&&elapsed>=.3+(scene.echoScarCue||0)*.7){
      scene.echoScarCue=(scene.echoScarCue||0)+1;sound?.noise?.(.09,.016,1650,"bandpass");sound?.tone?.(360+scene.echoScarCue*130,.12,"triangle",.013,.8);
    }
  }
  function drawRecall(ctx,{elapsed,echoX,feetY}){
    const beat=recallBeat(elapsed),x=Math.round(echoX-77),y=Math.round(feetY-48);
    ctx.save();ctx.globalAlpha=.78;plate(ctx,{x,y},elapsed<.3?-2:beat.index,beat.progress,true);ctx.restore();
    if(beat.cutting){const c=CUTS[beat.index];ctx.save();ctx.translate(x,y);pixelLine(ctx,c.from,c.to,"#dcbdff",3,beat.progress);
      const tip=[c.from[0]+(c.to[0]-c.from[0])*beat.progress,c.from[1]+(c.to[1]-c.from[1])*beat.progress];ctx.fillStyle="#f0e6ff";
      for(let i=0;i<5;i++)ctx.fillRect(Math.round(tip[0]-i*3),Math.round(tip[1]+i*i*.6-6),2,2);ctx.restore();}
  }
  window.MoonlitEchoMarks=Object.freeze({CUTS,SITES,getMarks,drawWorld,wantsInspectAt,inspectBlade,prepareScene,recallBeat,updateRecall,drawRecall});
})();
