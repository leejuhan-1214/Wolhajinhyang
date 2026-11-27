(() => {
  "use strict";
  const shotKinds = new Set(["standard", "machinegun", "phase", "turret-row"]);
  const gunTypes = new Set(["gunner", "machinegun", "piercer", "turret"]);
  const cooldown = 1.5, chip = 0.5, exposure = 0.9;
  const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  function canHit(bullet, target, {owner, zone, enabled = true} = {}) {
    return !!(enabled && bullet?.enemy && !bullet.harmless && shotKinds.has(bullet.kind)
      && owner && gunTypes.has(owner.type) && typeof bullet.ownerId === "string" && bullet.ownerId.length > 0 && bullet.ownerId === owner.id
      && Number.isFinite(bullet.vx) && Number.isFinite(bullet.vy)
      && Number.isInteger(zone) && bullet.ownerZone === zone && owner.homeZoneIndex === zone
      && target?.alive && target.hp > 0 && target.type !== "boss" && !target.optionalTraversal
      && target.id !== owner.id && target.homeZoneIndex === zone);
  }
  function impact(bullet, target, context) {
    if (!canHit(bullet, target, context) || !overlap(bullet,target)) return null;
    const now = context.now;
    if (!Number.isFinite(now)) return null;
    const behind = bullet.vx * (target.facing || 1) > Math.max(1, Math.abs(bullet.vy) * 0.35);
    const shield = target.type === "shield";
    const protectedFront = shield && !behind && context.guardActive;
    if (protectedFront) {
      target.crossfireBlockUntil = now + 0.13;
      return {blocked:true, damage:0, stagger:0};
    }
    // Every physical impact consumes its round, but a volley cannot stun-lock
    // a unit or multiply its chip damage by the number of lanes/pellets.
    if (now < (target.crossfireReadyAt || 0)) return {suppressed:true, damage:0, stagger:0};
    const damage = Math.min(chip, Math.max(0, target.hp - 1));
    target.hp -= damage;
    target.crossfireReadyAt = now + cooldown;
    target.crossfireFlashUntil = now + 0.55;
    target.crossfireRear = shield && behind;
    if (target.crossfireRear) target.crossfireExposedUntil = now + exposure;
    return {damage, stagger:target.crossfireRear ? 0.42 : 0.26, exposed:target.crossfireRear};
  }
  function lineEntry(x,y,dx,dy,rect) {
    let lo=0,hi=1;
    for (const [a,b] of [[-dx,x-rect.x],[dx,rect.x+rect.w-x],[-dy,y-rect.y],[dy,rect.y+rect.h-y]]) {
      if (Math.abs(a)<1e-9) {if (b<0) return null;continue;}
      const t=b/a;
      if(a<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
      if(lo>hi)return null;
    }
    return lo;
  }
  function offerHint(bullet, enemies, platforms, owner, now) {
    if (!shotKinds.has(bullet?.kind) || !gunTypes.has(owner?.type)) return false;
    const speed=Math.hypot(bullet.vx,bullet.vy);if(!speed)return false;
    const x=bullet.x+bullet.w/2,y=bullet.y+bullet.h/2,dx=bullet.vx/speed*640,dy=bullet.vy/speed*640;
    let chosen=null,first=Infinity;
    for(const target of enemies) {
      if(target.type!=="shield" || target.crossfireHintShown || !canHit(bullet,target,{owner,zone:bullet.ownerZone}))continue;
      if(bullet.vx*(target.facing||1)<=Math.max(1,Math.abs(bullet.vy)*.35))continue;
      const t=lineEntry(x,y,dx,dy,target);if(t!==null&&t<first){chosen=target;first=t;}
    }
    if(!chosen)return false;
    if(!bullet.piercePlatforms&&platforms.some(p=>!p.hidden&&lineEntry(x,y,dx*first,dy*first,p)!==null))return false;
    chosen.crossfireHintShown=true;chosen.crossfireHintUntil=now+3;
    return true;
  }
  function reset(enemy) {
    for(const key of ["crossfireReadyAt","crossfireFlashUntil","crossfireExposedUntil","crossfireBlockUntil","crossfireHintUntil"])enemy[key]=0;
    enemy.crossfireRear=false;enemy.crossfireHintShown=false;
  }
  function draw(ctx,enemy,now) {
    if(!enemy.alive||enemy.type==="boss")return;
    const open=now<(enemy.crossfireExposedUntil||0),flash=now<(enemy.crossfireFlashUntil||0),block=now<(enemy.crossfireBlockUntil||0);
    const hint=now<(enemy.crossfireHintUntil||0);
    if(!open&&!flash&&!block&&!hint)return;
    const cx=enemy.x+enemy.w/2,top=enemy.y-10;
    ctx.save();ctx.lineWidth=2;ctx.strokeStyle=open?"#85f2e4":block?"#ffd575":"#f7cb76";
    if(open||flash) {
      ctx.beginPath();ctx.moveTo(cx-7,top-5);ctx.lineTo(cx+7,top+5);ctx.moveTo(cx+7,top-5);ctx.lineTo(cx-7,top+5);ctx.stroke();
      if(open){ctx.beginPath();ctx.arc(cx,top,12,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.max(0,(enemy.crossfireExposedUntil-now)/exposure));ctx.stroke();}
    }
    if(block){const x=enemy.x+enemy.w/2+(enemy.facing||1)*(enemy.w/2+3);ctx.beginPath();ctx.moveTo(x,enemy.y+12);ctx.lineTo(x,enemy.y+enemy.h-8);ctx.stroke();}
    if(hint||flash){
      ctx.font="bold 11px system-ui, sans-serif";ctx.textAlign="center";ctx.textBaseline="bottom";
      ctx.fillStyle=hint?"#ffe2a7":"#a4f4e8";
      ctx.fillText(hint?"적 사격을 방패 뒤로 유도":open?"후방 노출":"교차 사격",cx,top-17);
    }
    ctx.restore();
  }
  window.MoonlitCrossfire=Object.freeze({canHit,impact,offerHint,reset,draw,
    settings:Object.freeze({cooldown,chip,exposure,nonlethal:true})});
})();
