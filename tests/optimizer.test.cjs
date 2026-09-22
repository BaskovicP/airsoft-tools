const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/physics.js');
const O = require('../src/optimizer.js');
const copy = v => JSON.parse(JSON.stringify(v));
function mockShot(p) {
  return { valid: true, exitTime: .02, pistonHitTime: .03, dischargeComplete: true, exitEnergy: 2,
    exitVelocity: 100, impactEnergy: p.pistonMass / 1000, peakOutflow: .01, exitPressure: 150000,
    ambientPressure: 101300, energyResidual: 0, releasedSpringEnergy: .01,
    strongBrakeTime: .019, usefulTime: .018, duration: .05, pistonImpacts: [{ complete: true, dissipatedEnergy: p.pistonMass / 1000 }] };
}
test('optimizer parses finite decimal lists and rejects malformed/excessive lists', () => {
  assert.deepEqual(O.parseValues('58, 65; 68 68 0.46'), [58,65,68,.46]);
  for (const v of ['', 'NaN', '1e999', '58g', Array(13).fill('1').join(',')]) assert.throws(() => O.parseValues(v));
});
test('hardware allowlist never permits weather, calibration, losses or numerical settings', () => {
  for (const key of ['airTemperature','ambientPressure','dischargeCoefficient','muzzleDischargeCoefficient','pistonLeak','barrelDrag','restitution','maxTime','usefulFraction','springCurve']) assert.throws(() => O.searchSpace(P.DEFAULTS, { values: { [key]: [1] } }), /forbidden/);
  assert.throws(() => O.searchSpace(P.DEFAULTS, { locks: { weather: false } }), /unknown-group/);
});
test('bumper geometry and contact properties are explicit head hardware while restitution remains fixed', () => {
  const space=O.searchSpace(P.DEFAULTS,{locks:{head:false},values:{bumperThickness:[0,2,4],bumperBore:[4,6]}});
  assert.equal(space.total,6);assert.deepEqual(space.dimensions.map(v=>v.key),['bumperThickness','bumperBore']);
  assert.deepEqual([...new Set(Array.from({length:space.total},(_,i)=>O.candidateAt(space,i).restitution))],[P.DEFAULTS.restitution]);
});
test('frozen parts and all other inputs remain exactly unchanged', () => {
  const base = P.normalize({ airTemperature: 11, dischargeCoefficient: .61 });
  const space = O.searchSpace(base, { locks: { piston: false }, values: { pistonMass: [58,82], barrelLength: [300], cylinderBore: [30] } });
  assert.equal(space.total, 3);
  for (let i=0;i<space.total;i++) {
    const next = O.candidateAt(space,i);
    for (const key of Object.keys(P.DEFAULTS)) if (key !== 'pistonMass') assert.deepEqual(next[key], base[key], key);
  }
  assert.equal(O.candidateAt(space,0).pistonMass,base.pistonMass);
});
test('measured spring curve is never scaled, dropped or bypassed', () => {
  const p=P.normalize({springCurve:[[0,0],[200,110]]});
  assert.throws(()=>O.searchSpace(p,{locks:{spring:false},values:{springStiffness:[1000]}}),/measured-spring/);
  assert.throws(()=>O.searchSpace(p,{locks:{spring:false},values:{springMass:[20]}}),/measured-spring/);
  const space=O.searchSpace(p,{locks:{spring:false},values:{springPreload:[40,60]}});
  for(let i=0;i<space.total;i++) assert.deepEqual(O.candidateAt(space,i).springCurve,p.springCurve);
});
test('measured bumper curve cannot be silently replaced by optimized linear stiffness', () => {
  const p=P.normalize({bumperThickness:2,bumperMaxCompression:1,bumperCurve:[[0,0],[1,250]]});
  assert.throws(()=>O.searchSpace(p,{locks:{head:false},values:{bumperStiffness:[500]}}),/measured-bumper/);
  const space=O.searchSpace(p,{locks:{head:false},values:{bumperDamping:[80,160]}});
  for(let i=0;i<space.total;i++) assert.deepEqual(O.candidateAt(space,i).bumperCurve,p.bumperCurve);
});
test('search coverage is bounded, deterministic, unique and always includes current setup', () => {
  const space=O.searchSpace(P.DEFAULTS,{locks:{piston:false,airbrake:false,barrel:false},values:{pistonMass:[58,65,68,72,76,82],airbrakeLength:[0,10,15,20,25],barrelLength:[303,430,510]}});
  const a=O.sampleIndices(space,12),b=O.sampleIndices(space,12);
  assert.deepEqual(a,b);assert.equal(a.length,12);assert.equal(new Set(a).size,12);assert.equal(a[0],0);
  assert.ok(a.every(i=>i>=0&&i<space.total));
  assert.equal(O.sampleIndices(space,240).length,space.total);
});
test('candidate bounds are rejected instead of silently clamped', () => {
  assert.throws(()=>O.searchSpace(P.DEFAULTS,{locks:{piston:false},values:{pistonMass:[301]}}),/values/);
  assert.throws(()=>O.searchSpace(P.DEFAULTS,{locks:{piston:false},values:{pistonMass:[NaN]}}),/values/);
});
test('energy-band endpoints qualify and outside values are rejected', () => {
  const p=P.normalize(), bounds={min:1.9,max:2.1};
  for(const exitEnergy of [1.9,2.1]) assert.equal(O.assess(p,{...mockShot(p),exitEnergy},bounds).reason,null);
  for(const exitEnergy of [1.899,2.101]) assert.equal(O.assess(p,{...mockShot(p),exitEnergy},bounds).reason,'energy');
});
test('unknown impacts/discharge are not ranked as silent; genuine zero impact is distinct', () => {
  const p=P.normalize(),s=mockShot(p);
  assert.equal(O.assess(p,{...s,impactEnergy:null}).reason,'unfinished');
  assert.equal(O.assess(p,{...s,pistonHitTime:null}).reason,'unfinished');
  assert.equal(O.assess(p,{...s,dischargeComplete:false}).reason,'unfinished');
  assert.equal(O.assess(p,{...s,impactEnergy:0}).reason,null);
  assert.equal(O.assess(p,{...s,exitTime:null}).reason,'noExit');
  assert.equal(O.assess(p,{...s,valid:false}).reason,'invalid');
  assert.equal(O.assess(p,{...s,peakOutflow:NaN}).reason,'numerical');
  assert.equal(O.assess(p,{...s,energyResidual:1}).reason,'numerical');
});
test('efficiency uses initial spring work, independent of variable end time', () => {
  const p=P.normalize(),a=O.assess(p,mockShot(p));
  assert.equal(a.metrics.efficiency,2/P.springEnergy(p,0));
  const b=O.assess(p,{...mockShot(p),releasedSpringEnergy:5,duration:.25});
  assert.equal(a.metrics.efficiency,b.metrics.efficiency);
});
test('Pareto frontier excludes dominated choices and retains real tradeoffs', () => {
  const c=(index,vector)=>({index,vector,changes:{pistonMass:{from:71,to:70}}});
  const a=c(0,[1,1,1,-.5,.1]),b=c(1,[2,2,2,-.4,.2]),d=c(2,[.5,1,1,-.4,.1]);
  const ranked=O.rank([a,b,d]);
  assert.equal(ranked.length,2);assert.ok(!ranked.some(r=>r.index===1));
  assert.ok(ranked.every(r=>Number.isFinite(r.score)));
  assert.equal(O.rank([a])[0].score,0);
});
test('all-frozen search returns unchanged current setup, not an invented optimization', async () => {
  const r=await O.search(P.DEFAULTS,{}, {},mockShot);
  assert.equal(r.noVariables,true);assert.equal(r.total,1);assert.equal(r.evaluated,1);assert.equal(r.exhaustive,true);
  assert.deepEqual(r.frontier[0].changes,{});
});
test('snapshot, energy band and 250ms horizon stay fixed throughout search', async () => {
  const raw=P.normalize(),original=copy(raw),calls=[];
  const r=await O.search(raw,{locks:{piston:false},values:{pistonMass:[58,82]}},{onProgress:()=>{raw.airTemperature=45;}},(p,options)=>{calls.push([copy(p),options]);return mockShot(p);});
  assert.equal(r.bounds.min,1.9);assert.equal(r.bounds.max,2.1);assert.equal(r.evaluated,3);
  assert.deepEqual(r.base,original);
  assert.ok(calls.every(([p,o])=>p.airTemperature===20&&o.maxTime===250&&p.maxTime===60));
});
test('cancel before or during search never publishes partial winners', async () => {
  let calls=0;
  await assert.rejects(O.search(P.DEFAULTS,{}, {isCancelled:()=>true},()=>{calls++;return mockShot(P.DEFAULTS);}),/cancelled/);
  assert.equal(calls,0);
  let cancel=false;
  await assert.rejects(O.search(P.DEFAULTS,{locks:{piston:false},values:{pistonMass:[58,82]}},{isCancelled:()=>cancel,onProgress:()=>{cancel=true;}},mockShot),/cancelled/);
});
test('invalid/zero-exit baseline cannot define an energy target', async () => {
  await assert.rejects(O.search(P.DEFAULTS,{}, {},p=>({...mockShot(p),exitEnergy:null,exitTime:null})),/baseline-no-exit/);
  await assert.rejects(O.search(P.DEFAULTS,{}, {},p=>({...mockShot(p),exitEnergy:0})),/baseline-no-exit/);
});
test('apply preserves locks and environment; stale or tampered results are rejected', async () => {
  const base=P.normalize(),r=await O.search(base,{locks:{piston:false},values:{pistonMass:[58,82]}},{},mockShot);
  const candidate=r.frontier.find(c=>c.params.pistonMass!==base.pistonMass);
  assert.ok(candidate);
  const applied=O.applyCandidate(base,r,candidate);
  for(const key of Object.keys(P.DEFAULTS)) if(key!=='pistonMass') assert.deepEqual(applied[key],base[key]);
  assert.throws(()=>O.applyCandidate({...base,airTemperature:21},r,candidate),/stale/);
  assert.throws(()=>O.applyCandidate(base,r,{...candidate,params:{...candidate.params,barrelLength:300}}),/locked-change/);
  assert.throws(()=>O.applyCandidate(base,r,{...candidate,params:{...candidate.params,dischargeCoefficient:.9}}),/locked-change/);
  assert.equal(base.pistonMass,71);
});
test('real default completes at common horizon, while a trapping pin remains unrankable', () => {
  const base=P.normalize(),normal=P.simulate(base,{maxTime:250,sampleInterval:1});
  assert.equal(O.assess(base,normal).reason,null);
  assert.ok(normal.pistonHitTime>0 && normal.pistonHitTime<.06);
  const delayed=P.simulate({airbrakeLength:20,airbrakeTaper:2},{maxTime:250,sampleInterval:1});
  assert.ok(delayed.pistonHitTime>.06);
  const p=P.normalize({airbrakeLength:20,airbrakeTaper:2,airbrakeDiameter:3.99}),s=P.simulate(p,{maxTime:250,sampleInterval:1});
  assert.equal(s.valid,true);assert.equal(s.pistonHitTime,null);assert.equal(O.assess(p,s).reason,'unfinished');
});
test('real solver search returns only energy-constrained, completed hardware candidates', async () => {
  const p=P.normalize(),original=copy(p),r=await O.search(p,{locks:{piston:false},values:{pistonMass:[68,76]}},{},P.simulate);
  assert.deepEqual(p,original);assert.equal(r.evaluated,3);assert.equal(r.exhaustive,true);assert.ok(r.frontier.length);
  for(const c of r.frontier){assert.ok(c.metrics.energy>=r.bounds.min&&c.metrics.energy<=r.bounds.max);assert.ok(c.metrics.contactTime>0);assert.ok(c.metrics.efficiency>0);assert.equal(c.params.barrelLength,p.barrelLength);assert.equal(c.params.airTemperature,p.airTemperature);}
});
