// Optional field equipment. Cabinets aren't enemies, solids, pickups or seal objectives.
(() => {
  "use strict";
  const plans = [
    ["switch-01",0,"relay",1], ["blast-02",1,"blast",5],
    ["switch-03",2,"relay",2], ["blast-03",2,"blast",5],
    ["blast-04",3,"blast",2], ["switch-05",4,"relay",4],
  ];
  const ids = new Set(plans.map(p => p[0]));
  const overlaps = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const mortar = e => e.type === "mortar" || e.type === "mortarTurret";
  const width=48,height=44;
  function create() {
    let claimed = new Set(), cabinets = new Map();
    function build({zones,platforms,enemies,hazards,checkpoints,entryRange}) {
      cabinets = new Map();
      for (const [id,act,kind,preferred] of plans) {
        const eligible = zones.filter(z => z.stageIndex === act && z.template !== "tutorial" &&
          z.template !== "boss" && z.template !== "midboss" && z.globalIndex !== 9);
        eligible.sort((a,b) => Math.abs(a.localIndex-preferred)-Math.abs(b.localIndex-preferred) || a.globalIndex-b.globalIndex);
        for (const z of eligible) {
          if (cabinets.has(z.globalIndex)) continue;
          const troops = enemies.filter(e=>e.alive && !e.adminSpawned && !e.optionalTraversal && e.homeZoneIndex===z.globalIndex);
          const hosts = kind==="blast" ? troops.filter(mortar) : [null];
          let placed = false;
          for (const host of hosts) {
            const anchor = host ? host.x+host.w/2 : z.x+Math.min(1200,(z.end-z.x)*.35);
            for (const offset of (host ? [214,-214,340,-340,465,-465,135,-135,555,-555] : [0,140,-140,320,-320,530,-530,700,-700])) {
              const x = Math.round(anchor+offset-width/2);
              if (x<z.x+240 || x+width>z.end-140) continue;
              const cp=checkpoints[z.globalIndex], floorY=cp ? cp.y+cp.h : 650;
              const view=entryRange?.(z.globalIndex);
              const surfaces=platforms.filter(p=>!p.hidden && !p.dynamic && p.x<=x-22 && p.x+p.w>=x+width+22
                && Math.abs(p.y-floorY)<=140 && (!view || (p.y-height-16>=view.top && p.y<=view.bottom)));
              surfaces.sort((a,b)=>Math.abs(a.y-floorY)-Math.abs(b.y-floorY));
              for (const p of surfaces) {
                const box={x,y:p.y-height,w:width,h:height}, clearance={x:x-10,y:box.y-16,w:width+20,h:height+16};
                if (platforms.some(other=>other!==p&&!other.hidden&&overlaps(other,clearance)) ||
                    hazards.some(h=>!h.hidden&&overlaps(h,clearance)) || troops.some(e=>overlaps(e,clearance))) continue;
                cabinets.set(z.globalIndex,{...box,id,kind,zone:z.globalIndex,hostId:host?.id||null,phase:"locked",timer:0,age:0});
                placed=true; break;
              }
              if(placed)break;
            }
            if(placed)break;
          }
          if(placed)break;
        }
      }
    }
    const receiver = c => ({x:c.x+7,y:c.y+9,w:c.w-14,h:18});
    function shot(zone,b) {
      const c=cabinets.get(zone);
      if (!c || claimed.has(c.id) || c.kind!=="relay" || c.phase!=="locked" || b.enemy || b.kind!=="shotgun" || !overlaps(receiver(c),b)) return false;
      c.phase="armed"; c.timer=3.2; return true;
    }
    function open(c){c.phase="open";c.age=0;c.timer=0;return c;}
    function slash(zone, hitsSteel) {
      const c=cabinets.get(zone);
      return c&&!claimed.has(c.id)&&c.phase==="armed"&&hitsSteel(c) ? open(c) : null;
    }
    function touchLatch(zone,x,y) {
      const c=cabinets.get(zone);
      return c && c.phase==="armed" && !claimed.has(c.id) && x>=c.x-10 && x<=c.x+c.w+10 && y>=c.y-10 && y<=c.y+c.h+10 ? c : null;
    }
    function blast(zone,x,y) {
      const c=cabinets.get(zone);
      if (!c || claimed.has(c.id) || c.phase!=="locked" || c.kind!=="blast") return null;
      // Nearest point of the visible casing. A shell cut in flight never calls this.
      const dx=x-Math.max(c.x,Math.min(x,c.x+c.w)), dy=y-Math.max(c.y,Math.min(y,c.y+c.h));
      return dx*dx+dy*dy<=78**2 ? open(c) : null;
    }
    function update(zone,dt,p) {
      const c=cabinets.get(zone);
      if(!c || claimed.has(c.id))return null;
      if(c.phase==="armed" && (c.timer-=dt)<=0){c.phase="locked";c.timer=0;}
      if(c.phase!=="open")return null;
      c.age+=dt;
      if(!overlaps(p,{x:c.x-8,y:c.y-4,w:c.w+16,h:c.h+4}) || p.hp<=0)return null;
      let label;
      if(p.hp<p.maxHp){p.hp=Math.min(p.maxHp,p.hp+1);label="체력 +1";}
      else if(p.shotgunCharge<3){p.shotgunCharge=Math.min(3,p.shotgunCharge+1);label="강화탄 충전 +1";}
      else return null; // Leave the reserve here if both resources are full.
      claimed.add(c.id);return {c,label};
    }
    function draw(ctx,zone,left,right,time,p) {
      const c=cabinets.get(zone);
      if(!c || c.x+c.w<left || c.x>right)return;
      const used=claimed.has(c.id), opened=used||c.phase==="open", armed=c.phase==="armed";
      const accent=used?"#607477":armed?"#fadb8a":c.kind==="relay"?"#72dfde":"#ffa16e";
      const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
      ctx.save();ctx.translate(Math.round(c.x),Math.round(c.y));
      rect(1,36,46,8,"#0a1720");rect(0,7,48,31,"#101d2a");rect(3,9,42,26,"#46545c");
      rect(5,35,8,7,"#253741");rect(35,35,8,7,"#253741");rect(3,37,42,2,"#819294");
      rect(7,11,34,21,"#1b2c37");rect(9,13,30,1,"#819193");
      rect(2,opened?-4:4,44,6,used?"#425157":"#64757e");rect(4,opened?-4:4,40,1,accent);
      for(const x of [3,41]){rect(x,10,3,3,"#9fa9a7");rect(x,29,3,3,"#9fa9a7");}
      if(opened){
        rect(8,15,32,15,"#08151e");
        if(!used){const bob=Math.round(Math.sin(time*4)*2);rect(18,17+bob,12,9,"#377578");rect(22,18+bob,3,7,"#affff0");rect(20,20+bob,7,3,"#affff0");}
      } else if(c.kind==="relay"){
        for(let i=0;i<3;i++)rect(12+i*10,19,5,5,armed?accent:i===1?"#affff0":"#46666c");
        if(armed)rect(8,29,Math.ceil(32*c.timer/3.2),2,accent);
      } else {
        for(const x of [12,21,30]){rect(x,17,3,7,accent);rect(x-2,23,7,2,accent);rect(x,25,3,2,accent);}
      }
      if(!used && Math.abs(p.x+p.w/2-(c.x+c.w/2))<235 && Math.abs(p.y+p.h/2-c.y)<130){
        ctx.textAlign="center";ctx.font="bold 12px sans-serif";ctx.lineWidth=3;ctx.strokeStyle="#0c1720";ctx.fillStyle=accent;
        const label=opened?"수복함 · 접근":armed?"잠금 해제 · 칼날로 베기":c.kind==="blast"?"포격 수복함 · 박격포 유도":"신호 수복함 · 산탄 → 발도";
        ctx.strokeText(label,24,-10);ctx.fillText(label,24,-10);
      }
      ctx.restore();
    }
    function restore(values){claimed=new Set((Array.isArray(values)?values:[]).filter(id=>ids.has(id))); for(const c of cabinets.values()){c.phase="locked";c.timer=0;c.age=0;}}
    return {build,shot,slash,touchLatch,blast,update,draw,restore,save:()=>[...claimed],list:()=>[...cabinets.values()]};
  }
  window.MoonlitFieldCaches={create};
})();
