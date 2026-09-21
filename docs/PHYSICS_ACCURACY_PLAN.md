# Physics accuracy plan for the spring-sniper pneumatic timing lab

Research and source review: 21 September 2026. Code reviewed: `index.html` at commit `0b3ede8`. This document specifies proposed changes; it does not change the simulation or validate its present predictions.

Implementation follow-up: the v3 code now implements the conservative lumped-model core and revised interface/calibration. This original research checklist is retained as the audit baseline, not marked wholesale complete. See [implemented model, tests and remaining work](MODEL.md), especially the unresolved spherical-BB/ahead-gas and 1D pressure-wave validation items.

## Objective and conclusion

Determine whether the BB has received most of its useful acceleration before airflow restriction by the airbrake materially changes piston motion, while estimating residual piston impact and muzzle discharge. Preserve the standalone, offline web application and English/Croatian interface.

The current app is a qualitative demonstration. Adding dimensions alone will not make it accurate: cylinder pressure, air flow through the head, BB pressure, and piston motion must be solved together with consistent mass and energy accounting. Accuracy must subsequently be demonstrated against measurements. Agreement with one muzzle velocity cannot establish correct pressure histories or event timing.

An appropriate development path is a conservative model of connected gas chambers, followed by validation against a spatially resolved barrel model and experimental data. Published spring-airgun models provide useful methods, but their pellet friction, bore sealing, pressures, and timing cannot be transplanted into a smoothbore airsoft BB model. [Do Duc et al., 2017: experimentally evaluated control-volume approach](https://cris.technion.ac.il/en/publications/the-internal-ballistics-of-airguns/).

## 0. User-confirmed hardware: AMP kit supplied by Tridos

During this review the user identified the installed kit as the **Ultimate SSG10 / VSR10 Piston + Cylinder Head Kit by AMP**, sold by Tridos. It is a different piston/head assembly from the earlier Scorpion comparison. Tridos describes a one-piece steel piston, three interchangeable airbrakes plus a plug, an SSG10 cup supplied installed, and a matched head with a damper. It lists a nominal piston mass of **71 g**. [The user's product listing](https://tridos.design/products/ultimate-ssg10-vsr10-piston-cylinder-head-kit).

AMP's own current kit listing specifies **69 g without an airbrake and 72 g with the longest one**. These may describe different pin states or revisions; do not resolve the difference by choosing one undocumented mass. Weigh the user's assembled piston with its selected pin/plug, cup and glide rings. The manufacturer also identifies a wide-bore head, a nozzle-to-hop seal and a rubber impact damper. [AMP kit specifications](https://amp-machine.com/shop/p/am-ultimate-vsr-piston-cylinder-head-71g-stainless-steel-one-piece-piston-with-airbrake-and-high-flow-cylinder-head-with-rubber-damper).

The inspected product pages do not provide the required receiving-bore diameter, pin diameters, three pin projections, passage lengths or rubber-damper properties. Those remain unknown. Product statements about increased power are not measurements of this rifle and must not become simulation multipliers.

Specific additions to the plan for this kit:

- Add an **AMP / Tridos Ultimate SSG10** component preset with source-backed nominal data and visibly missing geometry; retain Scorpion as a separate comparison.
- Select **plug / short / medium / long pin**, using individually measured projection, diameter/profile and assembled mass. Treat the no-airbrake plug configuration as a closed piston attachment hole; it is not the same as an unfilled leaking hole.
- Separate the **pneumatic cushion** from the **rubber impact damper**. The damper's thickness, aperture and deformation can influence contact position, available clearance and the pressure/impact history. Determine whether the pin passes through a rubber aperture before the rigid head bore; model that geometry if present.
- Store the actual cup variant and nozzle-to-hop leakage separately. A tight piston seal and a tight nozzle seal are different flow paths.
- Do not presume that the one-piece assembly short-strokes by the same construction as a modular piston. A generic short-stroke comparison needs the actual change to contact/cocked positions and spring-seat geometry.
- The kit identity alone does not confirm which pin, spring, barrel or hop setting was used for the existing 330 fps measurement.

## 1. Dimensions to add and what they mean

“Cylinder-head diameter” must be made unambiguous. Its external body diameter mainly concerns fit. The internal passage through which the air flows, including the section entered by the airbrake, is the important pneumatic dimension.

| Input | Physical meaning and reason to include it | Evidence needed |
|---|---|---|
| Cylinder internal diameter | Determines piston pressure area and swept volume | Actual bore measurement or confirmed part drawing |
| Cocked piston-face position and contact position | Their difference is actual stroke; removes hidden changes to bore | Measured assembly geometry |
| Cylinder-head entrance bore | The hole receiving the airbrake; determines clearance | Bore diameter and where its entrance plane lies |
| Head/nozzle bore profile | Diameter and length of each step, taper, and outlet; some heads have multiple bores | Section dimensions or manufacturer drawing |
| Airbrake tip/head diameter | Maximum obstructing diameter; distinct from piston-head diameter | Measured diameter and tolerance |
| Airbrake shaft diameter | Needed when the tip and shaft have different diameters | Measured shaft diameter |
| Airbrake protrusion and axial profile | Tip location, tapered tip length, steps, and adjustment define entry and overlap | Length measured from a stated piston-face datum |
| Radial clearance and concentricity | Small gaps strongly affect flow; off-center pins do not behave like concentric gaps | Derived clearance plus tolerances; eccentricity optional until needed |
| Passage overlap length | Changes continuously with insertion; controls resistance in a narrow gap | Derived from the two profiles |
| Cylinder residual cavity volume | Air space left at piston contact, including cup recesses | Geometry or measured volume, with uncertainty |
| Transfer passage and breech volumes | Gas storage between cylinder and BB; count each cavity once | Measured dimensions and BB seating location |
| Barrel ID, length, BB diameter and mass | Pressure force, available air space, and blow-by | Measured values/distributions rather than only labels |
| Piston cup, bumper thickness, spring-seat locations | Influence sealing, contact, stroke, and spring compression separately | Exact assembly/part variant |

A single nozzle diameter is insufficient for all platforms: Sniper Mechanics describes an SSG10/VSR head with a dual-bore nozzle. Silverback explicitly specifies a **4.00 mm internal nozzle** for the original SRS/TAC-41 heads associated with its Advanced Piston Head; this is not an SSG10 specification. [Sniper Mechanics head description](https://snipermechanics.com/vsr10-ssg10-damper-cylinder-head/), [Silverback geometry and airbrake description](https://www.silverback-airsoft.com/bph-01).

No verified bore/pin dimensions for the user's AMP head/piston assembly are available in this review. Do not silently populate them from a different platform, stock version, or retailer compatibility claim. Each component preset should describe its cup, pin, mass and dimensions, rather than apply a brand-specific performance multiplier.

### Why both diameters and overlap matter

For a circular, concentric, rigid pin inside a circular bore:

`radial clearance g = (D_head − d_pin) / 2`

`open annular area A = π(D_head² − d_pin²) / 4`

These are geometric calculations, not a complete flow model. For an illustrative 4.00 mm passage, changing a pin from 3.80 to 3.90 mm changes area from about 1.225 to 0.620 mm²: almost a halving. These example dimensions are not a proposed SSG10 setup. A long narrow clearance also has wall-friction losses depending on overlap length, flow regime, temperature and alignment. Equal open areas need not give equal air flow.

Model separate regimes: free passage before entry; entrance/tip restriction; increasing annular overlap; any actual contact/seal; and reopening during rebound. A negative rigid clearance is invalid geometry. Elastomeric interference requires a contact/deformation model and cannot be represented by silently clamping a negative area to zero.

## 2. Prioritized changes

Priorities describe implementation dependencies, not promises of real-world accuracy.

### P0 — Fix results that can be misleading regardless of model sophistication

- [ ] **C01 — Preserve events that never occurred.** Keep BB exit, airbrake entry, piston contact and rebound events nullable. A time limit is an incomplete simulation, not an exit. A piston that has not hit the head must not receive a zero-impact “soft landing” classification. Propagate these states into calibration, comparisons, charts and animation. Current fault: `simulate()`, approximately lines 2337–2351.
- [ ] **C02 — Restore measurement provenance.** The supplied 0.46 g / 330 fps point is real, but its spring, piston mass, rod length and geometry were not supplied with it. The app currently invents that complete setup in `loadCalibration()`, around lines 2791–2820. Keep this point as “setup incomplete / reference only” until confirmed. Its approximately 2.327 J is calculated from the same mass and speed, not another independent observation.
- [ ] **C03 — Remove unsupported certainty from results.** Identify calculated geometry, conditional physics predictions, fitted parameters, and acoustic proxies separately. Present uncertainty and validity per output: a validated muzzle speed does not automatically validate pressure, impact, timing or sound. Preserve old calibration data, but version its schema and invalidate old fitted coefficients when the model changes.

### P1 — Replace the central physical model

- [ ] **C04 — Use measured geometry as the source of truth.** Fix cylinder bore and derive swept volume from stroke. Make volume an output, or an alternative input mode that explicitly solves for bore. Changing the stroke slider must not resize the cylinder. Calculate airbrake entry from physical reference planes and tip position. Subtract the pin's occupied volume consistently across connected regions. Reject incompatible BB/bore dimensions and impossible rigid assembly intersections. Current fault: `cylinderArea = cylinderVolume / stroke` around line 2180 plus independently editable inputs.
- [ ] **C05 — Model short stroking by its construction.** Distinguish a forward-shifted cocked piston face, a changed front stop/bumper, and changed spring spacers/seats. These can change stroke, dead space, pin entry, preload and spring compression differently. Retain the same spring stiffness when the same spring remains installed. Do not conflate shorter bolt travel with an independently measured piston stroke.
- [ ] **C06 — Conserve gas mass and energy in separate volumes.** At minimum use cylinder and air-behind-BB states, with explicit nozzle/breech volume allocation. Add a nozzle cavity state if it stores appreciable gas or has distinct restrictions on each end. Carry mass, temperature/internal energy and volume. Calculate pressure from the equation of state; transfer actual mass and enthalpy through passages. Model heat transfer and leakage explicitly. Remove the independent pressure-efficiency multipliers and imposed exponential post-exit pressure decay. Current pressure block: approximately lines 2224–2243.
- [ ] **C07 — Let the airbrake change passage conductance.** Replace the extra empirical braking-force curve with flow restriction derived from insertion geometry and a calibrated loss model. Use compressible flow, pressure-dependent choking where applicable, and flow reversal. Use an annular-duct treatment for extended overlap; a short-orifice law alone is insufficient. The cylinder pressure produced by the restriction must also produce the piston deceleration. Do not add the same cushion again as an independent force. Silverback and Novritsch both describe airbraking through restriction at the head. [Silverback](https://www.silverback-airsoft.com/bph-01), [Novritsch SSG10 pins](https://eu.novritsch.com/product/ssg10-air-brake-pins/).
- [ ] **C08 — Replace spring-rating multipliers with a spring force curve.** Input measured force versus compression or, initially, a measured stiffness and installed preload. Record free length, installed lengths and relevant spacers. Derive released spring energy by integrating force over actual travel. M110/M150/etc. remain part labels until associated with measured curves. Include total translating piston assembly mass, pressure-dependent seal friction and static/dynamic friction. Explore spring effective mass separately from piston mass. Higher fidelity can include spring modes; a one-third-spring-mass correction is only a uniform-deflection approximation. [Tavella, spring mechanics and modeling hierarchy, pp. 6–9](https://the5thshot.co.za/wp-content/uploads/2020/04/Ballistics_Internal_Ballistics_of_Spring_Piston_Airguns_Tavella.pdf).
- [ ] **C09 — Permit rebound and deceleration.** Allow signed piston velocity, directionally correct friction and pressure forces, and physically valid underpressure. Allow BB acceleration to become negative. Use explicit contact/end-stop events and a dissipative impact model. A stalled piston is not a frictionless one-way ratchet. Current clamps: around lines 2242–2243, 2279 and 2297.
- [ ] **C10 — Model the BB as a leaking moving sphere.** Separate hop/bucking release resistance, resistance during motion, and air leaking around the BB. Link leakage to measured BB/barrel clearance with a suitable conductance model; a sphere has an axially varying clearance, not a long cylindrical annulus. Account for the air ahead of the BB and muzzle outflow, or validate an ambient-front-pressure approximation. Include hop contact/backspin energy loss if sensitivity/measurements justify it. Do not copy rifled-pellet friction constants.
- [ ] **C11 — Continue gas dynamics after exit.** BB exit opens a muzzle boundary while the piston and compressed cylinder air may still move. Calculate gas mass flow, pressures and temperatures through this period. Correct contact timing/velocity and discharge indicators depend on it. Model the muzzle crossing as an event with a documented finite-BB or point-boundary approximation; do not infer piston contact merely because the animation finishes.

### P2 — Make timing, sound indicators and calibration defensible

- [ ] **C12 — Replace the arbitrary “strong brake” event.** Show geometric entry, actual piston deceleration, piston stop/rebound, BB peak speed, BB exit and contact independently. Compression can decelerate a piston even without an airbrake. Attribute an airbrake effect using an explicitly defined comparison against the same assembly without the restriction; compare at stated positions or times and account for pin volume/mass choices. A user-defined substantial-deceleration threshold must be labeled as a convention. Current 34%-of-spring-force / 45%-insertion rule, around line 2270, is not a physical event.
- [ ] **C13 — Redefine the useful-acceleration objective.** Display BB speed/energy at restriction and deceleration events, maximum pre-exit energy, exit energy and any subsequent energy loss. Report the time when the BB first reaches 95% of its maximum pre-exit kinetic energy, alongside any later drop. The 95% threshold is a user convention. Do not clamp ratios above 100%: they can indicate deceleration before exit. Also offer accumulated positive BB work, with losses displayed separately. Compare impact and discharge against retained exit energy as a trade-off; uncertainty may prevent identifying a single best setting.
- [ ] **C14 — Base sound-related displays on interpretable physical outputs.** Show piston contact speed and kinetic energy, and impulse only if a contact model exists. Peak impact force needs contact stiffness, deformation and duration; it cannot be obtained from impact energy alone. For muzzle discharge, show exit pressure, actual gas inventory, peak outflow and release duration; any derived score remains a named heuristic. Actual perceived sound additionally depends on contact materials, damping, spring vibration, stock modes, suppressor and measurement position. Geometry alone cannot yield calibrated dB or acoustic spectra. Remove universal “hard/soft” categories unless explicitly relative to a chosen baseline.
- [ ] **C15 — Fit only parameters the data can constrain.** Support repeated raw chrono shots, setup metadata, uncertainty and held-out configurations. Multiple repeats at one configuration improve repeatability estimates but do not identify additional physical parameters automatically. Fit measured geometry/spring data first, then a small number of uncertain losses. Examine parameter correlation/sensitivity and alternative fits. Keep confidence intervals for fitted parameters separate from prediction intervals and model-form uncertainty. [NIST uncertainty guidance](https://www.nist.gov/itl/sed/topic-areas/measurement-uncertainty).
- [ ] **C16 — Separate the solver from presentation and verify it.** Use a pure calculation module, shared identically by local and hosted builds. Decouple animation sampling from integration and event location. Add adaptive integration/event refinement and convergence checks. Do not hide divergence or invalid states by clipping pressure, energy or velocity. Preserve offline use, bilingual explanations and export/import of complete measurement/configuration records.
- [ ] **C17 — Validate pressure-wave effects for the requested timing precision.** A two-volume model assumes nearly uniform pressure in each region. It cannot be declared a high-accuracy timing model solely because its integrator uses microseconds. Compare against a 1D compressible-flow barrel/nozzle model that resolves gas momentum and pressure waves; use that as the high-fidelity solver if the simpler model shifts relevant events materially. In stationary air at 20°C, a disturbance takes about 1.25 ms to cross 430 mm. This is a scale estimate, not a predicted firing delay; gas temperature and motion change it. [NASA sound-speed relationship](https://www.grc.nasa.gov/www/k-12/VirtualAero/BottleRocket/airplane/sound).

### P3 — Add complexity when measurements show it matters

- [ ] **C18 — Refine component laws.** Consider cup deformation and pressure-dependent sealing, moving annular-wall effects, pin eccentricity, nozzle entry/exit losses, lubricant-dependent friction, temperature-dependent gas viscosity/heat capacity, rear-piston vent restriction, spring surge, bumper viscoelasticity and receiver motion. Rank these by sensitivity and evidence. Humidity and material thermal changes can be modeled if their effects exceed the measurement/error budget. Detailed structural acoustics, 3D flow and fluid–structure interaction require corresponding geometry/material data; more unmeasured parameters can make a fit less informative.

## 3. Proposed conservative core

This is an engineering design proposal, not a validated SSG10 model. All solver quantities should use SI units and absolute pressure; convert to gauge pressure for display.

For each nearly uniform gas region `i`, maintain mass `m_i`, volume `V_i`, and internal energy `U_i`:

```text
T_i = U_i / (m_i cv)              [constant-cv ideal-gas starting approximation]
p_i = m_i R T_i / V_i
dm_i/dt = sum(incoming mass rates) − sum(outgoing mass rates)
dU_i/dt = Qdot_i − p_i dV_i/dt
           + sum(mdot_in h_in) − sum(mdot_out h_out)
```

Use upstream enthalpy for transfer and remove exactly the energy that is added to the adjacent region, within the chosen treatment of jet kinetic energy. For a 1D flow model, include kinetic energy and total enthalpy explicitly. Include wall heat flow with an estimated/measured heat-transfer law; do not independently fit both an arbitrary compression exponent and heat transfer to describe the same effect. A lumped ideal-gas model should reproduce the closed adiabatic and isothermal limiting cases. This architecture follows conservation principles; the component loss laws remain hypotheses to validate. [Thermodynamic airgun model, primary author manuscript](https://www.researchgate.net/publication/318666386_The_internal_ballistics_of_airguns).

For a short restriction, a starting compressible discharge law uses upstream reservoir pressure/temperature `pu, Tu`, downstream ratio `r = pd/pu`, throat area `A` and discharge coefficient `Cd`. For air approximated with `gamma = 1.4`, the ideal critical pressure ratio is approximately 0.528. Above it use the subcritical pressure-ratio branch; below it use the sonic/choked branch. Choking may occur in the passage even while the BB is subsonic. Reverse upstream/downstream when pressure reverses. This ideal law requires corrections for real passage losses and does not establish the behavior of a long annular gap. [NASA compressible mass-flow derivation](https://www.grc.nasa.gov/www/k-12/airplane/mflchk.html).

For an overlapping concentric pin, the hydraulic diameter is `D_head − d_pin`; the overlap length and wall conditions determine frictional resistance. A compressible duct/leakage model must handle the transition from an entrance restriction to a long clearance. A thin-gap, low-Mach, laminar limit can have conductance proportional to clearance cubed and inversely proportional to overlap length; do not apply that limit indiscriminately through the shot. If several restrictions are in series, solve their shared flow and intermediate pressures; choosing only the smallest geometric area loses the other pressure drops. A measured flow-versus-pressure-and-insertion map is a useful alternative closure when available. [Example engineering gas-pipe formulation, including hydraulic diameter, friction and inertia](https://www.mathworks.com/help/simscape/ref/pipeg.html).

Use the same geometry for gas displacement and mechanical pressure force. For a mechanical coordinate `q`, pressure contributes generalized force `sum(p_i ∂V_i/∂q)` including external/rear pressure regions. This enforces matching gas compression work and work on moving parts. Once a pin crosses between regions, pressure can act on its tip and on an annular piston face; a full-bore piston force plus a second invented cushion would double-count or misallocate work. If the passage pressure is spatially resolved, integrate pressure and shear on the wetted moving surfaces instead.

The BB and piston equations must include signed net forces and explicit constraints. Near zero velocity, use a static-friction/contact treatment rather than a sign function that forces numerical oscillation. At piston contact, account for energy absorbed by the bumper or a documented restitution law; the gas state does not cease to exist at impact.

## 4. Short stroking: the exact volume distinction

For a fixed cylinder area `Ac`, piston stroke `S` and effective distance from airbrake entry to piston contact `Le`:

```text
total swept cylinder volume        = Ac S
piston travel before entry         = S − Le
volume swept before entry          = Ac (S − Le)
geometric cylinder space at entry  ≈ Ac Le + residual cavity volume
```

These simplified expressions assume unchanged head/rod/contact geometry and omit pin-displacement corrections. The last quantity need not shrink when only the cocked position moves forward. Its pressure, temperature and gas mass can nevertheless change.

For the app's assumed 35.8 cm³ / 85 mm cylinder with a 20 mm effective entry distance, shortening the stroke by 20 mm gives about 27.38 cm³ total swept volume and 45 mm of travel before entry. The pre-entry swept volume falls from about 27.38 to 18.95 cm³. The main-cylinder geometric space at entry stays about 8.42 cm³ before residual-cavity/pin corrections. These validate geometry arithmetic, not the actual dimensions or performance of the user's rifle.

If short stroking is done with a front bumper or a longer piston assembly, recalculate the head datum, spring-seat positions, pin projection, residual volume and total moving mass from that construction. “20 mm short stroke” alone is not a complete configuration.

## 5. Calibration and measurement plan

### First collect the configuration

1. Exact AMP head/piston revision, installed cup/seal type and selected pin/plug; record other piston brands as separate configurations.
2. Actual cylinder bore, piston stroke, pin projection, head bore profile and passage lengths. Attach tolerances and distinguish measured from nominal dimensions. Bore gauges/pin gauges and a micrometer may resolve close clearances better than a casual caliper reading.
3. Total moving assembly mass, barrel length/ID, BB brand/batch and mass/diameter sample, bucking/hop setting.
4. Spring force at several compression lengths over the installed range; installed preload/seat geometry; spring mass if modeling it.
5. Head/cup/breech cavities, seals and bumper geometry. Leak-down or flow measurements should be recorded with their pressure and piston/pin position; a stationary test does not fully identify dynamic sealing.

### Then build an informative dataset

Use repeated shots for each complete setup, storing individual velocities, sample size, standard deviation, chrono identity/uncertainty, sensor distance from the muzzle, environment and any drift. A chronograph samples speed over its sensing region; the model's muzzle-exit value is a different measurement location and may need a correction or uncertainty allowance. An initial 10–20 shots per condition is a practical starting choice, not a guarantee of sufficient precision. Use several BB masses and more than one independently changed geometry/airbrake condition. Keep hop and other conditions recorded; changing BB mass may also change the chosen hop setting.

Initially calibrate a baseline with independently measured spring/geometry and a small set of loss parameters. Then validate on configurations withheld from fitting, including changed airbrake insertion, piston mass, stroke and barrel. Do not fit a separate unrestricted efficiency constant to every setup: that would conceal the model's predictive error. Determine the next experiment using sensitivity analysis, especially when two unknowns can compensate for one another.

For internal timing validation, add synchronized piston displacement/velocity or event sensing, BB-exit timing, and preferably cylinder/breech pressure traces. Pressure instrumentation must have suitable bandwidth, range, and a characterized mounting cavity; its added volume and response can change the phenomenon being measured. [PCB guidance on pressure sensing and mounting response](https://www.pcb.com/resources/technical-information/introduction-to-pressure-sensors). An external microphone measures a mixture of mechanical and airflow sounds and does not uniquely establish piston contact time. Acoustic validation also needs fixed microphone position, unclipped impulse capture and a defined sound metric.

### Existing-model demonstration of ambiguity

An independent read-only calculation held the present default geometry, 72 g piston, 0.46 g BB and 20 mm / 72% airbrake constant. It varied the current model's flow-efficiency parameter and numerically fitted drive scale to the same 330 fps observation:

| Current-model parameter/result | Fit A | Fit B |
|---|---:|---:|
| Flow efficiency | 0.70 | 0.96 |
| Fitted drive scale, approximately | 0.31684 | 0.33320 |
| Muzzle velocity | 330 fps | 330 fps |
| BB exit | 18.73 ms | 17.72 ms |
| Current heuristic brake marker | 17.02 ms | 19.15 ms |
| Marker relative to exit | 1.71 ms before | 1.43 ms after |
| Current impact index | 19.65 | 41.90 |

These are diagnostic outputs of the flawed existing model, not two predictions claimed to be valid for the rifle. They show that matching one chrono value can reverse the timing conclusion. Repeated copies of that value do not add independent information about the internal states.

## 6. Verification and acceptance before claiming improved accuracy

| Check | Required result |
|---|---|
| Geometry invariants | Fixed bore stays fixed during short stroking; swept volumes agree with analytic geometry; volumes remain positive; pin transfers do not create gas space |
| Closed-gas limits | Recover expected adiabatic compression/expansion and controlled isothermal behavior without leakage |
| Flow limits | Zero flow at equal pressure; correct direction on reversal; short-orifice choking limit; increased long-gap resistance with overlap in its validated regime |
| Conservation | Gas mass balances including all external flows; spring, piston, BB, gas, friction, contact, heat and discharged-energy terms reconcile under a consistent ambient reference |
| Mechanics | Signed velocity/rebound; moving BB decelerates when resistance exceeds thrust; static friction prevents artificial creep; contact dissipates rather than creates energy |
| Event handling | BB-in-barrel timeout never becomes muzzle velocity; no piston contact never becomes a soft impact; thresholds locate events consistently |
| Numerical convergence | Refine integration tolerance/time step and, for 1D flow, spatial mesh; report convergence of exit speed, event times, peak pressure and contact energy separately |
| Dimensional/unit checks | Equivalent SI and display-unit inputs agree; absolute versus gauge pressure is explicit; invalid assemblies cannot be simulated as valid ones |
| Independent validation | Predict held-out configurations within stated measurement and model uncertainty, with residuals checked against BB mass, airbrake geometry, stroke and temperature |
| UI consistency | Curves, colors, arrows and event order use solver states; reverse motion, negative acceleration and missing events are visible; cylinder and BB pressures are separate traces |

Proposed engineering convergence targets could initially be changes below 0.1% in exit speed and 0.02 ms in key event times on another refinement, with an energy-balance error well below the experimental uncertainty. These are development targets, not achieved accuracy claims. Impact peaks may require much stricter contact resolution than muzzle speed. Use scaled error measures when a quantity approaches zero.

The present model's baseline changes very little when its time step is reduced; this does not repair missing physics. Numerical error, input uncertainty, model inadequacy and shot-to-shot variability must be reported separately. Propagate uncertain dimensions and fitted losses to result intervals, maintaining parameter correlations rather than varying each unknown independently without justification. [NIST sensitivity and uncertainty budgets](https://www.itl.nist.gov/div898/handbook/mpc/section5/mpc56.htm).

Separate verification of the implementation from validation against physical measurements. Conservation and convergence tests establish that the selected equations are being solved consistently; they do not establish that those equations represent the rifle adequately. [NASA verification assessment](https://www.grc.nasa.gov/WWW/wind/valid/tutorial/verassess.html).

## 7. Suggested implementation order and deliverables

1. C01–C05: truthful events, calibration provenance, measured geometry and mechanical short-stroke definitions.
2. C06–C11: a testable conservative solver with geometry-dependent airflow, spring mechanics, BB losses and post-exit evolution.
3. C12–C16: event-based visualizations, physically interpretable indicators, versioned calibration and automated verification.
4. C17: compare lumped and spatial flow results against the required timing accuracy and instrumented observations; retain the fidelity justified by those results.
5. C18: add measured component refinements where sensitivity/residuals show a benefit.

Deliver an input/provenance sheet, exported run histories, a conservation/convergence report, a held-out measurement report and uncertainty bands. The standalone app can remain dependency-free at runtime, with the same solver bundled into the local HTML and Cloudflare build. No parameter fit should be labeled “SSG10 calibrated” until it is tied to a documented configuration and a declared range of validation.
