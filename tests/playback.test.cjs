const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../src/physics.js');
const B=require('../src/playback.js');
const close=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);

test('default reference reaches head without large pre-contact oscillation',()=>{
  const s=P.simulate();
  assert.equal(s.valid,true);assert.equal(s.params.airbrakeLength,0);
  assert.equal(s.preContactReversalTime,null);assert.equal(s.maxPreContactRetreat,0);
  assert.ok(s.exitTime>0 && s.pistonHitTime>s.exitTime && s.pistonHitTime<.04);
  assert.equal(s.complete,true);assert.equal(s.dischargeComplete,true);
  assert.ok(s.maxPistonRetreat<.0001); // Not a many-millimeter cartoon rebound.
  close(s.frames.at(-1).pistonX,s.stroke);
  assert.ok(Math.abs(s.energyResidual)/s.energyScale<.001);
});
test('diagnostics preserve genuine precontact pressure reversal, independently of restitution',()=>{
  const p={airbrakeLength:20,airbrakeTaper:2},a=P.simulate(p),b=P.simulate({...p,restitution:0});
  close(a.preContactReversalTime,b.preContactReversalTime);
  close(a.maxPreContactRetreat,b.maxPreContactRetreat);
  assert.ok(a.frames.some(f=>f.pistonV < -2));
  assert.equal(a.pistonHitTime,null);assert.equal(a.contactReboundTime,null);
  assert.equal(a.impactEnergy,null);
});
test('reversal diagnostics do not depend on display sample rate',()=>{
  const p={airbrakeLength:20,airbrakeTaper:2};
  const a=P.simulate(p),b=P.simulate(p,{sampleInterval:1});
  close(a.maxPreContactRetreat,b.maxPreContactRetreat);
  close(a.preContactReversalTime,b.preContactReversalTime);
});
test('contact frames retain both sides of impact and do not invent early rebound',()=>{
  const s=P.simulate({restitution:.3});
  const contact=s.frames.filter(f=>f.t===s.pistonHitTime);
  assert.ok(contact.length>=2);assert.ok(contact[0].pistonV>0);assert.ok(contact.at(-1).pistonV<0);
  assert.equal(contact[0].pistonHit,false);assert.equal(contact.at(-1).pistonHit,true);
  const before=B.frameAt(s,s.pistonHitTime-1e-8),at=B.frameAt(s,s.pistonHitTime);
  assert.ok(before.pistonV>0);assert.equal(before.pistonHit,false);
  assert.ok(at.pistonV<0);assert.equal(at.pistonHit,true);close(at.pistonX,s.stroke);
});
test('focused playback preserves all physical time, with a continuous reversible map',()=>{
  const shot={duration:.25,exitTime:.017},line=B.timeline(shot);
  close(line.split,.8);close(line.focusEnd,.0185);
  close(line.timeAt(0),0);close(line.timeAt(.8),.0185);close(line.timeAt(1),.25);
  let previous=-1;
  for(let i=0;i<=1000;i++){const f=i/1000,t=line.timeAt(f);assert.ok(t>previous);close(line.progressAt(t),f);previous=t;}
  assert.deepEqual(shot,{duration:.25,exitTime:.017});
});
test('uniform, no-exit and short-tail playback keep a linear clock',()=>{
  for(const line of [B.timeline({duration:.25,exitTime:.017},true),B.timeline({duration:.02,exitTime:null}),B.timeline({duration:.019,exitTime:.017})]){
    assert.equal(line.split,1);close(line.timeAt(.5),line.duration/2);close(line.progressAt(line.duration/2),.5);
  }
  const empty=B.timeline({duration:0,exitTime:null});close(empty.timeAt(1),0);close(empty.progressAt(0),0);
});
test('frame interpolation preserves signed motion and does not modify solver frames',()=>{
  const s=P.simulate({airbrakeLength:20,airbrakeTaper:2});
  const before=JSON.stringify(s.frames),f=B.frameAt(s,.02);
  assert.ok(f.pistonV<0);assert.equal(f.bbExited,true);assert.equal(f.pistonHit,false);
  assert.equal(JSON.stringify(s.frames),before);
  close(B.frameAt(s,-1).t,0);close(B.frameAt(s,100).t,s.duration);
});
test('drawing pin entry and full insertion agree with physical stroke/head geometry',()=>{
  for(const setup of [{strokeLength:85,headLength:12,nozzleLength:15,airbrakeLength:20},{strokeLength:40,headLength:20,nozzleLength:15,airbrakeLength:10,bumperThickness:4},{strokeLength:120,headLength:12,nozzleLength:15,airbrakeLength:27}]){
    const p=P.normalize(setup),contact=P.contactStroke(p),entry=contact-p.airbrakeLength/1000;
    const a=B.mechanism(p,entry),b=B.mechanism(p,entry-.001),end=B.mechanism(p,contact);
    close(a.pinTip,a.head);assert.ok(b.pinTip<b.head);
    close(end.face,end.head);assert.ok(end.pinTip<=end.passageEnd+1e-10);
    assert.ok(end.pinTip<end.barrelStart);close(end.step-end.head,(p.bumperThickness+p.headLength)*end.scale);
    close(end.rigidHead-end.head,p.bumperThickness*end.scale);
  }
});
test('installed silencer keeps inner-barrel crown distinct from the final outlet',()=>{
  const plain=P.normalize(), silenced=P.normalize({silencerEnabled:1,silencerLength:180});
  const a=B.mechanism(plain,0), b=B.mechanism(silenced,0);
  close(a.end,a.silencerEnd);assert.ok(b.end<b.silencerEnd);
  close((b.end-b.barrelStart)/b.barrelScale,silenced.barrelLength);
  close((b.silencerEnd-b.end)/b.barrelScale,silenced.silencerLength);
  assert.ok(b.barrelScale<a.barrelScale);
});
