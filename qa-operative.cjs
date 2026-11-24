// Exercise the actual renderer, including transformed support-foot coordinates.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const sandbox = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(`${__dirname}/operative-renderer.js`, 'utf8'), sandbox);
const renderer = sandbox.MoonlitOperative;
const gameplayCadence = Number(fs.readFileSync(`${__dirname}/game.js`, 'utf8').match(/strideRadiansPerPixel:\s*([\d.]+)/)?.[1]);
assert.equal(gameplayCadence, renderer.strideRadiansPerPixel, 'gameplay travel and rendered support stride must agree');
const tau = Math.PI * 2;
function recordingContext() {
  let matrix = [1, 0, 0, 1, 0, 0], stack = [], style = {}, clips = [];
  const feet = [], bladeTips = [], bladeHands = [], headCenters = [], waistCenters = [], hands = [];
  const handSizes = [], filledShapes = [], joints = [], blades = [], guards = [];
  let path = [], pathArcs = [], pathEllipses = [], pathCurves = [];
  const multiply = ([a, b, c, d, e, f]) => {
    const m = matrix;
    matrix = [m[0] * a + m[2] * b, m[1] * a + m[3] * b,
      m[0] * c + m[2] * d, m[1] * c + m[3] * d,
      m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]];
  };
  const point = (x, y) => [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
  const localPoint = ([x,y]) => {
    const [a,b,c,d,e,f]=matrix,det=a*d-b*c;
    return[(d*(x-e)-c*(y-f))/det,(a*(y-f)-b*(x-e))/det];
  };
  const clipPolygon = (points,boundary) => {
    const winding=Math.sign(boundary.reduce((sum,a,index)=>{
      const b=boundary[(index+1)%boundary.length];return sum+a[0]*b[1]-a[1]*b[0];
    },0))||1;
    for(let edge=0;edge<boundary.length&&points.length;edge++) {
      const a=boundary[edge],b=boundary[(edge+1)%boundary.length];
      const distance=p=>winding*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]));
      const output=[];
      for(let index=0;index<points.length;index++) {
        const from=points[index],to=points[(index+1)%points.length],df=distance(from),dt=distance(to);
        const insideFrom=df>=-1e-9,insideTo=dt>=-1e-9;
        if(insideFrom)output.push(from);
        if(insideFrom!==insideTo){const t=df/(df-dt);output.push([from[0]+(to[0]-from[0])*t,from[1]+(to[1]-from[1])*t]);}
      }
      points=output;
    }
    return points;
  };
  const recordShape = (local, kind = 'polygon') => {
    const authoredLocal=local;
    let world = local.map(([x,y])=>point(x,y));
    for(const boundary of clips)world=clipPolygon(world,boundary);
    if(world.length<3)return null;
    if(clips.length)local=world.map(localPoint);
    const shape = {color:style.fillStyle,kind,local,world,authoredLocal,origin:point(0,0),matrix:matrix.slice()};
    filledShapes.push(shape);
    if (style.fillStyle !== '#06101a' && style.fillStyle !== '#0a141e') return shape;
    const left=Math.min(...local.map(p=>p[0])),right=Math.max(...local.map(p=>p[0]));
    const top=Math.min(...local.map(p=>p[1])),bottom=Math.max(...local.map(p=>p[1]));
    if (style.fillStyle === '#06101a') {
      // Measure the visible sole edge, not a legacy rectangular boot placeholder.
      const sole=local.filter(p=>Math.abs(p[1]-bottom)<1e-8);
      const heel=sole.reduce((a,b)=>a[0]<b[0]?a:b),toe=sole.reduce((a,b)=>a[0]>b[0]?a:b);
      feet.push({ankle:point(0,0),heel:point(...heel),toe:point(...toe),width:right-left,height:bottom-top,shape});
    } else {
      // Faceted gloves are drawn in the true wrist frame; their asymmetric thumb
      // must not move the kinematic wrist probe away from that frame's origin.
      hands.push(kind==='polygon'?point(0,0):point((left+right)/2,(top+bottom)/2));
      handSizes.push({width:right-left,height:bottom-top,shape});
    }
    return shape;
  };
  const operations = {
    beginPath() { path=[];pathArcs=[];pathEllipses=[];pathCurves=[]; },
    moveTo(x,y) { path.push({local:[x,y],world:point(x,y)}); },
    lineTo(x,y) { path.push({local:[x,y],world:point(x,y)}); },
    arc(x,y,radius) { pathArcs.push({center:point(x,y),radius}); },
    save() { stack.push([matrix.slice(), { ...style }, clips.slice()]); },
    restore() { assert(stack.length, 'canvas restore underflow'); [matrix, style, clips] = stack.pop(); },
    translate(x, y) { multiply([1, 0, 0, 1, x, y]); },
    scale(x, y) { multiply([x, 0, 0, y, 0, 0]); },
    rotate(angle) { const c = Math.cos(angle), s = Math.sin(angle); multiply([c, s, -s, c, 0, 0]); },
    fillRect(x, y, w, h) {
      recordShape([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],'rect');
    },
    rect(x,y,w,h) { for(const local of[[x,y],[x+w,y],[x+w,y+h],[x,y+h]])path.push({local,world:point(...local)}); },
    clip() { assert(path.length>=3,'clip must use an actual visible boundary');clips.push(path.map(p=>p.world)); },
    fill() {
      if (style.fillStyle === '#172833') headCenters.push(point(0, -50));
      if (style.fillStyle === '#111d2c') waistCenters.push(point(0, -16.5));
      if(path.length>=3) {
        const shape=recordShape(path.map(p=>p.local),pathCurves.length?'curve':'polygon');
        const steelColors=['#c7d3d1','#b8f2ed','#e8dcff','#ffad42','#ffaa55','#ffcd70','#ead6ff'];
        const authoredXs=path.map(p=>p.local[0]);
        if(shape&&steelColors.includes(shape.color)&&Math.min(...authoredXs)>=4&&Math.max(...authoredXs)-Math.min(...authoredXs)>20) {
          const xs=shape.local.map(p=>p[0]);
          const tipIndex=xs.indexOf(Math.max(...xs));
          blades.push(shape);bladeTips.push(shape.world[tipIndex]);bladeHands.push(shape.origin);
        }
      }
      // Only a genuinely filled guard counts; a path command alone is not visible geometry.
      for(const ellipse of pathEllipses) {
        if(Math.abs(ellipse.x-4.5)<1e-8&&Math.abs(ellipse.y)<1e-8&&Math.abs(ellipse.rx-1.25)<1e-8&&Math.abs(ellipse.ry-3.05)<1e-8) {
          guards.push({...ellipse,color:style.fillStyle,center:point(ellipse.x,ellipse.y),grip:point(0,0),matrix:matrix.slice()});
        }
      }
      if(style.fillStyle==='#07101a')joints.push(...pathArcs.filter(arc=>arc.radius>=1&&arc.radius<=5));
    },
    quadraticCurveTo(cx, cy, x, y) {
      const start=path.at(-1)?.local||[0,0];
      pathCurves.push({start,control:[cx,cy],end:[x,y]});
      for(let step=1;step<=16;step++) {
        const t=step/16,u=1-t;
        const local=[u*u*start[0]+2*u*t*cx+t*t*x,u*u*start[1]+2*u*t*cy+t*t*y];
        path.push({local,world:point(...local)});
      }
    },
    ellipse(x, y, rx, ry) { pathEllipses.push({x,y,rx,ry}); },
  };
  const context = new Proxy({}, {
    get(_, name) { return style[name] ?? ((...args) => {
      args.forEach(value => { if (typeof value === 'number') assert(Number.isFinite(value), `${name}: finite argument`); });
      return operations[name]?.(...args);
    }); },
    set(_, name, value) { style[name] = value; return true; },
  });
  return { context, feet, bladeTips, bladeHands, blades, guards, headCenters, waistCenters, hands, handSizes, filledShapes, joints, balanced: () => stack.length === 0 };
}
module.exports = { recordingContext, renderer };
if (require.main === module) {
const player = { w: 28, h: 52, vx: 440, vy: 0, grounded: true, runCycle: 0,
  squash: 0, attackTimer: 0, attackDuration: 0.23, attackDir: { x: 1, y: 0 },
  recoilTimer: 0, shotAimX: 1, shotAimY: 0, buffTimer: 0, shotgunCharge: 0,
  slashComboActive: false, slashComboIndex: 0, slashComboLinked: false,
  slashComboCarry: 0, slashComboRecovery: 0, slashComboRecoveryDuration: 0.16,
  slashComboEntry: null, motionPose: null };
const game = { stage: 0, time: 0 };
const original = { ...player };
function draw(overrides = {}, facing = 1, style = 'player', ghost = false, x = 0) {
  Object.assign(player, original, overrides);
  const before = JSON.stringify(player);
  const record = recordingContext();
  renderer.createRenderer(record.context, player, game)(x, 0, facing, 0.7, ghost, style);
  assert(record.balanced(), 'all canvas saves must be restored');
  assert.equal(JSON.stringify(player), before, 'rendering must not mutate gameplay');
  return record;
}
let cases = 0;
for (const facing of [-1, 1]) for (let frame = 0; frame < 120; frame++) {
  const t = frame / 120;
  for (const pose of [
    { vx: 0 }, { vx: 90 * facing }, { vx: 440 * facing },
    { vx: 440 * facing, attackTimer: 0.23 * (1 - t) },
    { recoilTimer: 0.3 * (1 - t), shotAimY: Math.sin(t * tau) },
    { grounded: false, vy: -700 + t * 1400 },
    { grounded: false, wallLeft: true, vy: 145 },
    { squash: 0.24 * (1 - t) },
  ]) {
    draw({ ...pose, runCycle: t * tau }, facing);
    cases++;
  }
}
draw({}, 1, 'echo'); draw({}, 1, 'player', true);

// Measure the actual authored geometry, not renderer constants or a screenshot.
const boundsOf=(points)=>({left:Math.min(...points.map(p=>p[0])),right:Math.max(...points.map(p=>p[0])),
  top:Math.min(...points.map(p=>p[1])),bottom:Math.max(...points.map(p=>p[1]))});
function horizontalSpans(points,y) {
  const intersections=[];
  for(let index=0;index<points.length;index++) {
    const a=points[index],b=points[(index+1)%points.length];
    if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))intersections.push(a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]));
  }
  intersections.sort((a,b)=>a-b);
  const spans=[];for(let index=0;index+1<intersections.length;index+=2)spans.push([intersections[index],intersections[index+1]]);
  return spans;
}
function widthAt(shape,fraction) {
  const b=boundsOf(shape.local),y=b.top+(b.bottom-b.top)*fraction;
  return horizontalSpans(shape.local,y).reduce((sum,[left,right])=>sum+right-left,0);
}
function isConcave(points) {
  const turns=points.map((a,index)=>{
    const b=points[(index+1)%points.length],c=points[(index+2)%points.length];
    return(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
  });
  return turns.some(turn=>turn>0.01)&&turns.some(turn=>turn<-.01);
}
for(const facing of[-1,1])for(const phase of[0,0.125,0.375,0.625]) {
  const model=draw({vx:phase===0?0:440*facing,runCycle:phase*tau},facing);
  const torso=model.filledShapes.find(shape=>shape.color==='#111d2c');
  assert(torso,'the mechanical torso must remain a readable silhouette');
  const torsoBounds=boundsOf(torso.local),torsoWidth=torsoBounds.right-torsoBounds.left;
  assert(torsoWidth>=18&&torsoWidth<=21.2,'torso must retain the slimmer 21px silhouette');
  assert(torsoWidth/(torsoBounds.bottom-torsoBounds.top)<0.85,'torso must read as taller than it is wide');
  assert(torso.kind==='polygon'&&torso.local.length>=10&&widthAt(torso,.72)<widthAt(torso,.35)*.8,
    'the breastplate must have a sculpted rib cage and a distinct narrow exposed waist');
  const coat=model.filledShapes.find(shape=>shape.color==='#b5c7cb');
  assert(coat,'the fixed white officer coat must remain present');
  const coatBounds=boundsOf(coat.local);
  assert(coatBounds.right-coatBounds.left<=26&&coatBounds.bottom<=-14,'coat must leave the knees and shin articulation exposed');
  // Compare the shared tail section, not the final pixel of an asymmetric hem.
  const hems=horizontalSpans(coat.local,coatBounds.top+(coatBounds.bottom-coatBounds.top)*0.8);
  assert(hems.length>=2&&hems[1][0]-hems[0][1]>=3,'split coat tails must keep a visible central leg gap');
  for(const [color,maxWidth]of[['#152737',4.0],['#3a5363',4.8],['#203443',3.8],['#526c7a',4.5]]) {
    const segments=model.filledShapes.filter(shape=>shape.color===color);
    assert.equal(segments.length,2,'every limb must draw separate upper and lower segments');
    const widths=segments.map(segment=>{const b=boundsOf(segment.local);return b.right-b.left;});
    assert(widths[0]<=maxWidth+0.01&&widths[1]<=widths[0]+0.01,'limb armor must stay slender without a swollen lower segment');
    const profiles=segments.map(segment=>[.2,.4,.6,.8].map(fraction=>widthAt(segment,fraction)));
    for(let index=0;index<segments.length;index++) {
      assert(segments[index].kind==='polygon'&&segments[index].local.length>=6,
        'limb armor must be an actual shaped plate rather than a placeholder rectangle');
      assert(Math.max(...profiles[index])-Math.min(...profiles[index])>widths[index]*.12,
        'upper and lower armor must taper through their body, not only bevel the corners');
    }
    assert(profiles[0].some((width,index)=>Math.abs(width/widths[0]-profiles[1][index]/widths[1])>.08),
      'upper and lower limb plates must have distinct anatomical profiles');
    const edgeCenter=(segment,atEnd)=>{
      const bound=boundsOf(segment.local),edge=atEnd?bound.bottom:bound.top;
      const points=segment.world.filter((point,index)=>Math.abs(segment.local[index][1]-edge)<0.001);
      return[points.reduce((sum,p)=>sum+p[0],0)/points.length,points.reduce((sum,p)=>sum+p[1],0)/points.length];
    };
    const upperEnd=edgeCenter(segments[0],true),lowerStart=edgeCenter(segments[1],false);
    assert(Math.hypot(upperEnd[0]-lowerStart[0],upperEnd[1]-lowerStart[1])<=3,
      'upper and lower limb armor must meet around their joint without disconnecting');
    const join=[(upperEnd[0]+lowerStart[0])/2,(upperEnd[1]+lowerStart[1])/2];
    assert(model.joints.some(joint=>Math.hypot(joint.center[0]-join[0],joint.center[1]-join[1])<2),
      'every upper/lower limb connection must expose its own articulated joint');
  }
  assert(model.joints.length>=4,'both knees and both elbows must retain distinct articulated joints');
  assert.equal(model.handSizes.length,2,'both visible fists must be measured from their real silhouettes');
  assert.equal(model.feet.length,2,'both visible boots must be measured from their real silhouettes');
  assert(model.handSizes.every(size=>size.width<=5&&size.height<=5),'oversized gloves must not hide the wrists');
  assert(model.feet.every(foot=>foot.width<=9&&foot.height===6),'compact boots must preserve the same sole height');
  assert(model.handSizes.every(size=>size.shape.kind==='polygon'&&size.shape.local.length>=8&&isConcave(size.shape.local)),
    'fists must expose faceted knuckles and a separate thumb cutout, not square gloves');
  assert(model.feet.every(foot=>foot.shape.kind==='polygon'&&foot.shape.local.length>=8&&widthAt(foot.shape,.8)-widthAt(foot.shape,.2)>2),
    'boots must distinguish the ankle neck from the projecting toe and continuous sole');
  const torsoOrder=model.filledShapes.indexOf(torso);
  assert(model.filledShapes.filter(shape=>shape.color==='#203443').every(shape=>model.filledShapes.indexOf(shape)<torsoOrder),
    'the far arm must remain behind the torso in locomotion');
  assert(model.filledShapes.filter(shape=>shape.color==='#526c7a').every(shape=>model.filledShapes.indexOf(shape)>torsoOrder),
    'the near arm must remain readable in front of the torso');
  if(phase===0) {
    const helmet=model.filledShapes.find(shape=>shape.color==='#172833');
    const headBounds=boundsOf(helmet.world);
    assert(headBounds.right-headBounds.left<=21,'the helmet must remain proportionate to the slimmer torso');
    assert(helmet.kind==='polygon'&&helmet.local.length>=10,'the robot mask must have a distinct brow, nape and articulated chin');
    const nape=model.filledShapes.find(shape=>shape.color==='#344954');
    assert(nape?.kind==='polygon'&&nape.local.length>=7&&boundsOf(nape.local).left<boundsOf(helmet.local).left-2,
      'the swept nape vane must extend from the actual mask silhouette');
    const optic=model.filledShapes.find(shape=>shape.color==='#ff496c'&&shape.local.every(point=>point[1]<-45));
    assert(optic?.kind==='polygon'&&optic.local.length>=6&&new Set(optic.local.map(point=>point[1])).size>=4,
      'the recessed red optic must be a tapered lens rather than the former rectangular bar');
    const mantle=model.filledShapes.find(shape=>shape.color==='#e8e9d8');
    assert(mantle?.kind==='polygon'&&mantle.local.length>=10,'the officer coat must include its shaped ivory half-mantle');
    const mantleBounds=boundsOf(mantle.local);
    assert(mantleBounds.right-mantleBounds.left>=18&&Math.abs(mantleBounds.left+mantleBounds.right)>1,
      'the half-mantle must preserve a visibly asymmetric diagonal profile');
    const trim=model.filledShapes.find(shape=>shape.color==='#b79765');
    const clasp=model.filledShapes.find(shape=>shape.color==='#a67740');
    assert(trim?.kind==='polygon'&&clasp?.kind==='polygon'&&isConcave(clasp.local),
      'brass mantle edging and the concave crescent hook must be visible authored shapes');
    const scabbard=model.filledShapes.find(shape=>shape.color==='#132631');
    assert(scabbard?.kind==='polygon'&&scabbard.local.length>=8,'the sheathed blade must retain its sculpted lacquer scabbard');
    const scabbardBounds=boundsOf(scabbard.local);
    assert(scabbardBounds.right-scabbardBounds.left>=36&&scabbardBounds.right-scabbardBounds.left<=40,
      'the sheath must cover the shorter blade without retaining the oversized old silhouette');
  }
}

// One stance must hold its world-space position as the actor moves forward.
let worstSupportError = { amount: 0 }, worstSlip = { amount: 0 };
for (const speed of [90, 240, 440]) for (const facing of [-1, 1]) for (const footIndex of [0, 1]) {
  const planted = [];
  for (let frame = 0; frame <= 48; frame++) {
    const contactFraction = 0.02 + frame / 48 * 0.96;
    const phase = (footIndex === 0 ? 0.5 : 0) + renderer.runSupportFraction * contactFraction;
    const distance = phase * tau / renderer.strideRadiansPerPixel;
    const record = draw({ vx: speed * facing, runCycle: phase * tau }, facing, 'player', false, distance * facing);
    const foot = record.feet[footIndex];
    const floorError = Math.max(Math.abs(foot.heel[1] - player.h), Math.abs(foot.toe[1] - player.h));
    if (floorError > worstSupportError.amount) worstSupportError = { amount: floorError, speed, facing, footIndex, contactFraction };
    planted.push(foot.ankle[0]);
  }
  const slip = Math.max(...planted) - Math.min(...planted);
  if (slip > worstSlip.amount) worstSlip = { amount: slip, speed, facing, footIndex };
}
assert(worstSupportError.amount < 0.1,
  `support soles must remain on the floor through the entire contact: ${JSON.stringify(worstSupportError)}`);
assert(worstSlip.amount < 1.1,
  `support feet may only move by root pixel rounding: ${JSON.stringify(worstSlip)}`);
const contactsPerSecond = 440 * renderer.strideRadiansPerPixel / Math.PI;
assert(contactsPerSecond > 5 && contactsPerSecond < 7, 'full-speed cadence must not spin the legs like a wheel');
const supportTravel = tau * renderer.runSupportFraction / renderer.strideRadiansPerPixel;
assert(supportTravel > 24 && supportTravel < 27, 'the shorter support distance must fit the upright mechanical leg reach');
const flight = draw({ runCycle: 0.38 * tau });
assert(flight.feet.every(foot => foot.heel[1] < player.h - 1), 'a running stride must contain a small flight phase');

// Measure rendered anatomy rather than checking the angle constants: the upper
// body must lead its hips, and each arm must oppose the leg on the same side.
for (const facing of [-1, 1]) {
  const leadAt = (speed) => {
    const record = draw({ vx: speed * facing, runCycle: 0.125 * tau }, facing);
    assert.equal(record.headCenters.length, 1, 'exactly one mechanical head must be rendered');
    assert.equal(record.waistCenters.length, 1, 'exactly one torso must be rendered');
    return (record.headCenters[0][0] - record.waistCenters[0][0]) * facing;
  };
  const idleLead = leadAt(0), walkLead = leadAt(90), runLead = leadAt(240), sprintLead = leadAt(440);
  assert(Math.abs(idleLead) < 0.5, 'idle posture must remain upright');
  assert(walkLead > idleLead && runLead > walkLead && sprintLead > runLead,
    'forward torso lean must increase smoothly from walking to sprinting');
  assert(sprintLead >= 7 && sprintLead <= 15,
    'sprinting head must lead the waist visibly without tipping the whole body over');
  const contact = draw({ vx: 440 * facing, runCycle: 0 }, facing);
  const opposite = draw({ vx: 440 * facing, runCycle: Math.PI }, facing);
  assert.equal(contact.hands.length, 2, 'running must retain both hands');
  assert.equal(opposite.hands.length, 2, 'running must retain both hands');
  const frontArmSwing = (contact.hands[1][0] - opposite.hands[1][0]) * facing;
  const rearArmSwing = (contact.hands[0][0] - opposite.hands[0][0]) * facing;
  const frontLegSwing = (contact.feet[1].ankle[0] - opposite.feet[1].ankle[0]) * facing;
  assert(frontLegSwing > 10 && frontArmSwing < -4,
    'front arm must drive back as its own leg reaches forward, not march with it');
  assert(rearArmSwing > 4 && frontArmSwing * rearArmSwing < 0,
    'both arms must counter-swing with bent elbows');
}

// Measure the actual leg frames and boot origins, not an angle constant that
// could leave the visibly rendered knee bent in a permanent crouch.
let smallestIdleKnee = 180;
for (let frame = 0; frame < 120; frame++) {
  game.time = frame / 30;
  for(const facing of[-1,1]) {
    const idle=draw({vx:0},facing);
    for(const foot of idle.feet)assert(Math.abs(foot.heel[1]-player.h)<0.1);
    for(const [index,color]of['#152737','#3a5363'].entries()) {
      const parts=idle.filledShapes.filter(shape=>shape.color===color);
      const hip=parts[0].origin,knee=parts[1].origin,ankle=idle.feet[index].ankle;
      const upper=[hip[0]-knee[0],hip[1]-knee[1]],lower=[ankle[0]-knee[0],ankle[1]-knee[1]];
      const cosine=(upper[0]*lower[0]+upper[1]*lower[1])/(Math.hypot(...upper)*Math.hypot(...lower));
      const angle=Math.acos(Math.max(-1,Math.min(1,cosine)))*180/Math.PI;
      smallestIdleKnee=Math.min(smallestIdleKnee,angle);
      // A relaxed stance may flex up to 37 degrees through the breathing cycle.
      assert(angle>=143,`idle knee must be nearly straight, not deeply squatting: ${angle.toFixed(2)} degrees`);
      assert(hip[1]<knee[1]&&knee[1]<ankle[1],'idle thighs and shins must descend naturally toward the planted soles');
    }
    assert(Math.abs(idle.feet[0].ankle[0]-idle.feet[1].ankle[0])<15,'idle feet must retain a compact staggered stance');
  }
}

const durations = [0.22, 0.24, 0.28];
const tipDistance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
let comboCases = 0;
for (const index of [0, 1, 2]) for (const facing of [-1, 1]) {
  for (const grounded of [false, true]) for (const aimY of [-1, 0, 1]) {
    for (let frame = 0; frame < 60; frame++) {
      const result = draw({ vx: 0, grounded, vy: grounded ? 0 : -250,
        slashComboActive: true, slashComboIndex: index, slashComboLinked: index > 0, slashComboCarry: 1,
        attackDuration: durations[index], attackTimer: durations[index] * (1 - frame / 60),
        attackDir: { x: facing, y: aimY } }, facing);
      assert.equal(result.guards.length,1,'each active J strike must show one hilt, seated or held');
      assert(result.bladeTips.length<=1,'a drawing or recovering strike must never duplicate the steel');
      if(frame===0&&index===0)assert.equal(result.bladeTips.length,0,'the first draw begins with the blade fully sheathed');
      if (grounded && aimY === 0 && result.bladeTips.length) assert(result.bladeTips[0][1] <= player.h + 1,
        'a forward grounded combo must not drive its sword tip through the floor');
      comboCases++;
    }
    // Starting the next strike must preserve the exact previous follow-through,
    // even if part of its recovery has elapsed, and even while aiming vertically.
    for (const carry of [1, 0.7, 0.3]) {
      const previous = draw({ vx: 0, grounded, vy: grounded ? 0 : -250,
        slashComboActive: true, slashComboIndex: index, slashComboRecovery: carry * 0.16,
        attackDir: { x: facing, y: aimY } }, facing);
      const nextIndex = (index + 1) % 3;
      const next = draw({ vx: 0, grounded, vy: grounded ? 0 : -250,
        slashComboActive: true, slashComboIndex: nextIndex, slashComboLinked: true, slashComboCarry: carry,
        attackDuration: durations[nextIndex], attackTimer: durations[nextIndex],
        attackDir: { x: facing, y: aimY } }, facing);
      assert.equal(previous.bladeTips.length,next.bladeTips.length,'linked cuts must preserve whether the steel is drawn');
      assert(tipDistance(previous.bladeTips[0]||previous.guards[0].center, next.bladeTips[0]||next.guards[0].center) < 0.001,
        `J chain ${index + 1} -> ${nextIndex + 1} must not snap the blade (carry ${carry})`);
      for (let foot = 0; foot < previous.feet.length; foot++) {
        assert(tipDistance(previous.feet[foot].ankle, next.feet[foot].ankle) < 0.001,
          'linked J strikes must preserve their supporting feet');
      }
      comboCases += 2;
    }
  }
}
// New sprint shoulders/elbows must also hand off without snapping while moving.
for (const facing of [-1, 1]) for (const index of [0, 1, 2]) for (const phase of [0.125, 0.625]) {
  const common = { vx: 440 * facing, runCycle: phase * tau, slashComboActive: true,
    attackDir: { x: facing, y: 0 }, slashComboRecoveryDuration: 0.16 };
  const previous = draw({ ...common, slashComboIndex: index, slashComboRecovery: 0.096 }, facing);
  const nextIndex = (index + 1) % 3;
  const next = draw({ ...common, slashComboIndex: nextIndex, slashComboLinked: true, slashComboCarry: 0.6,
    attackDuration: durations[nextIndex], attackTimer: durations[nextIndex] }, facing);
  assert.equal(previous.bladeTips.length,next.bladeTips.length,'sprinting chains must preserve sword readiness');
  assert(tipDistance(previous.bladeTips[0]||previous.guards[0].center, next.bladeTips[0]||next.guards[0].center) < 0.001,
    'sprinting torso and elbow poses must remain continuous when chaining J');
  comboCases += 2;
}
const distinct = durations.map((duration, index) => draw({ vx: 0, slashComboActive: true,
  slashComboIndex: index, attackDuration: duration, attackTimer: duration * 0.45 }).bladeTips[0]);
for (let a = 0; a < distinct.length; a++) for (let b = a + 1; b < distinct.length; b++) {
  assert(tipDistance(distinct[a], distinct[b]) > 8, 'the three strikes must have distinct blade trajectories');
}
const normal = draw({ vx: 0, attackTimer: 0.1 }).bladeTips[0];
const normalWithStaleCombo = draw({ vx: 0, attackTimer: 0.1, slashComboIndex: 2, slashComboCarry: 1 }).bladeTips[0];
assert(tipDistance(normal, normalWithStaleCombo) < 0.001, 'mouse attacks must ignore inactive J state');
const echo = draw({ vx: 0, attackTimer: 0.1 }, 1, 'echo').bladeTips[0];
const echoDuringJ = draw({ vx: 0, attackTimer: 0.1, slashComboActive: true, slashComboIndex: 2 }, 1, 'echo').bladeTips[0];
assert(tipDistance(echo, echoDuringJ) < 0.001, 'player J combo state must never leak into Echo');
assert.equal(draw({ slashComboActive: true, slashComboRecovery: 0 }).bladeTips.length, 0,
  'completed recovery must sheath the katana');

// Presentation updates are explicit simulation work; drawing remains immutable.
for (const name of ['updateMotion', 'resetMotion', 'captureLocomotion']) {
  assert.equal(typeof renderer[name], 'function', `${name} must be available for temporal animation`);
}
const physicsKeys = ['x', 'y', 'vx', 'vy', 'grounded', 'hp', 'attackTimer', 'attackCooldown', 'runCycle', 'facing', 'squash'];
function motionSample(dt) {
  const actor = { ...original, x: 300, y: 200, vx: 440, vy: 0, hp: 5, attackTimer: 0,
    attackCooldown: 0, facing: 1, grounded: true, motionPose: null, wallLeft: false, wallRight: false };
  const physics = () => JSON.stringify(Object.fromEntries(physicsKeys.map(key => [key, actor[key]])));
  const update = (wasGrounded) => {
    const before = physics(); renderer.updateMotion(actor, dt, wasGrounded);
    assert.equal(physics(), before, 'presentation blending must not change physics, health or attack timing');
  };
  update(true);
  actor.grounded = false; actor.vy = -715; actor.squash = -0.16;
  let previousGround = 1;
  for (let frame = 0; frame < Math.round(0.1 / dt); frame++) {
    update(frame === 0);
    assert(actor.motionPose.ground <= previousGround && actor.motionPose.ground >= 0,
      'takeoff presentation must approach air continuously');
    previousGround = actor.motionPose.ground;
  }
  const takeoff = { ...actor.motionPose };
  for (let frame = 0; frame < Math.round(0.2 / dt); frame++) update(false);
  assert(actor.motionPose.ground < 0.001, 'air presentation must settle after takeoff');
  actor.grounded = true; actor.vy = 0; actor.squash = 0.2;
  update(false);
  assert(actor.motionPose.ground > 0 && actor.motionPose.ground < 1, 'landing must blend rather than instantly switch poses');
  for (let frame = 1; frame < Math.round(0.1 / dt); frame++) update(true);
  assert(actor.motionPose.ground > 0.999, 'landing must settle within the declared blend duration');
  const landing = { ...actor.motionPose };
  const beforeReset = physics(); renderer.resetMotion(actor);
  assert.equal(actor.motionPose, null); assert.equal(physics(), beforeReset);
  return { takeoff, landing };
}
const motion60 = motionSample(1 / 60), motion120 = motionSample(1 / 120);
for (const state of ['takeoff', 'landing']) for (const field of ['ground', 'vy', 'squash', 'wall']) {
  assert(Math.abs(motion60[state][field] - motion120[state][field]) < 0.00001,
    `${state} ${field} presentation must not depend on display refresh rate`);
}
const motionOverride = { ground: 0.35, vy: -420, squash: -0.05, wall: 0.2 };
draw({ motionPose: motionOverride, grounded: false, vy: -700 });
const echoWithMotion = draw({ vx: 0, attackTimer: 0.1, motionPose: motionOverride,
  slashComboEntry: { arm: -1.5, elbow: -1, rear: 1.2, rearElbow: -1 } }, 1, 'echo').bladeTips[0];
assert(tipDistance(echo, echoWithMotion) < 0.001, 'player transition state must not affect Echo rendering');
console.log(`Operative renderer: ${cases + 122} base poses + ${comboCases} combo poses/handoffs, grounded stance and immutable gameplay passed.`);
}
