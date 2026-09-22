# Implemented model v4.1 — scope and verification

This release uses a conservative **three-control-volume model without a silencer and four-control-volume model with one installed**, using quasi-steady compressible-flow engineering approximations. It does not claim experimental SSG10 accuracy, acoustic attenuation, or pretend that its pressure-wave diagnostic is a spatial 1D flow solution. All quantities below are SI internally.

## State, geometry and force

State: piston position/velocity; BB position/velocity; mass and internal energy of cylinder gas, gas behind the BB, gas ahead of the BB, and—when enabled—the silencer gas; cumulative boundary energy/mass, friction losses, bumper-damping loss, rigid-contact loss, and positive/negative BB net work. Ambient air is a reservoir. Air is ideal with R = 287.05 J/(kg K), gamma = 1.4 and constant heat capacities.

Let `x` increase toward the head, `S0` be the nominal travel to the rigid head without an added pad, `b` added bumper thickness, `S=S0−b` the undeformed first-contact travel, `δmax=min(b, entered compression cap)`, `Ac` cylinder area, `Abo` bumper-opening area, `Ah` metal head-bore area, `Ab` barrel area, `y` BB travel, `Lpin` projection, `z=max(0,Lpin−(S−x))` geometric insertion, and `ell=min(z,Lpin)` the length still transferring pin volume between chambers. The bumper is an annulus with its own entered inner diameter, so `Vbumper=(Ac−Abo)b`. The pin has a linearly tapered tip then constant-diameter shaft; `Vpin(ell)` is its integrated occupied volume:

```text
Vc = residualCylinder + Ac(S0−x) − Vbumper − Vpin(Lpin) + Vpin(ell)
Vb = downstreamStorage + Ab y − Vpin(ell)
Vf = frontResidual + Ab(Lbarrel − y)
dVc/dx = −Ac + Apin(z)  for 0 < z < Lpin; otherwise −Ac
dVb/dx = −Apin(z)       for 0 < z < Lpin; otherwise 0
dVf/dy = −Ab             before BB exit
Fp,gas = pamb Ac + pc(dVc/dx) + pb(dVb/dx)
FBB,pressure = (pb − pf) Ab
```

The matching derivatives couple mechanical work to compression work. There is no additional invented air-cushion force. Entry reduces passage conductance, pressures evolve, and pressure forces may decelerate/reverse the piston. `Vc+Vb` changes by `−Ac dx + Ab dy`: pin movement between regions does not create gas volume.

**BB approximation:** pressure force and volume displacement both use barrel area. The BB is treated as a leaky effective piston, not a resolved moving sphere. Actual BB diameter sets the clearance leakage area. Gas bypass transfers mass and enthalpy from the behind-BB volume into the front volume, and the front volume vents through the muzzle before exit. A small entered terminal volume prevents a zero-volume singularity at the crown. At exit that terminal pocket becomes part of the ambient reservoir and the exact mass/energy state change is booked in the conservation ledger. Full spherical clearance flow, hop/backspin mechanics, and a spatially resolved barrel field remain unresolved (plan C10/C17).

The entered downstream volume includes head/nozzle/breech storage only once, before pin subtraction. `residualCylinder` is the bare rigid-head cavity; the pad solid is subtracted separately. Flow crosses three consecutive axial segments: bumper opening over `b`, rigid-head bore, then nozzle. Pin overlap is calculated from the moving pin interval, including its extra travel during pad compression. Once the full pin is downstream, further piston motion does not fabricate more displaced pin volume. Negative storage or interference geometry is rejected for every segment the pin can reach through `S+δmax`. Real pad outside diameters, central holes, extrusion and eccentric contact vary; measure them if this approximation matters. Arbitrary bulb-shaped pins, elastomeric interference and multi-cavity heads need an extended geometry model.

## Thermodynamics and flow

```text
T = U / (m cv)
p = (gamma−1) U/V
dm/dt = incoming mass − outgoing mass
dU/dt = −p dV/dt + incoming enthalpy − outgoing enthalpy + Qdot
Qdot = heatConductance (Twall − Tgas)
```

Internal flows transfer equal mass and upstream `cp*T` enthalpy between adjacent control volumes. External leakage/discharge uses the upstream chamber or ambient enthalpy, including inflow when the pressure reverses. Jet kinetic energy is not stored separately in this lumped model. The shrinking front pocket is advanced with a local implicit mass/energy solve because it becomes stiff near the muzzle; the other states retain the adaptive midpoint integration. Post-exit pressure remains part of the same calculation; no exponential decay is imposed.

Short-restriction mass flow uses the ideal isentropic unchoked/choked branches (critical downstream/upstream ratio ≈0.528), with the upstream temperature and sign selected dynamically. Bumper, head and nozzle segments contribute to an approximate series resistance, including entrance loss and overlap-dependent wall friction. Every actually overlapped interval is sliced to at most 0.25 mm and evaluated at the local entered pin diameter, so a taper is not replaced by one worst-case diameter. Viscosity follows Sutherland's air relation. Hydraulic diameter is bore minus local pin diameter for an annulus. Laminar Darcy factors use 64/Re for an open bore and the exact concentric-annulus Poiseuille factor, which approaches 96/Re in the narrow-gap limit; a smooth transition introduces a turbulent Blasius approximation.

The flow solves its friction-dependent resistance using an analytic laminar root or bracketed bisection. This avoids the incorrect finite-iteration flow floor in very small clearances. The regression suite checks the thin-gap low-pressure limit.

**Limits:** this is not a spatially resolved compressible annular duct. Profile slices share one mass flow and the combined resistance does not solve every intermediate pressure or local sonic transition. Moving-wall shear, eccentricity, roughness-specific losses and transient gas momentum are not resolved. Cd is an uncertain loss coefficient, not a claimed physical efficiency or noise-reduction percentage. Measured flow-versus-pressure/insertion data should replace these closures where available.

Piston/nozzle leakage inputs are *effective* areas including loss coefficients. BB bypass is clearance area times an uncertain coefficient; it is not a full spherical-gap calculation. Muzzle flow uses its own entered `muzzleDischargeCoefficient` (default assumption 0.85), separate from head Cd. Before exit it controls how the front gas vents and therefore can affect BB motion; after exit it controls discharge of the behind-BB charge. The displayed atmospheric-outlet contributor excludes nozzle-seal leakage. Muzzle crossing is a point-boundary approximation.

### Optional silencer control volume

When enabled, the silencer is a constant-volume gas chamber connected to the inner-barrel crown. Before BB exit, the front control volume vents into that chamber instead of directly to ambient. After exit, the barrel charge transfers into the chamber. Only the modeled end-cap outlet crosses the ambient boundary. Mass and upstream enthalpy are transferred between the barrel/front volumes and silencer with equal and opposite terms; silencer outflow, enthalpy and optional heat exchange are included in the same global mass/energy ledgers.

The directly calculated geometry is:

```text
Vgross = π Dinside² Linside / 4
VbaffleSolid = Nbaffle · π(Dinside² − Dbaffle²)t / 4
Vfree = (Vgross − VbaffleSolid)(1 − packingFraction)
Aaperture = min(π Dbaffle²/4, π Dendcap²/4)
Aeffective = Aaperture · Cdsilencer / sqrt(Klumped)
```

The entered internal length is the usable expansion length from inner-barrel crown/entrance plane to the inside of the end cap; the internal diameter is the expansion chamber, not exterior tube diameter. Baffle count and representative axial thickness subtract solid annular volume. The smallest repeated baffle/core bore and end-cap bore define the aperture. Solid fill fraction subtracts occupied volume. Every BB-path bore must exceed entered BB diameter, but this validation is not an alignment or strike-safety certificate.

`Klumped = 1 + N(1−openRatio)² + 2 plateFraction/openRatio + 3 packingFraction/(1−packingFraction)` is a disclosed **heuristic minor-loss proxy**, not a derived baffle transfer function. `Cdsilencer` and silencer heat conductance are unknown/calibratable closures. The model calculates free volume, chamber pressure/temperature, barrel-to-silencer transfer, final atmospheric mass flow, discharged mass and pulse duration. Increasing free volume generally lowers chamber pressure for the same injected gas; reducing effective outlet area generally lowers the instantaneous outlet peak while raising pressure and extending decay. Coupled dynamics mean those trends are not guaranteed independently of all other inputs.

One lumped chamber cannot resolve chamber-to-chamber pressure waves, cone angles, asymmetric ports, individual baffle jets, porous acoustic absorption or frequency response. The solved BB trajectory ends at the inner-barrel crown; the animation only coasts the BB through the drawn silencer at that exit speed. Moving-BB blockage and additional acceleration/deceleration inside the silencer are not solved. Consequently the result is not a real firearm/airsoft acoustic model and does not predict sound pressure level or dB attenuation. This choice follows the scope distinction between lumped early-time chamber models and baffle-resolved transient CFD/acoustic studies: [single-chamber early-time model](https://www.sciencedirect.com/science/article/pii/0895717788901367), [weak-shock silencer experiment/CFD](https://www.sciencedirect.com/science/article/abs/pii/S0022460X03007946), and [baffle-resolved acoustic CFD example](https://www.mdpi.com/2076-3417/8/4/545).

## Mechanics, short stroking and contact

A spring is either linear or linearly interpolated from measured force/compression pairs covering the complete installed range. Let `preload0` describe compression at the bare rigid-head plane. An added bumper moves contact rearward, so `preloadContact=preload0+b`, while `preloadContact+S=preload0+S0`: the same cocked position keeps the same initial compression. Thus `F=k(preloadContact+S−x)`. Spring energy is the integral of that force; spring labels never multiply output.

### Optional length / cut mode

Direct preload remains the default. Length mode derives it from measurements. In the following equations lengths are meters (the UI accepts mm), `L0` is unloaded length before a hypothetical cut, `c` is the reduction in unloaded axial length, `Lf=L0−c`, and `H0` is the spring-seat separation at the bare rigid-head plane after accounting for spacers. The actual bumper-contact seat distance is `Hf=H0−b`:

```text
Hf = H0 − b
Hcocked = Hf − S = H0 − S0
preload = Lf − Hf             (replaces the direct input)
compression(x) = preload + S − x
kcut = k0 Na / (Na − Nremoved)
F(x) = kcut compression(x)
Wavailable = kcut/2 [(preload+S)² − preload²]
```

The active-coil ratio is an **estimate**, conditional on unchanged wire/material, mean diameter and effective end support, and a uniform linear active section. It follows `k=Gd⁴/(8D³Na)`. Free length alone cannot determine rate or removed active turns. A cut can raise rate while reducing preload and available work. Progressive contact between coils, changed end seating, fatigue, yielding and spring surge are not resolved. See [Gutekunst engineering catalogue](https://www.federnshop.com/download/pdf/gutekunst-federnkatalog-2013-e.pdf) and [Newcomb active-coil definitions](https://newcombspring.com/resources/helical-spring-active-coils).

Cut length is not wire length. Original active count must be positive for a cut estimate, with removed count smaller than the original. Zero removed active turns assumes only inactive end material was removed with unchanged effective support; that assumption needs checking. Spring mass is the **remaining installed mass**, not automatically scaled by length or active-coil ratio.

Reject nonpositive remaining free length, nonpositive cocked seat gap, slack at the front (`Lf<Hf`), and cocked seat separation at/below known remaining solid height. Equality `Lf=Hf` is allowed: zero front load without a slack interval. Unknown solid height remains explicit and disables the coil-bind check; a positive gap is not an engineering safety margin. Solid height depends on total turns and end treatment, not just active count. [Newcomb solid-height guidance](https://www.newcombspring.com/resources/compression-spring-solid-height)

A measured force curve uses derived compression for coverage and force integration, including the small additional release over the entered bumper-compression limit. Reject a simultaneous nonzero hypothetical cut: a pre-cut curve cannot be silently treated as a post-cut measurement. For an already modified measured spring, enter its current free length and force curve with cut/removal zero. The measured curve overrides linear rate. Rate measurements at known loaded lengths provide evidence rather than an M-rating. [Newcomb rate measurement](https://www.newcombspring.com/resources/compression-spring-rate)

Effective moving mass is piston assembly mass plus optional spring mass/3. That is a uniform spring-deformation approximation, not spring-surge mechanics. Displayed piston momentum and first-contact kinetic energy use the actual piston assembly mass; contact dissipation in the integration uses effective moving mass.

Piston friction is signed Coulomb resistance plus optional pressure-dependent seal resistance and linear rear/mechanical damping. At rest, static resistance is evaluated against the complete drive—including gas, spring, rear damping and bumper force—so a compressed pad cannot create artificial creep through a partial force balance. BB release and moving resistance are separate. The solver allows underpressure, negative acceleration and piston rebound. Small zero-crossing/end-stop projections are tracked as numerical/contact energy losses; finite-step event projection produces a small remaining balance residual, which is displayed rather than hidden.

With a nonzero pad and compression cap, front contact is a unilateral lumped Kelvin–Voigt episode. The elastic part is either entered linear stiffness `kbumper` in N/mm or a piecewise-linear measured compression/force curve. A curve must begin at 0 mm / 0 N, rise monotonically and cover the complete compression cap; its trapezoidal integral supplies stored elastic energy. The measured curve overrides linear stiffness. Viscous damping `cbumper v` remains separate; during unloading its effective coefficient is capped so total contact force never becomes tensile. The corresponding `ceffective v²` is accumulated as pad loss. The piston may compress the pad up to `δmax`; reaching that limit invokes separate rigid/bottom-out restitution. A zero-thickness or zero-compression pad retains the rigid-boundary restitution model.

Each continuous pad contact is one episode, even while force and compression vary. Recontact is counted only after separation. Settlement is accepted only after gas has quieted and piston speed and acceleration remain small for a dwell interval; reaching a low speed while force is still unbalanced is not labeled settled. An unfinished contact at the time/step limit remains explicitly incomplete. The UI reports the complete contact sequence plus modeled peak pad force, peak compression, duration and damping loss. These values are conditional on unverified lumped material inputs; they are not Shore hardness, distributed rubber stress, audible strike count, durability, loudness or dB. The animation shortens and bulges the drawn pad from the same solver compression, while exact 3D shape remains illustrative.

### Default reference and reverse motion

The app starts with zero airbrake projection, explicitly labeled a **no-pin reference**, not a measured AMP/SSG10 configuration. Other example dimensions, masses and spring/loss/contact data are still conditional assumptions. The old 20 mm projection, 3.8 mm shaft, 4 mm passage, 2 mm taper combination remains an explicit regression fixture and still produces substantial pressure-driven pre-contact retreat. Timestep refinement preserves the reversal; its force balance and assumed restriction cause it, rather than an impact or broad numerical instability. Removing that unverified restriction from the default does not establish accuracy for an actual airbrake.

The solver retains signed motion with no new damping, reverse-velocity clamp or artificial front-contact constraint. Separate timestamps identify the first velocity below −0.005 m/s before contact and after contact; the legacy `reboundTime` remains available. Running maximum position minus current position gives maximum rearward excursion, with a separate pre-contact maximum. These diagnostics are collected every accepted step, independent of display sampling. The UI warns when pre-contact excursion exceeds 1 mm; this is a visibility convention, not an invalidity criterion or a real-rifle limit.

Exact pre/post-impact samples at the contact timestamp preserve the velocity discontinuity. Playback interpolates to the pre-impact sample before that time and selects the post-impact sample at it. This changes presentation, not dynamics. Cylinder, head and pin use a common axial drawing scale, including the full passage length; the barrel uses a separate scale so the model's long barrel remains readable.

The default phase-paced playback allocates 80% of screen time to the interval through BB exit + 1.5 ms if that interval is less than 80% of the full run. The remainder shows **all** subsequent settling states faster, with a visible phase label. No-exit or short-tail runs and the uniform mode use one linear mapping. Clock, scrubber and graph axes remain physical milliseconds, and export/optimization still use the complete solution. Every timeline mapping is continuous, monotone, invertible and ends at the actual run duration.

The nominal short-stroke control changes the cocked position. Added bumper thickness instead moves the front contact plane rearward while keeping the same cocked position: effective travel is `S0−b`, contact spring compression rises by `b`, and cocked compression is unchanged. Both reduce swept volume and available released spring work, not spring stiffness. Other constructions must be represented by separately measured input changes.

## Events and indicators

Event times are nullable. A valid integration can be incomplete: BB still in barrel, no contact, or residual compressed gas remaining when maximum time is reached. There is no fabricated exit or zero-impact classification. Numerical failure invalidates all displayed results.

The events are geometric pin entry, first piston deceleration, first substantial deceleration after entry (default acceleration below −1,000 m/s² while moving forward), first rebound, every resolved head contact and BB exit. The threshold is an explicit convention. It is **not** a causal decomposition of airbrake versus ordinary compression forces.

Each `pistonImpacts` entry stores exact episode start time, incoming velocity, piston-only and effective-moving-mass kinetic energy, dissipated contact energy, the two gas pressures at entry, and—when a compliant pad is active—peak compression, peak force, duration, separation velocity and bottom-out state. A pressure-driven reversal that never reaches the contact boundary is not an impact. The UI plots every episode start in an expanded contact-time window and lists exact values for the first eight; the exported run retains all events. Summing incoming energies does not produce acoustic energy, loudness or dB, and modeled peak force is only as credible as the entered pad force law.

After an actual exit, the solver finds the first crossing of a chosen fraction (default 95%) of the maximum pre-exit BB kinetic energy. It also reports any later loss before exit, and accumulated positive/negative **net** work. An incomplete run can show its observed maximum but cannot determine this terminal timing objective. Ratios are not capped at 100%.

The no-pin baseline keeps the same assembly mass and other inputs, removing pin projection and its occupied volume. It is a specified hypothetical comparison, not a claim that removing a real pin leaves mass unchanged or isolates one force at equal time.

Sound-related comparison outputs remain first-contact piston speed/energy and inner-barrel exit pressure, gas inventory, actual atmospheric-outlet peak flow and mass discharged during the modeled interval. With a silencer installed, outlet flow is compared with the same setup with the silencer disabled; piston impact still uses the no-airbrake reference. The separate contact sequence is a mechanical event history, not an acoustic prediction. None is dB, acoustic intensity, certified suppressor performance or a universal hard/soft classification. Structural modes, microphone placement, rubber/packing properties and spring noise require measurements.

The Results feedback layer does not add another physical law. It compares the current valid run with the previous valid run and reports signed differences in selected solver outputs. One-input comparisons are conditional A/B model results; multi-input comparisons are marked as combined and are not decomposed into invented per-input causes. Invalid runs do not become a comparison baseline.

Action steps are deterministic interpretation rules, not a fitted controller or proof of an optimum. They use the timing verdict, availability of contact/exit, impact-energy and peak-outflow ratios against the same-setup no-airbrake reference, and measured/assumed provenance. Impact or flow below 85% is labeled lower, above 110% higher and the interval between broadly similar. Recommendations expose the relevant controls and the existing 95–105% energy-constrained optimizer; they do not predict dB or replace chrono/geometry measurements.

## Numerics and verification

The pure solver is independent of animation and shared verbatim by standalone/hosted versions. An adaptive explicit midpoint method limits the step to 10 μs by default, estimates local change from Euler/midpoint differences, reduces steps near geometry/events, rejects nonpositive mass/energy/volume states, and records samples independently. The stiff front-gas pocket uses a local implicit Newton solve. Minimum-step or maximum-step exhaustion is an explicit convergence failure; it cannot be published as a valid settled shot. This is not a formal high-order embedded integrator or spatial convergence study.

The energy ledger includes internal energy in all active gas volumes (including the optional silencer), remaining releasable spring energy (signed beyond the undeformed contact datum), piston/BB kinetic energy, stored bumper elastic energy, bumper damping, rigid-contact/friction dissipation, external enthalpy, wall heat and ambient boundary work. Gas mass includes every active chamber and all external flows. Energy residual is relative to the same ambient reference. Conservation checks verify the discretization of the selected model, not the validity of its component laws.

Tests cover geometry derivatives, local tapered clearance at every reached segment, annular bumper/contact geometry, nonlinear bumper force/energy, reversible/choked flow, the laminar thin-gap limit, equilibrium/no drive, false-settlement prevention, explicit solver exhaustion, missing events, rebound, front-gas and silencer conservation, BB deceleration, heat/leak accounting, a contact-before-exit case and timestep refinement. Silencer tests check free-volume arithmetic, clearance validation, mass/energy residuals, pressure storage and expected outlet-area trends; these are model sanity checks, not experimental acoustic validation. Default refinements must change exit speed by less than 0.1% and exit time by less than 0.02 ms. Contact-case energy residual must remain below 0.1% of available spring energy; it is not assumed monotonic. The interface offers additional 5 μs / 2.5 μs checks of the user's current configuration.

### Pressure-wave timing envelope

Every stored frame also carries a causal comparison pressure sampled from the behind-BB history one estimated acoustic travel time earlier. The travel distance uses the equivalent breech length plus BB position, capped by barrel length; local sound speed uses the modeled behind-BB temperature. The result reports maximum one-way transit, maximum difference from the lumped trace, and the ratio of transit time to the relevant event gap. A 24-cell transit value is shown only as a **reference spatial scale** for a future mesh study. No 24 conservation cells are solved. This diagnostic can flag when lumped timing is questionable, but it cannot correct wave reflections, gas momentum or local nozzle/barrel pressure. A coupled 1D comparison and instrumented validation remain required before claiming sub-millisecond timing accuracy.

Sensitivity runs vary head and shaft diameters ±0.02 mm and spring force ±5% in eight combinations. They explicitly count invalid/no-exit/missing-event cases. These are illustrative ranges, not measured tolerances, confidence intervals or a complete uncertainty budget. Correlated input distributions and model discrepancy are not inferred.

## Calibration and provenance

Schema v3 preserves old v2 rows as reference-only with the original setup archived separately. Old drive/efficiency fits are never reused. The supplied measurement has no invented configuration. Energy is calculated from the measured mass/speed using exact `1 fps = 0.3048 m/s`.

Complete v3.0–v4.0 snapshots receive only fields that did not exist in their solver version, including v4 front residual volume/measured-bumper curve and v4.1 inactive silencer defaults. v3.2 snapshots still inherit `bumperBore=headBore`, exactly matching that version's implicit geometry. They retain confirmation, role and original solver version, with the original snapshot archived. Old versions remain fit-ineligible, so new front-gas/contact/silencer/discharge assumptions never silently reuse an old fit. Incomplete snapshots are not filled with invented hardware. Hypothetical nonzero cuts remain ineligible even if a user checks measured provenance. Calibration grouping canonicalizes the actual spring force law and removes only the parameters currently being fitted from setup identity.

Rows require an explicit boolean confirmation, complete valid parameter snapshot, current solver version and declared measured geometry/masses/spring before training/validation eligibility. Confirmation is a user assertion, not automatic verification. Notes carry BB batch/hop/chrono/environment details. The importer validates finite values and escapes text on display; legacy schemas never silently become calibrated records.

A bounded fit accepts one to three selected loss/contact parameters, now including silencer outlet Cd. It minimizes squared residuals normalized by entered uncertainty for chrono speed and any optional piston-contact time, peak cylinder pressure, peak silencer pressure or peak bumper force. Repeated identical physical setups share predictions, but each measurement contributes separately; the number of genuinely distinct training setups must be at least the number of fitted parameters. Measured spring and bumper force laws cannot be silently replaced by fitting their linear stiffnesses. Fit results show training/held-out RMSE, observation counts, failures, parameter-bound warnings and a coarse weak-constraint/identifiability screen. Held-out shots never determine parameters. This is coordinate/profile screening, not a covariance analysis or formal confidence interval. Dataset mutations invalidate the displayed fit; applying it requires an explicit action.

## Hardware optimizer

The optimizer is a bounded discrete search over explicitly unlocked hardware groups. Cylinder locks cover bore, nominal stroke and cylinder residual volume; barrel locks cover length, diameter and front terminal volume; head locks cover the metal passages, bumper thickness/inner diameter/stiffness/damping/compression cap and downstream storage. Other groups cover piston mass, airbrake geometry, measured/linear spring inputs, BB mass/diameter and installed silencer geometry. A silencer must first be enabled; search never silently installs one. Silencer Cd and heat transfer remain fixed unknowns while physical length, chamber diameter, baffle count/thickness/bore, end-cap bore and fill fraction may be searched. All unlisted quantities, including weather, empirical flow/leakage, heat transfer, rigid restitution and timing thresholds, remain fixed. Measured spring or bumper curves cannot be scaled or replaced by the optimizer; their corresponding linear stiffness inputs stay fixed. Direct preload or front-seat separation may vary within the applicable spring mode and measured compression coverage.

Length mode permits explicitly supplied free/seat/cut lengths and coil counts when no force curve is present. The mode itself cannot be optimized, and inactive inputs cannot be searched. Remaining solid height stays fixed so a search cannot disable a known coil-bind constraint. Invalid or slack combinations are rejected by the same solver validation. Candidate lists are hypothetical independent dimensions, not a catalogue of matched cuts/coils/masses: actual compatibility and remaining mass/solid-height measurements must be checked for each modification.

Every evaluation uses a common 250 ms observation limit, independently of the ordinary display limit. This does not change the physical input snapshot. The reference's exit energy sets fixed inclusive 95–105% bounds. Eligible candidates need valid integration, exit, contact, completed discharge, finite metrics and an absolute energy residual no greater than 0.1% of initial available spring work. Missing impact is unknown, not zero. Efficiency is exit BB energy divided by initial available spring work, not by spring energy released at an arbitrary stopping time.

Five minimization objectives are total modeled dissipation across the complete contact sequence, peak mass flow at the actual atmospheric outlet (muzzle without a silencer, end cap with one), inner-barrel exit gauge pressure, negative efficiency and pressure-wave timing uncertainty. First retain the Pareto frontier of tested feasible candidates; then normalize each objective to its range on that frontier and rank weighted costs. Weights (contact/flow/pressure/inefficiency/uncertainty) are balanced 30/17/13/25/15%, sound-biased 38/20/17/10/15%, efficiency-biased 12/8/5/60/15%. A zero-range objective adds no cost. These are explicit preferences, **not a physical acoustic formula**; rankings can change with the tested candidate set. The UI flags candidates that worsen any listed objective relative to the reference.

Small search spaces are enumerated exhaustively. Larger spaces test the current setup, individual changes and a deterministic sample of combinations, up to the chosen budget. Unsearched combinations may be better. Cancellation discards partial results. Frozen values, prohibited variables, energy bounds, invalid/incomplete shots, measured spring curves, determinism, cancellation, immutable snapshots and stale-result rejection have automated tests.

Applying a recommendation runs the normal full-trace solver again, checks eligibility and only then updates unlocked hardware. The sole extra UI change is the explicitly disclosed 250 ms playback observation limit. Changed hardware is marked unmeasured; old fit presentation is cleared; raw chrono data is preserved. This is a hypothetical design comparison: geometric changes may alter real seal/friction/flow coefficients even though those uncertain coefficients stay fixed in the search. No mechanical compatibility, real energy limit compliance or actual sound optimum is inferred.

## Status against the research plan

- C01–C06, C09, C11 and C16: core corrections implemented, with the stated lumped/integration limitations.
- C07–C08: implemented geometry-driven approximate flow and measured/linear spring mechanics; distributed passage/spring dynamics remain unresolved.
- C10: release, drag, clearance-dependent bypass and a conservative vented front-gas control volume implemented; **resolved moving-sphere clearance flow is not implemented or validated**.
- C12–C14: physical/conventional events and interpretable energy/discharge indicators implemented; no causal force-isolation or acoustic validation claimed.
- C15: measurement provenance, one-to-three-parameter fitting, optional instrumented residuals, holdouts, exports and an identifiability screen implemented; an experimental dataset, formal parameter uncertainty and internal-timing validation remain outstanding.
- C17: a causal travel-time envelope and explicit timing-risk warning are implemented; **a coupled 1D compressible-flow solver comparison remains future work**.
- C18: temperature viscosity, pressure-dependent seal friction, explicit bumper geometry, optional measured quasi-static bumper force curve, lumped viscous damping, rigid bottom-out restitution and rear damping are included; frequency-dependent elastomer behavior, eccentricity, spring surge and structural acoustics need further component models and measurements.

The required next evidence is the user's actual head/pin/cylinder geometry, assembled masses, installed spring curve, repeated documented chrono shots and synchronized internal timing/pressure measurements. More numerical precision or a closer one-point chrono fit cannot substitute for that evidence.
