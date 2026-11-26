/* Act-specific near-field architecture. Rendering only: no world/collision data. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MoonlitEnvironment = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const TAU = Math.PI * 2;
  const THEMES = Object.freeze([
    { name: "salvage-girders", body: "#17242b", face: "#34454b", edge: "#b1cac8", trim: "#65888a", accent: "#65c9bc", recess: "#0e1a22" },
    { name: "refractory-foundry", body: "#28282c", face: "#605347", edge: "#dfc9a1", trim: "#9a8164", accent: "#c99856", recess: "#171c22" },
    { name: "memory-cathedral", body: "#292b3b", face: "#686b7c", edge: "#d5d3e2", trim: "#9b94b0", accent: "#ad98cd", recess: "#191f31" },
    { name: "broadcast-lattice", body: "#14242e", face: "#344f60", edge: "#b7d8e0", trim: "#7793a5", accent: "#ac7899", recess: "#0b1823" },
    { name: "mirror-cradles", body: "#182d31", face: "#3a6064", edge: "#cdf4e6", trim: "#83b1b0", accent: "#84c9b2", recess: "#102128" },
  ].map(Object.freeze));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  // All new artwork is painted into a small, integer-pixel canvas once. No
  // blurred vector edges, live per-pixel loops or huge world-sized bitmaps.
  const PALETTES = Object.freeze([
    ['#080f19','#152c36','#1e4149','#3d6264','#799288','#9abeb6','#987552'],
    ['#130e17','#30232a','#543634','#78503f','#aa7654','#dab17c','#da6e48'],
    ['#10101f','#26273f','#3c3d5a','#5c587b','#8885a5','#c2bacd','#a19abf'],
    ['#080f20','#192c42','#29465d','#416681','#6995a4','#a6c8cd','#a27780'],
    ['#080f16','#192e36','#2b4952','#426974','#729b9f','#b4d8ce','#7791b3'],
  ].map(Object.freeze));
  const seeded = seed => { let n=seed>>>0; return () => {n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;}; };
  function pixels(context, mirror = false) {
    const rect=(x,y,w,h,c)=>{x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);if(w>0&&h>0){context.fillStyle=c;context.fillRect(mirror?512-x-w:x,y,w,h);}};
    const line=(x0,y0,x1,y1,c,width=1)=>{
      x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
      const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy;
      for(let steps=0;steps<2048;steps++){rect(x0,y0,width,width,c);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx;}if(e<=dx){err+=dx;y0+=sy;}}
    };
    const poly=(points,c)=>{
      const top=Math.floor(Math.min(...points.map(v=>v[1]))),bottom=Math.ceil(Math.max(...points.map(v=>v[1])));
      for(let y=top;y<bottom;y++){const xs=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)rect(Math.ceil(xs[i]),y,Math.floor(xs[i+1])-Math.ceil(xs[i])+1,1,c);}
    };
    const ellipse=(x,y,rx,ry,c)=>{for(let row=-Math.ceil(ry);row<=ry;row++){const span=Math.floor(rx*Math.sqrt(Math.max(0,1-row*row/(ry*ry))));rect(x-span,y+row,span*2+1,1,c);}};
    return {rect,line,poly,ellipse};
  }
  function paintScene(context,act,variant,layer) {
    const p=pixels(context,layer==='middle'&&variant%2===1),c=PALETTES[act],random=seeded(971+act*197+variant*7919+layer.length*79);
    const {rect:r,line:l,poly:g,ellipse:e}=p;
    const seam=(x,y,w,h)=>{r(x,y,w,h,c[1]);r(x+1,y+1,w-2,1,c[3]);r(x+1,y+2,1,h-3,c[2]);r(x+w-2,y+3,1,h-4,c[0]);};
    const rivets=(x,y,w)=>{for(let a=x+3;a<x+w-2;a+=11){r(a,y,2,1,c[4]);r(a,y+1,1,1,c[0]);}};
    const stripe=(x,y,w)=>{r(x,y,w,5,c[0]);for(let a=x+1;a<x+w-4;a+=8)g([[a,y],[a+4,y],[a+7,y+5],[a+3,y+5]],c[4]);};
    const rail=(x,y,w)=>{r(x,y,w,2,c[3]);r(x,y+12,w,3,c[1]);for(let a=x+3;a<x+w;a+=13)r(a,y,1,14,c[3]);r(x,y+15,w,2,c[0]);};
    const pipe=(x,y,w,h)=>{r(x,y,w,h,c[0]);r(x+1,y+1,Math.max(1,w-2),Math.max(1,h-2),c[2]);if(w>h){r(x+2,y+1,w-4,1,c[4]);for(let a=x+8;a<x+w-3;a+=24)r(a,y-1,3,h+2,c[3]);}else{r(x+1,y+2,1,h-4,c[4]);for(let a=y+8;a<y+h-3;a+=27)r(x-1,a,w+2,3,c[3]);}};
    const vent=(x,y,w,h)=>{seam(x,y,w,h);r(x+3,y+3,w-6,h-6,c[0]);for(let a=y+5;a<y+h-4;a+=4){r(x+4,a,w-8,1,c[3]);r(x+4,a+1,w-8,1,c[2]);}};
    const panel=(x,y,w,h)=>{seam(x,y,w,h);for(let a=y+5;a<y+h-4;a+=8){r(x+4,a,3,2,c[5]);r(x+10,a,w-15,1,c[3]);if(random()>.4)r(x+w-6,a,2,2,c[6]);}};
    const windows=(x,y,w,h)=>{for(let yy=y;yy<y+h;yy+=11)for(let xx=x;xx<x+w;xx+=9){r(xx,yy,5,7,c[0]);if(random()>.42){r(xx+1,yy+1,3,4,c[3]);if(random()>.7)r(xx+1,yy+1,2,1,c[5]);}}};
    const tank=(x,y,w,h)=>{
      e(x+w/2,y+w/5,w/2,w/5,c[3]);e(x+w/2-2,y+w/5-2,w/2-3,w/5-3,c[2]);
      r(x,y+w/5,w,h-w/5,c[2]);r(x+2,y+w/5,Math.max(2,w*.12),h-w/5,c[3]);
      r(x+w-w*.16,y+w/5,Math.max(2,w*.16),h-w/5,c[1]);r(x+2,y+w/5+1,2,h-w/5-3,c[4]);
      for(let yy=y+w/5+12;yy<y+h;yy+=22){r(x,yy,w,3,c[1]);r(x+3,yy,w-7,1,c[3]);rivets(x,yy,w);}
      for(let n=0;n<18;n++){const xx=x+5+random()*(w-10),yy=y+w/5+random()*(h-w/5);r(xx,yy,1,2+random()*7,c[1]);}
      r(x+5,y+h,w-10,5,c[0]);
    };
    const arch=(x,y,w,h)=>{
      g([[x,y+h],[x,y+w*.4],[x+w/2,y],[x+w,y+w*.4],[x+w,y+h]],c[3]);g([[x+5,y+h],[x+5,y+w*.43],[x+w/2,y+8],[x+w-5,y+w*.43],[x+w-5,y+h]],c[0]);
      r(x+w/2-1,y+13,2,h-14,c[3]);for(let yy=y+w*.6;yy<y+h;yy+=24){r(x+5,yy,w-10,2,c[2]);r(x,yy-4,5,1,c[0]);r(x+w-5,yy+5,5,1,c[0]);}
      l(x+5,y+w*.43,x+w/2,y+8,c[4]);l(x+1,y+w*.43,x+1,y+h-1,c[4]);
    };
    if(layer==='sky'){
      r(0,0,640,360,c[0]);
      for(let y=50;y<360;y+=12){const density=Math.min(.3,(y-30)/1300);for(let x=0;x<640;x+=2)if(random()<density)r(x,y+Math.floor(random()*12),1,1,c[1]);}
      if(act===0||act===3){e(452,67,24,24,c[1]);e(448,65,18,18,c[2]);e(440,59,17,18,c[0]);for(let i=0;i<15;i++)r(432+random()*37,52+random()*30,2,1,c[3]);}
      for(let i=0;i<28;i++){const y=30+random()*240,x=random()*640;r(x,y,12+random()*100,1,c[1]);}
      return;
    }
    if(layer==='far'){
      let x=-18;
      while(x<520){const w=30+Math.floor(random()*65),h=65+Math.floor(random()*105),y=330-h;
        r(x,y,w,h+30,c[1]);r(x+3,y+3,w-6,2,c[2]);
        if(act===0){r(x+8,y-9,w-16,9,c[1]);for(let i=0;i<3;i++){r(x+6+i*16,y-20-i*3,9,20+i*3,c[1]);}windows(x+5,y+16,w-12,h-20);}
        if(act===1){for(let i=0;i<3;i++){const sx=x+4+i*w/3;r(sx,y-25-i*14,8,h+28+i*14,c[1]);r(sx-1,y-25-i*14,10,3,c[2]);}for(let yy=y+15;yy<330;yy+=24)r(x+4,yy,w-8,2,c[2]);r(x+10,319,w-20,4,c[3]);}
        if(act===2){g([[x,y],[x+w/2,y-45],[x+w,y]],c[1]);for(let a=x+5;a<x+w-5;a+=14){r(a,y+16,7,h-25,c[0]);g([[a,y+16],[a+3,y+9],[a+7,y+16]],c[2]);}r(x+w/2-1,y-58,2,18,c[2]);}
        if(act===3){for(let yy=y;yy<330;yy+=17){l(x,yy,x+w,yy+17,c[2]);r(x,yy,w,1,c[2]);}l(x+w/2,y-48,x+w/2,y,c[2]);l(x+w/2-14,y-30,x+w/2+14,y-30,c[2]);}
        if(act===4){g([[x,y],[x+8,y-14],[x+w-8,y-14],[x+w,y]],c[2]);for(let a=x+7;a<x+w-5;a+=17){r(a,y+14,9,h-28,c[0]);r(a+2,y+16,2,h-35,c[2]);r(a+2,y+h-20,5,2,c[3]);}}
        x+=w+8+Math.floor(random()*22);
      }
      // Distant transport links connect the silhouettes without repeating a wall.
      rail(-10,291+variant*3,540);return;
    }
    const shift=(variant%3-1)*26;
    // Small scene-specific apparatus is deliberately asymmetric. Rotating
    // variants changes the composition, not merely a noise/color seed.
    if(variant%3===0){
      pipe(473,21,7,181);pipe(430,21,49,7);panel(420,33,45,54);
      l(451,88,451,154,c[2]);l(452,154,431,174,c[3]);r(427,174,9,3,c[4]);
    }else if(variant%3===1){
      rail(22,95,104);r(24,111,9,107,c[1]);l(32,119,116,161,c[2],2);
      seam(33,67,49,27);vent(37,72,20,15);r(64,76,9,2,c[6]);
    }else{
      pipe(19,24,6,135);pipe(29,24,4,118);pipe(19,21,79,6);
      l(76,28,85,88,c[2]);l(85,88,111,105,c[3]);panel(94,106,33,25);
    }
    if(act===0){
      // Abandoned dock: asymmetrical gantry, lifting hook, stacked cargo and fan house.
      const x=100+shift;r(x,69,13,286,c[1]);r(x+176,93,16,262,c[1]);
      for(let y=82;y<343;y+=29){l(x+2,y,x+10,y+24,c[3]);l(x+179,y,x+189,y+24,c[3]);}
      seam(x-20,66,236,13);rivets(x-20,70,236);rail(x-20,51,236);
      const trolley=variant%2?80:33,chainEnd=variant%3===0?180:165;
      seam(x+trolley-9,76,24,8);l(x+trolley,84,x+trolley,chainEnd,c[3]);l(x+trolley+5,84,x+trolley+5,chainEnd,c[2]);seam(x+trolley-7,chainEnd-2,19,12);
      l(x+trolley+2,chainEnd+11,x+trolley+2,chainEnd+19,c[4]);l(x+trolley+2,chainEnd+19,x+trolley+11,chainEnd+25,c[4],2);l(x+trolley+11,chainEnd+25,x+trolley+17,chainEnd+19,c[4],2);
      seam(x+111,222,119,127);vent(x+125,238,41,55);panel(x+178,238,35,38);
      pipe(x+116,213,96,7);pipe(x+211,167,8,56);stripe(x+116,337,107);
      for(let n=0;n<5;n++){const bx=18+(n%3)*37,by=307-Math.floor(n/3)*31;seam(bx,by,34,29);l(bx+3,by+3,bx+30,by+25,c[3]);rivets(bx,by+25,34);}
      e(396,258,42,42,c[1]);e(396,258,36,36,c[3]);e(396,258,32,32,c[0]);
      for(let n=0;n<8;n++){const a=n*Math.PI/4;g([[396,258],[396+Math.cos(a)*27,258+Math.sin(a)*27],[396+Math.cos(a+.5)*31,258+Math.sin(a+.5)*31]],c[2]);}e(396,258,7,7,c[4]);
      r(355,300,82,47,c[1]);pipe(431,263,53,8);rail(323,326,180);
    }else if(act===1){
      // Smelter: refractory furnace, service stairs, branching pipes and heat slits.
      const x=163+shift;tank(x,92,118,250);g([[x-8,108],[x+29,66],[x+89,66],[x+126,108]],c[3]);
      for(let rib=0;rib<5;rib++)l(x+rib*28-5,106,x+32+rib*13,69,c[2]);
      for(let yy=80;yy<106;yy+=8)r(x+23-(yy-80)*.8,yy,69+(yy-80)*1.6,1,c[2]);
      pipe(x+45,29,26,44);pipe(x+16,154,155,11);pipe(x+161,152,11,167);
      for(let yy=127;yy<314;yy+=39){r(x+18,yy,81,24,c[0]);for(let a=0;a<8;a++)r(x+22+a*9,yy+5,4,14,a%3===variant%3?c[6]:c[2]);rivets(x,yy+27,118);}
      rail(x-22,216,156);rail(x-8,316,146);panel(x+130,263,28,57);
      for(let i=0;i<5;i++){l(54+i*12,339-i*18,67+i*12,339-i*18,c[4],2);l(54+i*12,339-i*18,66+i*12,321-i*18,c[2],2);}
      tank(26,209,39,132);tank(374,143,52,198);pipe(385,101,13,48);pipe(326,185,65,8);pipe(318,185,8,159);
      r(367,309,74,33,c[1]);stripe(371,311,66);vent(448,274,43,62);
    }else if(act===2){
      // Archive cathedral: data reliquaries behind broken tracery and worn stone.
      const x=134+shift;arch(x,39,175,314);arch(x+18,81,139,267);
      for(let side=0;side<2;side++){const sx=x-20+side*202;seam(sx,114,13,237);g([[sx-3,114],[sx+6,73],[sx+16,114]],c[3]);for(let y=143;y<350;y+=38)r(sx-3,y,19,5,c[3]);}
      e(x+88,145,40,40,c[3]);e(x+88,145,35,35,c[0]);
      for(let n=0;n<8;n++){const a=n*Math.PI/4;l(x+88,145,x+88+Math.cos(a)*34,145+Math.sin(a)*34,c[4]);}
      for(let n=0;n<16;n++){const a=n*Math.PI/8;e(x+88+Math.cos(a)*28,145+Math.sin(a)*28,2,2,n%2?c[2]:c[4]);}
      e(x+88,145,10,10,c[2]);e(x+88,145,5,5,c[5]);
      for(let i=0;i<5;i++){const sx=x+25+i*27;seam(sx,220,19,98);panel(sx+2,227,15,67);r(sx+5,310,8,2,c[5]);}
      arch(29,191,61,156);arch(365,127,88,220);rail(x-38,323,248);
      for(let i=0;i<12;i++){const xx=x+random()*175,yy=188+random()*140;r(xx,yy,5,1,c[3]);}
      l(377,72,367,151,c[3]);l(377,72,411,158,c[2]);l(377,72,427,119,c[3]);
    }else if(act===3){
      // Communications abyss: triangulated mast, offset dishes and severed feeders.
      const x=222+shift;g([[x-63,349],[x-21,63],[x+21,63],[x+65,349]],c[1]);
      for(let y=78;y<332;y+=35){const w=20+(y-63)*.14;l(x-w,y,x+w+5,y+35,c[3],2);l(x+w,y,x-w-5,y+35,c[2],2);r(x-w,y,w*2,2,c[4]);}
      pipe(x-4,28,9,308);l(x-32,51,x+32,51,c[4],2);l(x-22,37,x+22,37,c[3]);
      for(let side=0;side<2;side++){const sx=x+(side?49:-70),sy=side?199:125;e(sx,sy,28,36,c[3]);e(sx+(side?-6:6),sy,21,29,c[1]);l(sx,sy,sx+(side?-39:39),sy-14,c[4]);r(sx-2,sy-4,5,7,c[5]);}
      for(let i=0;i<4;i++){l(x-16+i*5,74,x-25+i*5,236,c[0]);r(x-27+i*7,247,4,8,c[3]);}
      rail(x-113,265,228);seam(24,254,108,94);for(let i=0;i<4;i++)panel(31+i*24,264,20,63);
      seam(383,212,74,134);vent(391,222,57,26);panel(392,260,23,57);pipe(465,148,7,192);
      for(let i=0;i<5;i++){l(42+i*8,200,68+i*12,233,c[2]);l(68+i*12,233,150+i*10,211,c[2]);}
      r(x-2,23,5,3,c[6]);
    }else{
      // Memory laboratory: individual stasis beds, glass seams and a split core.
      const x=181+shift;g([[x-45,343],[x-56,113],[x-30,55],[x+30,55],[x+56,113],[x+45,343]],c[2]);
      g([[x-33,336],[x-40,115],[x-23,70],[x+23,70],[x+40,115],[x+33,336]],c[0]);
      e(x,194,31,92,c[3]);e(x,194,26,87,c[1]);g([[x-18,145],[x-7,129],[x+18,251],[x+8,268]],c[2]);
      l(x-23,160,x-16,131,c[4]);l(x-23,163,x-23,201,c[4]);l(x+23,210,x+17,256,c[2]);
      r(x-7,151,14,16,c[4]);r(x-11,170,22,39,c[2]);l(x-9,211,x-14,243,c[3],4);l(x+7,211,x+12,243,c[3],4);r(x-4,157,10,2,c[5]);
      for(let y=95;y<329;y+=31){r(x-49,y,13,4,c[3]);r(x+37,y,13,4,c[3]);}panel(x-24,298,48,27);
      for(let i=0;i<3;i++){const sx=316+i*48,sy=172+(i%2)*23;seam(sx,sy,39,174-(i%2)*23);r(sx+5,sy+9,29,124-(i%2)*23,c[0]);r(sx+7,sy+12,3,114-(i%2)*23,c[3]);r(sx+15,sy+36,12,13,c[2]);r(sx+12,sy+52,18,35,c[2]);panel(sx+5,321,29,18);}
      vent(28,244,80,32);seam(29,281,79,64);panel(35,289,65,39);pipe(54,193,7,51);pipe(54,186,88,9);
      rail(120,338,354);l(139,58,139,218,c[3]);l(143,58,143,155,c[2]);
    }
    // Authored equipment gets deterministic wear, bolt highlights and fine soot.
    for(let i=0;i<340;i++){const x=8+random()*496,y=155+random()*195;r(x,y,random()>.92?3:1,1,random()>.65?c[2]:c[1]);}
    for(let i=0;i<3;i++){const x=18+i*181+(variant*17)%43;rail(x,349,54);}
  }
  function paintSurface(context,act,variant){
    const p=pixels(context),{rect:r,line:l,poly:g}=p,c=PALETTES[act],random=seeded(53+act*101+variant*391);
    r(0,0,64,64,c[1]);
    if(act===0){
      r(3,4,58,54,c[0]);l(4,4,59,58,c[2],4);l(59,4,4,58,c[2],3);
      r(0,0,64,4,c[3]);r(0,58,64,6,c[2]);r(1,4,3,54,c[3]);
      for(let i=0;i<4;i++){r(9+i*15,1,2,1,c[4]);r(9+i*15,60,2,1,c[3]);}
      if(variant===1){r(23,23,19,13,c[1]);for(let i=0;i<3;i++)r(26,26+i*3,13,1,c[4]);}
    }else if(act===1){
      for(let y=0;y<64;y+=16)for(let x=(y%32?-16:0);x<64;x+=32){r(x+1,y+1,30,14,c[2]);r(x+2,y+2,28,1,c[3]);r(x+29,y+3,1,11,c[0]);}
      r(5,8,54,5,c[1]);r(6,8,52,1,c[4]);r(48,0,6,64,c[1]);r(49,0,1,64,c[3]);
      if(variant===2){r(13,26,22,23,c[0]);for(let x=16;x<33;x+=5)r(x,29,2,16,c[3]);}
    }else if(act===2){
      r(2,2,60,60,c[2]);r(4,4,56,56,c[1]);g([[8,59],[8,24],[32,7],[56,24],[56,59]],c[3]);g([[11,59],[11,25],[32,12],[53,25],[53,59]],c[0]);
      l(31,13,31,58,c[2],2);r(10,36,43,2,c[2]);r(2,2,60,1,c[4]);
      if(variant===1){l(8,5,20,10,c[0]);l(20,10,17,16,c[0]);l(17,16,23,20,c[0]);}
    }else if(act===3){
      r(4,4,55,53,c[0]);for(let y=10;y<58;y+=13){l(6,y,57,y+13,c[2],2);l(57,y,6,y+13,c[2]);}
      r(1,0,4,64,c[3]);r(59,0,4,64,c[3]);r(0,0,64,3,c[4]);r(1,61,62,3,c[2]);
      if(variant===2){r(17,19,30,22,c[1]);r(21,23,22,10,c[2]);r(23,25,5,2,c[4]);r(37,36,3,1,c[6]);}
    }else{
      g([[8,2],[57,2],[62,8],[62,54],[54,62],[3,62],[3,9]],c[3]);g([[10,5],[54,5],[58,10],[58,51],[51,58],[7,58],[7,12]],c[0]);
      g([[11,11],[23,8],[53,49],[43,54]],c[2]);l(9,53,51,53,c[3]);r(10,7,39,1,c[4]);
      if(variant===1){l(36,14,28,23,c[3]);l(28,23,34,29,c[3]);l(34,29,30,43,c[3]);}
    }
    for(let i=0;i<65;i++){const x=Math.floor(random()*64),y=Math.floor(random()*64);r(x,y,1,1,random()>.7?c[3]:c[1]);}
  }
  // A foundation is a run of constructed bays, not one 64px wall tile
  // stamped in a checkerboard. Small landing ledges have their own span artwork.
  // Each face is drawn at native 2× pixels; hardware is recessed below the lip.
  const FLOOR_WIDTHS = [256,384,192,320,448,192,256]; // 2048 world pixels
  const FLOOR_FORMS = [0,1,0,2,3,0,4]; // quiet slab, structure, service, repair, grate
  function floorMix(n) { n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return (n^(n>>>16))>>>0; }
  function paintGroundBay(context,act,form,w,variation,training) {
    const {rect:r,line:l,poly:g}=pixels(context),c=PALETTES[act],
      rnd=seeded((act+1)*104729+w*41+form*773+variation*11), h=96;
    const side=variation? .28:.64, fixture=Math.floor(w*side);
    const bolt=(x,y)=>{r(x,y,3,2,c[0]);r(x,y,2,1,c[4]);};
    const joint=(x,y,len)=>{r(x,y,2,len,c[0]);r(x+2,y,1,len,c[3]);};
    const plate=(x,y,pw,ph,fill=c[2])=>{
      g([[x+3,y],[x+pw-2,y],[x+pw,y+2],[x+pw,y+ph-2],[x+pw-2,y+ph],[x+1,y+ph],[x,y+ph-2],[x,y+3]],c[0]);
      r(x+2,y+2,pw-4,ph-4,fill);r(x+4,y+1,pw-8,1,c[3]);bolt(x+4,y+4);bolt(x+pw-8,y+ph-5);
    };
    const grille=(x,y,gw,gh)=>{r(x,y,gw,gh,c[3]);r(x+2,y+2,gw-4,gh-4,c[0]);
      for(let a=x+4;a<x+gw-5;a+=6){r(a,y+3,2,gh-6,c[2]);r(a,y+3,1,gh-8,c[3]);}};
    const pipe=(x,y,pw)=>{r(x,y,pw,6,c[0]);r(x,y+1,pw,3,c[3]);r(x,y+1,pw,1,c[4]);for(let a=x+9;a<x+pw-3;a+=32){r(a,y-1,4,8,c[2]);r(a,y,1,6,c[4]);}};
    const masonry=(y0,brickH,baseW)=>{for(let y=y0;y<h;y+=brickH){
      for(let x=-Math.floor(rnd()*baseW);x<w;){const bw=baseW-8+Math.floor(rnd()*21);
        r(x+1,y+1,bw-2,brickH-2,rnd()<.22?c[1]:c[2]);
        r(x+2,y+1,bw-4,1,c[3]);r(x+bw-2,y+2,1,brickH-4,c[1]);x+=bw;}
    }};
    r(0,0,w,h,c[1]);r(0,4,w,40,c[2]);r(0,44,w,2,c[0]);r(0,46,w,1,c[2]);
    if(act===0){ // Salvage: salvaged steel lips, a splice, a trestle, a patch and a drain.
      if(form===0){plate(5,9,w-12,24);l(9,37,w-11,36,c[1]);r(fixture,19,13,1,c[3]);}
      if(form===1){r(3,10,w-6,37,c[0]);r(3,43,w-6,4,c[3]);g([[9,40],[w-21,12],[w-11,12],[21,40]],c[2]);l(12,40,w-17,13,c[3]);joint(w-9,8,49);}
      if(form===2){pipe(0,32,w);plate(fixture-18,8,39,23);grille(fixture-11,14,21,9);}
      if(form===3){plate(4,9,w*.64,26);plate(w*.51,16,w*.45,21);for(let i=0;i<4;i++)r(w*.55+i*7,15,3,2,c[4]);}
      if(form===4){grille(9,10,w*.52,21);r(w*.66,14,w*.25,3,c[3]);joint(w*.7,24,19);}
    }else if(act===1){ // Hot masonry, cold service hatches and manifolds alternate.
      masonry(6,13,46);
      if(form===1){r(w*.25,7,14,75,c[1]);r(w*.25+2,7,5,64,c[3]);pipe(0,26,w*.65);}
      if(form===2){plate(fixture-23,9,48,34);grille(fixture-16,16,31,19);r(fixture-8,30,9,1,c[6]);}
      if(form===3){plate(6,8,w-12,32);l(fixture-7,11,fixture,18,c[1]);l(fixture,18,fixture-4,25,c[0]);l(fixture-4,25,fixture+5,28,c[1]);}
      if(form===4){r(8,11,w-16,20,c[0]);for(let x=11;x<w-12;x+=10){r(x,13,5,16,c[2]);r(x,13,1,14,c[3]);}pipe(w*.19,37,w*.71);}
    }else if(act===2){ // Stone courses, occasional fluted plinth or restrained broken inlay.
      masonry(8,22,66);
      if(form===1){const x=fixture-14;g([[x-6,37],[x-6,31],[x,28],[x,8],[x+27,8],[x+27,28],[x+34,31],[x+34,37]],c[3]);
        r(x+2,10,23,19,c[2]);for(let j=0;j<3;j++)r(x+4+j*7,10,2,16,c[1]);}
      if(form===2){plate(fixture-23,12,47,17,c[1]);l(fixture-12,20,fixture,15,c[3]);l(fixture,15,fixture+12,20,c[3]);r(fixture-10,22,20,1,c[3]);}
      if(form===3){const x=w*.39;l(x,8,x+7,16,c[0],2);l(x+7,16,x+3,22,c[0]);l(x+3,22,x+14,29,c[0]);r(x+7,19,7,1,c[3]);}
      if(form===4){r(13,12,w-26,17,c[1]);for(let i=20;i<w-21;i+=20){g([[i,25],[i,19],[i+5,15],[i+10,19],[i+10,25]],c[0]);}}
    }else if(act===3){ // Cable raceway, bolted lids, tension plate and access bay.
      r(0,11,w,25,c[0]);r(0,34,w,4,c[3]);
      if(form===0){plate(3,9,w-6,25);r(12,15,w*.37,2,c[1]);}
      if(form===1){for(let n=0;n<3;n++){const end=16+n*5;l(0,end,w*.45,end,c[2],2);l(w*.45,end,w*.7,end+5,c[2],2);l(w*.7,end+5,w,end+5,c[2],2);}r(fixture,12,5,22,c[3]);}
      if(form===2){plate(4,9,w*.43,26);grille(w*.51,11,w*.41,20);}
      if(form===3){g([[6,30],[24,11],[w-10,11],[w-26,30]],c[2]);bolt(22,25);bolt(w-22,16);l(12,30,25,15,c[3]);}
      if(form===4){pipe(0,25,w);plate(fixture-15,7,34,24);r(fixture-7,13,17,3,c[3]);}
    }else{ // Vault: solid ceramic, isolated glass inserts, flexible seals and inspection ports.
      plate(3,9,w-7,29,form===0?c[2]:c[1]);
      if(form===1||form===3){const x=Math.max(8,fixture-25),pw=Math.min(w-x-8,53);
        g([[x+5,12],[x+pw-4,12],[x+pw,16],[x+pw-3,32],[x,32],[x,17]],c[3]);
        r(x+3,16,pw-6,14,c[0]);g([[x+7,16],[x+16,16],[x+31,29],[x+22,29]],c[2]);
        if(form===3){l(x+35,15,x+30,21,c[3]);l(x+30,21,x+34,25,c[2]);}}
      if(form===2){plate(fixture-16,12,32,19,c[0]);r(fixture-9,18,18,6,c[2]);r(fixture-7,19,4,1,c[4]);}
      if(form===4){for(let x=10;x<w-12;x+=13){r(x,14,4,16,c[0]);r(x+4,14,1,13,c[3]);}pipe(9,39,w-18);}
    }
    // Local blemishes in clusters, not a repeating noise grid. Keep the recess
    // darker below the immediate walkable rim so it cannot look like a second ledge.
    if(act!==1&&act!==2){r(0,52,w,6,c[0]);r(0,52,w,1,c[2]);joint(w*.28,58,34);}
    for(let n=0;n<7;n++){const x=Math.floor(rnd()*(w-8)),y=8+Math.floor(rnd()*36);r(x,y,2+Math.floor(rnd()*6),1,c[1]);}
    r(0,3,w,3,c[3]);r(0,6,w,1,c[0]);r(0,3,2,5,c[0]);r(w-3,3,2,3,c[1]);
    if(training){for(let j=0;j<(form===0?2:4);j++)r(8+j*6,4,3,1,c[5]);}
  }

  // One drawing for the actual length and thickness of the walkable span.
  // Hardware has a load-bearing shape and terminates at the two real ends;
  // no ornamental shelf or wire extends the collision silhouette.
  function paintLedge(context,act,w,h,variant,training,leftEnd,rightEnd) {
    const {rect:r,line:l,poly:g}=pixels(context),t=THEMES[act],c=PALETTES[act], mid=Math.floor(w/2);
    const foot=h-1,deck=Math.max(3,Math.min(5,Math.floor(h*.36))), low=foot-2;
    const rand=seeded(4471+act*313+variant*119+w*17+h*29);
    const fold=Math.min(4,Math.max(2,h-deck-2)),lf=leftEnd?fold:0,rf=rightEnd?fold:0;
    const inset=Math.min(14,Math.max(5,Math.floor(w*.075)));
    const socket=(x,tw)=>{r(x,foot-3,tw,3,t.recess);r(x+2,foot-2,tw-4,1,t.trim);};
    const bolt=(x,y)=>{r(x,y,2,2,c[0]);r(x,y,1,1,c[4]);};
    g([[0,1],[w,1],[w,foot-rf],[w-rf,h],[lf,h],[0,foot-lf]],t.recess);
    r(0,1,w,deck-1,t.face);r(1,deck-1,w-2,1,t.trim);
    if(training){
      // The static drill treads no longer resemble a moving conveyor.
      r(3,deck,w-6,Math.max(2,low-deck),c[2]);
      l(inset,low,inset+12,deck,c[3],2);l(w-inset-12,deck,w-inset,low,c[3],2);
      const rail=Math.min(32,w*.27);r(mid-rail/2,deck+1,rail,1,c[3]);
      for(let n=0;n<3;n++)r(inset+6+n*4,2,2,1,c[5]);
    }else if(act===0){ // Salvage catwalk: single flanged I-beam, spliced cover, gussets.
      r(lf,low,w-lf-rf,1,t.face);r(3,deck,w-6,1,c[2]);
      const a=Math.min(w*.22,18),b=Math.min(w*.23,24);
      g([[lf+1,deck],[lf+1+a,deck],[lf+4,low+1]],t.face);
      g([[w-rf-b,deck],[w-rf-1,deck],[w-rf-4,low+1]],t.face);
      const splice=Math.floor(w*(variant%2?.59:.39)), sw=Math.min(18,Math.floor(w*.16));
      r(splice-sw,deck-2,2*sw,deck>=4?4:3,c[3]);bolt(splice-sw+1,deck-1);bolt(splice+sw-3,deck-1);
      l(splice-sw,deck+1,splice-sw-8,low,c[2],2);l(splice+sw,deck+1,splice+sw+8,low,c[2],2);
    }else if(act===1){ // Heatshield blocks above a recessed cooling manifold.
      r(4,1,w-8,deck-1,c[3]);let seam=9+variant*2;
      while(seam<w-5){r(seam,1,1,deck-1,c[0]);seam+=18+Math.floor(rand()*18);}
      const py=Math.min(low,deck+2);r(inset,py,w-2*inset,2,c[2]);r(inset,py,w-2*inset,1,t.trim);
      for(const x of [inset,Math.floor(w*.54),w-inset-3])r(x,deck,3,Math.max(2,foot-deck),t.face);
      const vx=Math.floor(w*(variant%2?.32:.67));r(vx-7,deck,15,Math.max(3,foot-deck),c[0]);
      for(let n=0;n<3;n++){r(vx-5+n*4,deck+1,2,2,c[3]);r(vx-5+n*4,deck+1,1,1,c[4]);}
    }else if(act===2){ // A complete stone corbelled shelf, not the tips of wall arches.
      g([[1,deck-1],[w-1,deck-1],[w-6,low],[6,low]],c[2]);
      r(5,low,w-10,1,t.trim);
      const stone1=Math.floor(w*(variant%2?.31:.39)), stone2=Math.floor(w*.71);
      l(stone1,2,stone1+2,low,c[1]);l(stone2,2,stone2-2,low,c[1]);
      const key=Math.min(12,Math.floor(w*.11));
      g([[mid-key,2],[mid+key,2],[mid+key-3,foot],[mid-key+3,foot]],t.face);
      l(mid-key+1,3,mid-key+4,low,t.trim);r(mid-3,deck,6,1,c[4]);
      for(const x of [inset,w-inset-6]){r(x,low-1,6,2,t.face);r(x+1,foot-1,4,1,c[3]);}
    }else if(act===3){ // Tension bridge: bottom chord and complete triangulated bays.
      r(lf+1,low,w-lf-rf-2,2,t.face);
      const bays=Math.max(2,Math.min(6,Math.round(w/33)));
      for(let j=0;j<bays;j++){const a=inset+(w-2*inset)*j/bays,b=inset+(w-2*inset)*(j+1)/bays;
        l(a,j%2?low:deck,b,j%2?deck:low,c[3],2);}
      for(const x of [inset-3,w-inset]){r(x,deck-1,4,Math.max(3,foot-deck),t.face);bolt(x+1,deck);}
      r(mid-9,1,18,2,c[2]);r(mid-4,2,8,1,t.trim);
    }else{ // Ceramic induction raft: two downward-facing shoes frame one glass inset.
      g([[2,deck],[w-2,deck],[w-8,foot-1],[8,foot-1]],t.face);
      const gw=Math.min(48,Math.floor(w*.35)), gx=mid-Math.floor(gw/2);
      g([[gx,deck],[gx+gw,deck],[gx+gw-3,low],[gx+3,low]],t.recess);
      l(gx+5,deck+1,gx+13,low,c[3]);r(gx+12,deck+1,Math.max(2,gw-22),1,c[2]);
      const tw=Math.min(16,Math.max(7,Math.floor(w*.13)));socket(inset,tw);socket(w-inset-tw,tw);
    }
    for(const end of [leftEnd?0:null,rightEnd?w-1:null]){
      if(end===null)continue;
      const sign=end===0?1:-1,plug=end===0?0:w-5;
      g([[end,1],[end+sign*6,1],[end+sign*6,deck],[end+sign*3,low],[end+sign,low-1]],t.face);
      r(plug+1,2,3,1,t.trim);bolt(end+sign*3,deck);
    }
    // A few worn tread markings, scoped to the span, never a tiled light strip.
    for(let n=0;n<Math.min(5,w/28);n++){const sx=7+Math.floor(rand()*Math.max(1,w-16));r(sx,1,2+Math.floor(rand()*5),1,c[3]);}
    r(0,0,w,1,t.edge);
  }

  function createRenderer(ctx, options = {}) {
    const cache=new Map(), stats={rasterBuilds:0,cacheHits:0};
    const canvasFactory=options.canvasFactory || ((w,h)=>{
      if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(w,h);
      if(typeof HTMLCanvasElement!=='undefined'&&typeof document!=='undefined'){
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return canvas;
      }
      return null;
    });
    function raster(key,w,h,painter){
      if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);stats.cacheHits++;return value;}
      const canvas=canvasFactory(w,h),context=canvas?.getContext?.('2d');if(!context)return null;
      context.imageSmoothingEnabled=false;painter(context);stats.rasterBuilds++;
      cache.set(key,canvas);if(cache.size>32)cache.delete(cache.keys().next().value);return canvas;
    }
    function scene(act,variant,layer){return raster(`${act}:${variant}:${layer}`,layer==='sky'?640:512,360,c=>paintScene(c,act,variant,layer));}
    function drawBackground(stageIndex,view){
      const act=clamp(Math.trunc(stageIndex),0,4),sky=scene(act,0,'sky');if(!sky)return false;
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=1;
      ctx.drawImage(sky,0,0,view.w,view.h);
      const relativeX=view.x-(view.stageX||0);
      for(const layer of [{name:'far',speed:.12,alpha:.65,y:.06},{name:'middle',speed:.29,alpha:.78,y:.12}]){
        const offset=relativeX*layer.speed,tileW=1024,first=Math.floor(offset/tileW);
        ctx.globalAlpha=layer.alpha;
        for(let cell=first-1;cell<=first+Math.ceil(view.w/tileW);cell++){
          const variant=((cell%7)+7)%7,tile=scene(act,variant,layer.name);
          if(tile)ctx.drawImage(tile,Math.round((cell*tileW-offset)/2)*2,Math.round(-view.y*layer.y/2)*2,tileW,720);
        }
      }
      // Sparse slow pixel motes: never large flashes or fullscreen camera shake.
      ctx.globalAlpha=.28;
      const c=PALETTES[act],count=view.mobile?12:24;
      for(let i=0;i<count;i++){
        const x=((i*181+(view.time||0)*(act===1?5:2)-relativeX*.035)%(view.w+40)+view.w+40)%(view.w+40)-20;
        const y=((i*71-(view.time||0)*3)%(view.h-80)+view.h-80)%(view.h-80)+40;
        ctx.fillStyle=i%5===0?c[5]:c[3];ctx.fillRect(Math.round(x/2)*2,Math.round(y/2)*2,2,2);
      }
      ctx.restore();return true;
    }
    // Two physical rooms can share a viewport. The new backdrop should come
    // in through the gate, not repaint the entire sky on the player's first
    // step into the next act. Reuse this pixel stencil at every boundary.
    let transitionStencil = null, stencilSize = '';
    const seamWidth = 32;
    function getTransitionStencil(w,h) {
      if (typeof Path2D !== 'function') return null;
      const size = w + ':' + h;
      if (stencilSize === size && transitionStencil) return transitionStencil;
      const shape = new Path2D(), order = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5], cell = 4;
      shape.rect(seamWidth,0,w+2*seamWidth,h);
      for(let row=0;row<h/cell;row++){
        let start=-1;
        for(let column=0;column<=16;column++){
          const visible=column<16 && order[(row%4)*4+(column%4)]<column;
          if(visible && start<0)start=column;
          if(!visible && start>=0){
            shape.rect(-seamWidth+start*cell,row*cell,(column-start)*cell,cell);
            start=-1;
          }
        }
      }
      stencilSize=size; transitionStencil=shape;
      return shape;
    }
    function drawCampaignBackground(stages, view) {
      if (!stages?.length) return false;
      let left = 0;
      while (left < stages.length-1 && stages[left].end <= view.x-seamWidth) left++;
      const draw = i => drawBackground(i, {...view,stageX:stages[i].x});
      if (!draw(left)) return false;
      if (left === stages.length-1) return true;
      const seam = Math.round((stages[left+1].x-view.x)/2)*2;
      if (seam >= view.w+seamWidth) return true;
      ctx.save();ctx.translate(seam,0);
      const stencil=getTransitionStencil(view.w,view.h);
      if(stencil)ctx.clip(stencil);
      else {ctx.beginPath();ctx.rect(0,0,view.w+seamWidth,view.h);ctx.clip();}
      ctx.translate(-seam,0);draw(left+1);ctx.restore();
      return true;
    }
    const polygon = (points, fill, stroke = null, width = 1) => {
      ctx.beginPath();
      points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
    };
    const line = (x1, y1, x2, y2, color, width = 1) => {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    const rect = (x, y, w, h, color) => {
      if (w <= 0 || h <= 0) return;
      ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
    };
    const visible = (object, view, padding = 0) => object.x + object.w > view.x - padding
      && object.x < view.x + view.w + padding && object.y + object.h > view.y - padding
      && object.y < view.y + view.h + padding;

    function drawFoundation(platform,act,view) {
      const {x,y,w,h}=platform,theme=THEMES[act],c=PALETTES[act],training=platform.kind==='training';
      const left=Math.max(x,view.x-2),right=Math.min(x+w,view.x+view.w+2);
      const top=Math.max(y,view.y-2),bottom=Math.min(y+h,view.y+view.h+2);
      if(right<=left||bottom<=top)return true;
      const bay=(bw,form,v)=>raster(`floor:${act}:${+training}:${bw}:${form}:${v}`,bw/2,96,
        pc=>paintGroundBay(pc,act,form,bw/2,v,training));
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
      ctx.fillStyle=c[1];ctx.fillRect(left,top,right-left,bottom-top);
      // World-space segmentation lets a narrow extension inherit exactly the
      // cut face of its neighbouring slab. Camera motion cannot regenerate it.
      for(let group=Math.floor(left/2048);group<=Math.floor((right-0.001)/2048);group++){
        const code=floorMix(group+act*317+24071),turn=code%7,motif=(code>>>5)%7,dir=(code&256)?1:-1;
        let ax=group*2048;
        for(let j=0;j<7;j++){
          const bw=FLOOR_WIDTHS[(turn+dir*j+7)%7],bx=ax+bw;
          if(bx>left&&ax<right){
            const form=FLOOR_FORMS[(motif+j)%7],v=(code>>>(9+j))&1;
            if(top<y+192){
              const tile=bay(bw,form,v);
              if(!tile){ctx.restore();return false;}
              ctx.drawImage(tile,ax,y,bw,192);
            }
            if(bottom>y+192){
              // Broad, quiet retaining courses below the detailed service band.
              const start=Math.max(0,Math.floor((top-y-192)/164));
              for(let k=start;k<=Math.floor((bottom-y-192)/164);k++){
                const yy=y+192+k*164,cut=ax+Math.floor(bw*(k%2?.63:.27)/2)*2;
                ctx.fillStyle=c[0];ctx.fillRect(ax,yy,bw,4);ctx.fillRect(cut,yy+4,4,160);
                ctx.fillStyle=c[2];ctx.fillRect(ax,yy+4,bw,2);
              }
            }
          }
          ax=bx;
        }
      }
      ctx.fillStyle=theme.edge;ctx.fillRect(left,y,right-left,2);
      ctx.fillStyle=theme.trim;ctx.fillRect(left,y+2,right-left,2);
      ctx.fillStyle=theme.recess;ctx.fillRect(left,y+6,right-left,2);
      ctx.restore();return true;
    }
    // Separate small, bounded bank so a room full of different ledge sizes
    // cannot evict the larger backdrop or foundation tiles. Widths above
    // 640 world pixels are assembled from culled sections (custom editor).
    const ledgeBank=new Map();
    function drawLedge(platform,act,view) {
      const {x,y,w,h}=platform,training=platform.kind==='training',ph=Math.ceil(h/2);
      const variant=floorMix(Math.floor(x/4)+act*197)%3,theme=THEMES[act];
      // Balance custom bridge sections so a 641px bridge never ends in an
      // isolated one-pixel-wide second span. Natural ledges fit one section.
      const step=2*Math.ceil(w/(2*Math.ceil(w/640)));
      const left=Math.max(x,view.x-2),right=Math.min(x+w,view.x+view.w+2);
      if(right<=left)return true;
      const first=Math.max(0,Math.floor((left-x)/step));
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
      for(let i=first;x+i*step<right;i++){
        const at=i*step,sw=Math.min(step,w-at),pw=Math.ceil(sw/2),a=at===0,b=at+sw>=w;
        const key=[act,+training,pw,ph,variant,+a,+b].join(':');
        let image=ledgeBank.get(key);
        if(!image){
          image=canvasFactory(pw,ph);const pc=image?.getContext?.('2d');
          if(!pc){ctx.restore();return false;}
          pc.imageSmoothingEnabled=false;paintLedge(pc,act,pw,ph,variant,training,a,b);
          stats.rasterBuilds++;
          if(ledgeBank.size>=48)ledgeBank.delete(ledgeBank.keys().next().value);
        }else {ledgeBank.delete(key);stats.cacheHits++;}
        ledgeBank.set(key,image);
        ctx.drawImage(image,x+at,y,2*pw,2*ph);
      }
      ctx.fillStyle=theme.edge;ctx.fillRect(left,y,right-left,2);
      ctx.restore();return true;
    }
    function drawPixelPlatform(platform,act,view){
      const probe=raster(`surface:${act}:0`,64,64,c=>paintSurface(c,act,0));if(!probe)return false;
      const {x,y,w,h}=platform,theme=THEMES[act],tileSize=128;
      const left=Math.max(x,view.x-2),right=Math.min(x+w,view.x+view.w+2),top=Math.max(y,view.y-2),bottom=Math.min(y+h,view.y+view.h+2);
      if(right<=left||bottom<=top)return true;
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
      ctx.fillStyle=PALETTES[act][1];ctx.fillRect(left,top,right-left,bottom-top);
      for(let row=Math.max(0,Math.floor((top-y)/tileSize));row<=Math.floor((bottom-y)/tileSize);row++){
        for(let col=Math.max(0,Math.floor((left-x)/tileSize));col<=Math.floor((right-x)/tileSize);col++){
          const variant=((col*5+row+Math.floor(x/113))%3+3)%3;
          const tile=variant?raster(`surface:${act}:${variant}`,64,64,c=>paintSurface(c,act,variant)):probe;
          ctx.drawImage(tile,x+col*tileSize,y+row*tileSize,tileSize,tileSize);
        }
      }
      // Exact collision edge wins over the weathered material beneath it.
      ctx.fillStyle=theme.edge;ctx.fillRect(left,y,right-left,Math.min(2,h));
      if(h>2){ctx.fillStyle=theme.trim;ctx.fillRect(left,y+2,right-left,Math.min(2,h-2));}
      if(h>7){ctx.fillStyle=theme.recess;ctx.fillRect(left,y+6,right-left,2);}
      ctx.restore();return true;
    }

    function drawPlatform(platform, stageIndex, view) {
      if (![platform.x, platform.y, platform.w, platform.h].every(Number.isFinite)
        || platform.w <= 0 || platform.h <= 0) return false;
      const foundation = Number.isFinite(view.worldBottom) && Math.abs(platform.y+platform.h-view.worldBottom)<1
        && platform.h>=160 && platform.w>=8 && platform.kind!=="wall";
      const ledge=platform.kind!=="wall" && platform.h>=16 && platform.h<=40
        && platform.w>=64 && platform.w>=3*platform.h
        && (!Number.isFinite(view.worldBottom)||platform.y+platform.h<view.worldBottom-1);
      if (platform.kind === "training" && !foundation && !ledge) return false;
      if (!visible(platform, view, 3)) return true;
      const act = clamp(Math.trunc(stageIndex), 0, 4), theme = THEMES[act];
      if(foundation&&drawFoundation(platform,act,view))return true;
      if(ledge&&drawLedge(platform,act,view))return true;
      if(platform.kind==="training")return false;
      if(drawPixelPlatform(platform,act,view))return true;
      const { x, y, w, h } = platform;
      const tall = h > 64;
      const left = Math.max(x, view.x - 3), right = Math.min(x + w, view.x + view.w + 3);
      const top = Math.max(y, view.y - 3), bottom = Math.min(y + h, view.y + view.h + 3);
      const pitch = (tall ? [112, 96, 136, 100, 124] : [62, 50, 72, 58, 78])[act] * (view.mobile ? 1.25 : 1);
      // Clip every surface detail to the real solid rectangle. No ornamental
      // ledge can imply a foothold outside the collision shape.
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      rect(left, top, right - left, bottom - top, theme.body);
      rect(left, y, right - left, Math.min(h, tall ? 15 : 10), theme.face);
      rect(left, y + 10, right - left, Math.min(3, h - 10), theme.recess);
      const first = Math.max(0, Math.floor((left - x) / pitch));
      const last = Math.min(Math.ceil(w / pitch), first + 24, Math.ceil((right - x) / pitch));
      for (let index = first; index < last; index++) {
        const a = x + index * pitch, cellW = Math.min(pitch, x + w - a), b = a + cellW;
        if (act === 0) {
          if (tall) {
            rect(a + 5, Math.max(y + 17, top), cellW - 10, Math.min(h - 22, bottom - Math.max(y + 17, top)), theme.recess);
            const rowStart = Math.max(0, Math.floor((top - y - 22) / 104));
            for (let row = rowStart; row < rowStart + 9; row++) {
              const ry = y + 22 + row * 104;
              if (ry > bottom) break;
              line(a + 8, ry, b - 8, ry + 86, theme.face, 6);
              line(b - 8, ry, a + 8, ry + 86, "#283b42", 4);
              rect(a + 4, ry + 91, cellW - 8, 5, theme.face);
            }
          } else {
            polygon([[a+4,y+13],[b-4,y+13],[b-11,y+h-3],[a+11,y+h-3]], theme.recess);
            line(a + 8, y + 13, b - 8, y + h - 3, theme.trim, 2);
          }
          rect(a + 2, y + 5, 3, 3, theme.edge);
          rect(b - 6, y + 5, 3, 3, theme.trim);
          if (index % 3 === 1) rect(a + 12, y + 4, Math.max(0, cellW - 29), 3, "#887656");
        } else if (act === 1) {
          rect(a + 3, y + 3, cellW - 6, 5, theme.trim);
          if (tall) {
            rect(a + 9, Math.max(y + 22, top), cellW - 18, bottom - Math.max(y + 22, top), theme.recess);
            const rowStart = Math.max(0, Math.floor((top - y - 24) / 58));
            for (let row = rowStart; row < rowStart + 15; row++) {
              const ry = y + 24 + row * 58;
              if (ry > bottom) break;
              rect(a + 15, ry, cellW - 30, 35, "#3f3b35");
              line(a + 17, ry + 8, b - 17, ry + 8, theme.trim, 2);
              line(a + 17, ry + 27, b - 17, ry + 27, "#6c6049", 1);
              rect(a + 18, ry + 12, 3, 10, theme.accent);
            }
          } else {
            for (let fin = 0; fin < 3; fin++) {
              const fx = a + 8 + fin * Math.max(7, (cellW - 22) / 3);
              polygon([[fx,y+12],[fx+5,y+12],[fx+2,y+h-3],[fx-2,y+h-3]], theme.trim);
            }
          }
          line(a + 1, y + 1, a + 1, Math.min(y + h, bottom), theme.recess, 2);
        } else if (act === 2) {
          rect(a + 4, y + 4, cellW - 8, 3, theme.trim);
          if (tall) {
            const crown = y + 24, foot = Math.min(y + h - 8, crown + 280);
            polygon([[a+12,foot],[a+12,crown+43],[a+cellW/2,crown],[b-12,crown+43],[b-12,foot]], theme.recess, "#4c4d66", 2);
            line(a + cellW / 2, crown + 20, a + cellW / 2, foot - 8, "#4b4465", 2);
            rect(a + 3, Math.max(y + 16, top), 6, bottom - Math.max(y + 16, top), theme.face);
            rect(a + 4, y + 18, cellW - 8, 4, theme.trim);
          } else {
            polygon([[a+6,y+12],[a+cellW/2,y+12],[a+cellW/2+8,y+h-4],[a+6,y+h-4]], "#424459");
            const center = a + cellW / 2;
            polygon([[center,y+12],[center+4,y+16],[center,y+20],[center-4,y+16]], theme.accent);
            line(a + 4, y + h - 3, b - 4, y + h - 3, theme.trim, 1);
          }
          line(b - 1, y + 3, b - 1, y + Math.min(h, 13), theme.recess);
        } else if (act === 3) {
          rect(a + 4, y + 4, cellW - 8, 3, theme.recess);
          if (tall) {
            rect(a + 4, Math.max(y + 17, top), 5, bottom - Math.max(y + 17, top), theme.trim);
            rect(b - 9, Math.max(y + 17, top), 5, bottom - Math.max(y + 17, top), theme.face);
            const rowStart = Math.max(0, Math.floor((top - y - 23) / 83));
            for (let row = rowStart; row < rowStart + 11; row++) {
              const ry = y + 23 + row * 83;
              if (ry > bottom) break;
              line(a + 11, ry, b - 11, ry + 66, theme.face, 4);
              line(b - 11, ry, a + 11, ry + 66, "#4f6879", 2);
              rect(a + 13, ry + 67, cellW - 26, 4, theme.face);
            }
          } else {
            line(a + 5, y + 12, b - 5, y + h - 4, theme.trim, 2);
            line(b - 5, y + 12, a + 5, y + h - 4, theme.face, 2);
            line(a + 5, y + h - 3, b - 5, y + h - 3, theme.trim, 1);
          }
          if (index % 2 === 0) rect(a + 7, y + 5, 5, 2, theme.accent);
        } else {
          polygon([[a+3,y+4],[b-5,y+4],[b-13,y+9],[a+11,y+9]], theme.trim);
          if (tall) {
            const rowStart = Math.max(0, Math.floor((top - y - 24) / 128));
            for (let row = rowStart; row < rowStart + 8; row++) {
              const ry = y + 24 + row * 128;
              if (ry > bottom) break;
              polygon([[a+14,ry],[b-14,ry],[b-7,ry+14],[b-7,ry+94],[b-18,ry+107],[a+7,ry+107],[a+7,ry+14]], theme.recess, theme.face, 2);
              polygon([[a+16,ry+8],[a+32,ry+8],[b-16,ry+91],[b-29,ry+96]], "#29464e");
              line(a + 14, ry + 103, b - 18, ry + 103, "#48756f", 2);
            }
          } else {
            polygon([[a+4,y+12],[a+cellW*.4,y+12],[b-4,y+h-3],[b-cellW*.4,y+h-3]], "#52747c");
            polygon([[a+4,y+12],[a+10,y+h-3],[b-4,y+h-3],[b-10,y+12]], null, theme.face);
          }
          line(a + 1, y + 2, a + 1, y + h - 2, theme.recess, 2);
        }
      }
      // Every act shares a precise two-pixel walkable edge; visual detail never
      // wins over readable landings or the red hazard silhouettes drawn later.
      rect(left, y, right - left, Math.min(h, 2), theme.edge);
      rect(left, y + 2, right - left, Math.min(Math.max(0, h - 2), 1), theme.trim);
      line(x + 0.5, top, x + 0.5, bottom, theme.trim, 1);
      line(x + w - 0.5, top, x + w - 0.5, bottom, theme.trim, 1);
      ctx.restore();
      return true;
    }

    function drawArena(zone, stageIndex, view) {
      const floor = Number.isFinite(view.floorY) ? view.floorY : 670;
      const act = clamp(Math.trunc(stageIndex), 0, 4), theme = THEMES[act];
      if (zone.x > view.x + view.w || zone.end < view.x || floor < view.y - 20 || floor - 430 > view.y + view.h) return;
      const sceneProbe=scene(act,0,'middle');
      if(sceneProbe){
        const first=Math.max(0,Math.floor((view.x-zone.x-300)/1400));
        ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=.5;
        for(let i=first;i<first+3;i++){
          const x=zone.x+120+i*1400;if(x>zone.end-160||x>view.x+view.w)break;
          const tile=scene(act,(i+Math.floor(zone.x/1400))%7,'middle');
          if(tile)ctx.drawImage(tile,Math.round(x/2)*2,Math.round((floor-700)/2)*2,1024,720);
        }
        ctx.restore();return;
      }
      const pitch = [620, 540, 610, 600, 570][act];
      const first = Math.max(0, Math.floor((view.x - zone.x - 300) / pitch));
      const count = Math.min(5, Math.ceil(view.w / pitch) + 2);
      ctx.save();
      ctx.globalAlpha = 0.52;
      ctx.lineCap = "butt";
      for (let cell = first; cell < first + count; cell++) {
        const x = zone.x + 180 + cell * pitch;
        if (x > zone.end - 120) break;
        const y = floor - (act === 3 ? 405 : 345);
        if (act === 0) {
          polygon([[x-92,floor],[x-75,y+28],[x-48,y],[x+48,y],[x+75,y+28],[x+92,floor]], "#12232c", "#30474e", 3);
          line(x - 58, y + 40, x - 58, floor - 14, "#476167", 5);
          line(x + 58, y + 40, x + 58, floor - 14, "#476167", 5);
          rect(x - 72, y + 24, 144, 13, "#455652");
          line(x, y + 38, x, y + 128, "#66807d", 2);
          ctx.strokeStyle = "#65837d"; ctx.lineWidth = 6; ctx.beginPath();ctx.arc(x,y+145,18,-.3,Math.PI*1.4);ctx.stroke();
          for (let rack = 0; rack < 3; rack++) { rect(x - 38 + rack * 27, floor - 75, 13, 56, "#354d4a"); rect(x - 36 + rack * 27, floor - 78, 9, 5, "#77755a"); }
        } else if (act === 1) {
          for (let flue = -1; flue <= 1; flue++) {
            const fx = x + flue * 58, fy = y + Math.abs(flue) * 42;
            polygon([[fx-21,floor],[fx-21,fy+16],[fx-14,fy],[fx+14,fy],[fx+21,fy+16],[fx+21,floor]], "#302c29", "#665347", 2);
            for (let ring = 0; ring < 4; ring++) rect(fx - 24, fy + 40 + ring * 57, 48, 5, "#594a3d");
          }
          polygon([[x-90,floor],[x-90,floor-125],[x-53,floor-160],[x+53,floor-160],[x+90,floor-125],[x+90,floor]], "#392f2b", "#856847", 3);
          rect(x - 57, floor - 103, 114, 83, "#181e23");
          for (let fin = 0; fin < 6; fin++) rect(x - 49 + fin * 18, floor - 94, 6, 65, "#66523b");
        } else if (act === 2) {
          polygon([[x-107,floor],[x-107,y+100],[x,y-38],[x+107,y+100],[x+107,floor]], "#282a3e", "#5b536d", 3);
          polygon([[x-77,floor-15],[x-77,y+115],[x,y+9],[x+77,y+115],[x+77,floor-15]], "#141d2c", "#746881", 2);
          line(x,y+20,x,floor-22,"#4d4969",3);
          line(x-72,y+180,x+72,y+180,"#4d4969",3);
          polygon([[x,y+78],[x+26,y+118],[x,y+154],[x-26,y+118]], "#494261", "#9a88ae", 1);
          for (const side of [-1,1]) { rect(x+side*118-8,y+80,16,floor-y-80,"#414055"); polygon([[x+side*118-13,y+80],[x+side*118,y+39],[x+side*118+13,y+80]],"#5b536d"); }
        } else if (act === 3) {
          polygon([[x-88,floor],[x-24,y+35],[x+24,y+35],[x+88,floor]], "#142632", "#3b5365", 3);
          for (let strut = 0; strut < 5; strut++) {
            const sy=y+70+strut*62,half=28+strut*10;
            line(x-half,sy,x+half+10,sy+55,"#456174",3);line(x+half,sy,x-half-10,sy+55,"#2c4459",3);
          }
          line(x,y-24,x,y+42,"#8297a5",3);line(x-32,y+8,x+32,y+8,"#8297a5",3);
          ctx.save();ctx.translate(x+58,y+108);ctx.rotate(-.5);ctx.strokeStyle="#6c8295";ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,39,-Math.PI/2,Math.PI/2);ctx.stroke();line(0,-38,0,38,"#4d657a",3);line(0,0,28,0,"#91a3af",2);ctx.restore();
          rect(x-8,y+40,16,4,"#8f6b82");
        } else {
          for (const side of [-1,1]) {
            const sx=x+side*61;
            polygon([[sx-28,floor],[sx-37,y+30],[sx-15,y],[sx+27,y+10],[sx+37,floor-26]],"#1c363c","#547e81",2);
            polygon([[sx-18,y+34],[sx-6,y+19],[sx+18,floor-41],[sx+5,floor-24]],"#35555f");
            line(sx-20,y+43,sx+16,floor-42,"#6d9190",1);
          }
          ctx.strokeStyle="#779f96";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+174,43,76,0,0,TAU);ctx.stroke();
          polygon([[x,y+124],[x+20,y+174],[x,y+224],[x-20,y+174]],"#355855","#90c6b3",2);
          rect(x-83,floor-12,166,5,"#446f68");
        }
      }
      ctx.restore();
    }
    return Object.freeze({ drawPlatform, drawArena, drawBackground, drawCampaignBackground,
      getCacheStats:()=>({entries:cache.size,ledgeEntries:ledgeBank.size,rasterBuilds:stats.rasterBuilds,cacheHits:stats.cacheHits}) });
  }
  return Object.freeze({ createRenderer, themes: THEMES });
});
