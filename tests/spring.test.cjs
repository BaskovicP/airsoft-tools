const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/physics.js');
const O = require('../src/optimizer.js');
const C = require('../src/calibration.js');
const close = (a,b,tolerance=1e-9) => assert.ok(Math.abs(a-b)<=tolerance, `${a} != ${b}`);
const MODEL_34_FIELDS=['bumperStiffness','bumperDamping','bumperMaxCompression','muzzleDischargeCoefficient'];
const MODEL_40_FIELDS=['frontDeadVolume','bumperCurve'];
const lengths = (extra={}) => P.normalize({springLengthMode:1,springFreeLength:200,springInstalledLength:150,...extra});
const cut = (extra={}) => lengths({springCutLength:20,springActiveCoils:30,springRemovedCoils:3,...extra});

test('spring length mode needs measurements; disabled unknown lengths preserve existing solver', () => {
  assert.deepEqual(P.validate(P.DEFAULTS),[]);
  assert.ok(P.validate({springLengthMode:1}).includes('spring:lengths'));
  const p=P.normalize({springFreeLength:200,springInstalledLength:120,springCutLength:10});
  close(P.springForce(p,0),P.springForce(P.DEFAULTS,0));
  close(P.springEnergy(p,0),P.springEnergy(P.DEFAULTS,0));
});
test('uncut length mode matches direct preload without double counting it', () => {
  const p=lengths({springPreload:140});
  assert.deepEqual(P.validate(p),[]);
  for(const x of [0,.04,.085]) close(P.springForce(p,x),P.springForce(P.DEFAULTS,x));
  close(P.springEnergy(p,0),P.springEnergy(P.DEFAULTS,0));
  const a=P.simulate(p), b=P.simulate();
  close(a.exitVelocity,b.exitVelocity); close(a.exitTime,b.exitTime);
});
test('cut active coils stiffen the spring but reduce preload and can reduce available work', () => {
  const p=cut(),s=P.springState(p);
  assert.deepEqual(P.validate(p),[]);
  close(s.freeLength,180);close(s.preload,30);close(s.cockedCompression,115);close(s.cockedLength,65);
  close(s.stiffness,550*30/27);
  close(P.springForce(p,0),s.stiffness*.115);
  close(P.springEnergy(p,0),.5*s.stiffness*(.115**2-.03**2));
  assert.ok(P.springEnergy(p,0)<P.springEnergy(lengths(),0));
  const shot=P.simulate(p);
  assert.equal(shot.valid,true);assert.ok(shot.exitVelocity>0);
  assert.ok(Math.abs(shot.exitVelocity-P.simulate(lengths()).exitVelocity)>.1);
  assert.ok(Math.abs(shot.energyResidual)/shot.energyScale<.001);
});
test('free length reduction does not silently infer active turns or remaining mass', () => {
  assert.ok(P.validate(lengths({springCutLength:20})).includes('spring:coils'));
  const inactive=cut({springRemovedCoils:0,springMass:18}), active=cut({springMass:18});
  close(P.springState(inactive).stiffness,550);
  assert.ok(P.springState(active).stiffness>P.springState(inactive).stiffness);
  assert.equal(P.simulate(active,{maxTime:1}).params.springMass,18);
});
test('cutting and short stroke affect different terms, without altering cylinder bore', () => {
  const p=cut(),q=cut({strokeLength:65});
  close(P.springState(p).preload,P.springState(q).preload);
  close(P.springState(p).stiffness,P.springState(q).stiffness);
  close(P.springForce(p,.04),P.springForce(q,.02));
  assert.ok(P.springEnergy(q,0)<P.springEnergy(p,0));
  close(P.geometry(p,0,0).ac,P.geometry(q,0,0).ac);
});
test('added bumper leaves cocked compression fixed but raises contact preload and shortens travel', () => {
  const bare=P.normalize(),p=P.normalize({bumperThickness:4}),a=P.springState(bare),b=P.springState(p);
  close(b.contactTravel,81);close(b.preload,54);close(b.cockedCompression,a.cockedCompression);
  close(P.springForce(p,0),P.springForce(bare,0));
  assert.ok(P.springEnergy(p,0)<P.springEnergy(bare,0));
  const measured=lengths({bumperThickness:4}),state=P.springState(measured);
  close(state.installedLength,146);close(state.preload,54);close(state.cockedLength,65);close(state.cockedCompression,135);
});
test('zero preload is valid; slack/unseating is rejected', () => {
  const p=lengths({springFreeLength:150});
  assert.deepEqual(P.validate(p),[]);close(P.springForce(p,.085),0);
  assert.ok(P.validate(lengths({springFreeLength:149})).includes('spring:slack'));
});
test('invalid cuts, geometry, mode and coil counts cannot generate trajectories', () => {
  for(const params of [
    cut({springCutLength:200}),cut({springRemovedCoils:30}),cut({springRemovedCoils:31}),
    cut({springActiveCoils:0}),cut({springCutLength:0}),lengths({springInstalledLength:85}),
    lengths({springInstalledLength:0}),lengths({springFreeLength:-1}),cut({springRemovedCoils:-1}),
    lengths({springLengthMode:2}),lengths({springCutLength:NaN})
  ]) assert.equal(P.simulate(params).valid,false,JSON.stringify(params));
});
test('solid height is checked only when known and does not permit coil bind at equality', () => {
  assert.equal(P.springState(lengths()).coilBindChecked,false);
  assert.deepEqual(P.validate(lengths({springSolidLength:64})),[]);
  for(const springSolidLength of [65,66]) assert.ok(P.validate(lengths({springSolidLength})).includes('spring:coil-bind'));
  assert.equal(P.springState(lengths({springSolidLength:64})).coilBindChecked,true);
});
test('measured curves use derived compression and cannot be reused after a hypothetical cut', () => {
  const p=lengths({springPreload:0,springCurve:[[50,27.5],[140,77]]});
  assert.deepEqual(P.validate(p),[]);close(P.springEnergy(p,0),P.springEnergy(P.DEFAULTS,0));
  assert.ok(P.validate({...p,springFreeLength:210}).includes('spring:coverage'));
  assert.ok(P.validate(cut({springCurve:[[0,0],[200,110]]})).includes('spring:cut-curve'));
  // Measured post-cut spring: current free length, no simulated cut, new measured curve.
  const measured=lengths({springFreeLength:180,springCurve:[[0,0],[150,90]]});
  assert.deepEqual(P.validate(measured),[]);close(P.springForce(measured,0),69);
  const pad=P.normalize({bumperThickness:4,bumperMaxCompression:1,springCurve:[[54,29.7],[139,76.45]]});
  assert.ok(P.validate(pad).includes('spring:coverage'),'curve must cover compression below first pad contact');
});
test('spring energy derivative agrees with force in length mode', () => {
  for(const p of [lengths(),cut(),lengths({springCurve:[[0,0],[60,35],[150,100]]})]) {
    for(const x of [.01,.05,.08]) close((P.springEnergy(p,x-1e-7)-P.springEnergy(p,x+1e-7))/2e-7,P.springForce(p,x),1e-6);
  }
});
test('optimizer rejects inactive length/preload searches and protects measured curves', () => {
  assert.throws(()=>O.searchSpace(P.DEFAULTS,{locks:{spring:false},values:{springCutLength:[10]}}),/spring-mode/);
  assert.throws(()=>O.searchSpace(lengths(),{locks:{spring:false},values:{springPreload:[40]}}),/spring-mode/);
  const p=lengths({springCurve:[[0,0],[200,110]]});
  for(const key of ['springFreeLength','springCutLength','springActiveCoils','springRemovedCoils']) {
    assert.throws(()=>O.searchSpace(p,{locks:{spring:false},values:{[key]:[p[key]+1]}}),/measured-spring/);
  }
  const space=O.searchSpace(p,{locks:{spring:false},values:{springInstalledLength:[155]}});
  assert.equal(space.total,2);
  assert.deepEqual(O.candidateAt(space,1).springCurve,p.springCurve);
  assert.throws(()=>O.searchSpace(p,{locks:{spring:false},values:{springSolidLength:[0]}}),/forbidden/);
});
test('optimizer spring lock freezes all lengths; unlocked cuts affect actual spring mechanics', () => {
  const p=cut(),space=O.searchSpace(p,{locks:{piston:false},values:{pistonMass:[68],springCutLength:[10]}});
  for(let i=0;i<space.total;i++) for(const key of O.GROUPS.spring) assert.equal(O.candidateAt(space,i)[key],p[key]);
  const cuts=O.searchSpace(p,{locks:{spring:false},values:{springCutLength:[10]}});
  assert.equal(cuts.total,2);
  assert.notEqual(P.springEnergy(O.candidateAt(cuts,0),0),P.springEnergy(O.candidateAt(cuts,1),0));
});
test('hypothetical cut estimates never masquerade as measured calibration inputs', () => {
  const row={...C.reference(),confirmed:true,setup:cut(),role:'train',solverVersion:P.VERSION,provenance:{geometry:'measured',spring:'measured'}};
  assert.equal(C.eligible(row),false);
  assert.equal(C.eligible({...row,setup:lengths()}),true);
  const clean=C.decode(C.encode([row])).measurements[0];
  assert.equal(clean.setup.springCutLength,20);assert.equal(C.eligible(clean),false);
});
test('older complete snapshots migrate inactive defaults without losing metadata or reusing fits', () => {
  const old={...P.DEFAULTS};
  for(const key of ['springLengthMode','springFreeLength','springInstalledLength','springCutLength','springActiveCoils','springRemovedCoils','springSolidLength','bumperThickness','bumperBore',...MODEL_34_FIELDS,...MODEL_40_FIELDS]) delete old[key];
  const row={...C.reference(),setup:old,confirmed:true,role:'train',solverVersion:'3.0.0'};
  const imported=C.decode({schemaVersion:3,measurements:[row]}).measurements[0];
  assert.deepEqual(imported.setup,P.normalize(old));assert.deepEqual(imported.legacySetup,old);assert.equal(imported.fps,330);assert.equal(imported.role,'train');assert.equal(imported.confirmed,true);
  assert.equal(imported.solverVersion,'3.0.0');assert.equal(C.eligible(imported),false);
  assert.deepEqual(C.decode(C.encode([imported])).measurements[0].legacySetup,old);
});
test('v3.1 snapshots gain an explicit zero bumper without becoming current calibration data', () => {
  const old={...P.DEFAULTS};delete old.bumperThickness;delete old.bumperBore;for(const key of [...MODEL_34_FIELDS,...MODEL_40_FIELDS])delete old[key];
  const row={...C.reference(),setup:old,confirmed:true,role:'train',solverVersion:'3.1.1'};
  const imported=C.decode({schemaVersion:3,measurements:[row]}).measurements[0];
  assert.equal(imported.setup.bumperThickness,0);assert.deepEqual(imported.legacySetup,old);
  assert.equal(imported.confirmed,true);assert.equal(imported.role,'train');assert.equal(C.eligible(imported),false);
});
test('v3.2 snapshots preserve their implicit head-bore-sized bumper opening', () => {
  const old={...P.DEFAULTS,headBore:4.7,bumperThickness:3};delete old.bumperBore;for(const key of [...MODEL_34_FIELDS,...MODEL_40_FIELDS])delete old[key];
  const row={...C.reference(),setup:old,confirmed:true,role:'train',solverVersion:'3.2.0'};
  const imported=C.decode({schemaVersion:3,measurements:[row]}).measurements[0];
  assert.equal(imported.setup.bumperBore,4.7);assert.equal(imported.setup.bumperThickness,3);
  assert.deepEqual(imported.legacySetup,old);assert.equal(imported.confirmed,true);assert.equal(C.eligible(imported),false);
});
test('v3.3 snapshots gain explicit contact and muzzle-flow defaults without reusing fits', () => {
  const old={...P.DEFAULTS};for(const key of [...MODEL_34_FIELDS,...MODEL_40_FIELDS])delete old[key];
  const row={...C.reference(),setup:old,confirmed:true,role:'train',solverVersion:'3.3.0'};
  const imported=C.decode({schemaVersion:3,measurements:[row]}).measurements[0];
  for(const key of MODEL_34_FIELDS)assert.equal(imported.setup[key],P.DEFAULTS[key]);
  assert.deepEqual(imported.legacySetup,old);assert.equal(imported.confirmed,true);assert.equal(imported.role,'train');assert.equal(C.eligible(imported),false);
});
test('v3.4 snapshots gain only v4 front-gas and bumper-curve fields', () => {
  const old={...P.DEFAULTS};for(const key of MODEL_40_FIELDS)delete old[key];
  const row={...C.reference(),setup:old,confirmed:true,role:'train',solverVersion:'3.4.0'};
  const imported=C.decode({schemaVersion:3,measurements:[row]}).measurements[0];
  assert.equal(imported.setup.frontDeadVolume,P.DEFAULTS.frontDeadVolume);assert.deepEqual(imported.setup.bumperCurve,[]);
  assert.deepEqual(imported.legacySetup,old);assert.equal(imported.confirmed,true);assert.equal(C.eligible(imported),false);
});
test('inactive spring inputs do not manufacture independent calibration conditions', () => {
  const setups=[P.normalize(),P.normalize({springFreeLength:400,springInstalledLength:300,springActiveCoils:50}),lengths({springPreload:100})];
  const rows=setups.map(setup=>({...C.reference(),setup}));
  assert.equal(C.groups(rows).length,1);
  const curve=[[0,0],[200,110]];
  const a=lengths({springCurve:curve,springStiffness:400}), b=lengths({springCurve:curve,springStiffness:800,springActiveCoils:42,springSolidLength:30});
  assert.equal(C.groups([{...C.reference(),setup:a},{...C.reference(),setup:b}]).length,1);
  assert.equal(C.groups([...rows,{...C.reference(),setup:lengths({springFreeLength:210})}]).length,2);
  assert.equal(C.groups([{...C.reference(),setup:P.normalize({springStiffness:400})},{...C.reference(),setup:P.normalize({springStiffness:800})}],['springStiffness']).length,1);
});
