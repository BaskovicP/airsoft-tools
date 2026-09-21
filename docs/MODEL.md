# Implemented model v3 — scope and verification

This release replaces the v2 pressure/airbrake heuristics with a conservative **two-volume, quasi-steady-flow engineering approximation**. It does not claim experimental SSG10 accuracy or implement every higher-fidelity item in the research plan. All quantities below are SI internally.

## State, geometry and force

State: piston position/velocity; BB position/velocity; mass and internal energy of cylinder and downstream gas; cumulative boundary energy/mass, friction/contact losses, positive/negative BB net work. Ambient air is a reservoir. Air is ideal with R = 287.05 J/(kg K), gamma = 1.4 and constant heat capacities.

Let `x` increase toward the head, `S` be stroke, `Ac` cylinder area, `Ab` barrel area, `y` BB travel, `Lpin` projection and `z=max(0,Lpin−(S−x))` insertion. The pin has a linearly tapered tip then constant-diameter shaft; `Vpin(z)` is its integrated occupied volume:

```text
Vc = residualCylinder + Ac(S−x) − Vpin(Lpin) + Vpin(z)
Vb = downstreamStorage + Ab y − Vpin(z)
dVc/dx = −Ac + Apin(z)
dVb/dx = −Apin(z)
Fp,gas = pamb Ac + pc(dVc/dx) + pb(dVb/dx)
FBB,pressure = (pb − pamb) Ab
```

The matching derivatives couple mechanical work to compression work. There is no additional invented air-cushion force. Entry reduces passage conductance, pressures evolve, and pressure forces may decelerate/reverse the piston. `Vc+Vb` changes by `−Ac dx + Ab dy`: pin movement between regions does not create gas volume.

**BB approximation:** pressure force and volume displacement both use barrel area. The BB is treated as a leaky effective piston, not a resolved moving sphere. Actual BB diameter sets the clearance leakage area. Using BB projected force area but barrel displacement area without extra transport terms would break this model's work consistency. Ahead-of-BB gas is assumed atmospheric; this has not been validated for the relevant timing tolerance. Full spherical flow, front-gas compression and hop/backspin mechanics remain future work (plan C10/C17).

The entered downstream volume includes head/nozzle/breech storage only once, before pin subtraction. Passage lengths do not automatically add a second copy. Negative storage or interference geometry is rejected. A pin cannot extend beyond the modeled head/nozzle passages. Arbitrary bulb-shaped pins, elastomeric interference and multi-cavity heads need an extended geometry model.

## Thermodynamics and flow

```text
T = U / (m cv)
p = (gamma−1) U/V
dm/dt = incoming mass − outgoing mass
dU/dt = −p dV/dt + incoming enthalpy − outgoing enthalpy + Qdot
Qdot = heatConductance (Twall − Tgas)
```

An internal flow transfers equal mass and upstream `cp*T` enthalpy between the chambers. External leakage/discharge uses the upstream chamber or ambient enthalpy, including inflow when the pressure reverses. Jet kinetic energy is not stored separately in this lumped model. Post-exit pressure remains part of the same calculation; no exponential decay is imposed.

Short-restriction mass flow uses the ideal isentropic unchoked/choked branches (critical downstream/upstream ratio ≈0.528), with the upstream temperature and sign selected dynamically. Head and nozzle segments contribute to an approximate series resistance, including entrance loss and overlap-dependent wall friction. Viscosity follows Sutherland's air relation. Hydraulic diameter is bore minus shaft diameter for an annulus. Laminar Darcy factors use 64/Re for the bore and the narrow-annulus limit 96/Re; a smooth transition introduces a turbulent Blasius approximation.

The flow solves its friction-dependent resistance using an analytic laminar root or bracketed bisection. This avoids the incorrect finite-iteration flow floor in very small clearances. The regression suite checks the thin-gap low-pressure limit.

**Limits:** this is not a spatially resolved compressible annular duct. The narrow-annulus law is approximate away from narrow gaps, tapered sections use a representative restrictive diameter, and the combined resistance does not solve every intermediate pressure or local sonic transition. Moving-wall shear, eccentricity, roughness-specific losses and transient gas momentum are not resolved. Cd is an uncertain loss coefficient, not a claimed physical efficiency or noise-reduction percentage. Measured flow-versus-pressure/insertion data should replace these closures where available.

Piston/nozzle leakage inputs are *effective* areas including loss coefficients. BB bypass is clearance area times an uncertain coefficient; it is not a full spherical-gap calculation. After exit, muzzle outflow uses a fixed assumed 0.85 discharge coefficient. The displayed muzzle flow excludes nozzle-seal leakage. Muzzle crossing is a point-boundary approximation.

## Mechanics, short stroking and contact

A spring is either linear `F=k(preload+S−x)` or linearly interpolated measured force/compression pairs covering the complete installed range. Spring energy is the integral of that force; spring labels never multiply output. Preload is compression remaining at the front contact position, not an extra spacer of assumed zero baseline. Users must translate actual spring free/installed lengths and spacer geometry into these inputs.

Effective moving mass is piston assembly mass plus optional spring mass/3. That is a uniform spring-deformation approximation, not spring-surge mechanics. Displayed piston momentum and first-contact kinetic energy use the actual piston assembly mass; contact dissipation in the integration uses effective moving mass.

Piston friction is signed Coulomb resistance plus optional pressure-dependent seal resistance and linear rear/mechanical damping. At rest, static resistance can hold motion. BB release and moving resistance are separate. The solver allows underpressure, negative acceleration and piston rebound. Small zero-crossing/end-stop projections are tracked as numerical/contact energy losses; finite-step event projection produces a small remaining balance residual, which is displayed rather than hidden.

Front contact uses a dissipative restitution coefficient. Repeated contacts remain possible; the displayed impact is the **first** one. This is not a resolved rubber spring/damper or prediction of peak contact force/duration. Changing a real bumper's thickness changes the contact plane and thus the entered stroke, remaining gas volume and spring compression. Restitution alone cannot describe these geometric changes.

The short-stroke control changes the cocked position, keeping bore, front stop, pin projection and spring compression at the front stop fixed. Thus it reduces swept volume and released spring energy, not spring stiffness. Other constructions must be represented by separately measured input changes.

## Events and indicators

Event times are nullable. A valid integration can be incomplete: BB still in barrel, no contact, or residual compressed gas remaining when maximum time is reached. There is no fabricated exit or zero-impact classification. Numerical failure invalidates all displayed results.

The events are geometric pin entry, first piston deceleration, first substantial deceleration after entry (default acceleration below −1,000 m/s² while moving forward), first rebound, first head contact and BB exit. The threshold is an explicit convention. It is **not** a causal decomposition of airbrake versus ordinary compression forces.

After an actual exit, the solver finds the first crossing of a chosen fraction (default 95%) of the maximum pre-exit BB kinetic energy. It also reports any later loss before exit, and accumulated positive/negative **net** work. An incomplete run can show its observed maximum but cannot determine this terminal timing objective. Ratios are not capped at 100%.

The no-pin baseline keeps the same assembly mass and other inputs, removing pin projection and its occupied volume. It is a specified hypothetical comparison, not a claim that removing a real pin leaves mass unchanged or isolates one force at equal time.

Sound-related outputs are first-contact piston speed/energy and muzzle pressure, gas inventory, peak flow and mass discharged during the modeled interval. None is dB, acoustic intensity, suppressor performance or a universal hard/soft classification. Structural modes, microphone placement, rubber properties and spring noise require measurements.

## Numerics and verification

The pure solver is independent of animation and shared verbatim by standalone/hosted versions. An adaptive explicit midpoint method limits the step to 10 μs by default, estimates local change from Euler/midpoint differences, reduces steps near geometry/events, rejects nonpositive mass/energy/volume states, and records samples independently. This is not a formal high-order embedded integrator or spatial convergence study.

The energy ledger includes gas internal energy, remaining releasable spring energy, piston/BB kinetic energy, friction/contact dissipation, external enthalpy, wall heat and ambient boundary work. Gas mass includes all external flows. Energy residual is relative to the same ambient reference. Conservation checks verify the discretization of the selected model, not the validity of its component laws.

Tests cover geometry derivatives, annular clearance fixtures, reversible/choked flow, the laminar thin-gap limit, equilibrium/no drive, invalid assemblies, missing events, rebound, BB deceleration, heat/leak accounting, a contact-before-exit case and timestep refinement. Default refinements must change exit speed by less than 0.1% and exit time by less than 0.02 ms. Contact-case energy residual must remain below 0.1% of available spring energy; it is not assumed monotonic. The interface offers additional 5 μs / 2.5 μs checks of the user's current configuration.

Sensitivity runs vary head and shaft diameters ±0.02 mm and spring force ±5% in eight combinations. They explicitly count invalid/no-exit/missing-event cases. These are illustrative ranges, not measured tolerances, confidence intervals or a complete uncertainty budget. Correlated input distributions and model discrepancy are not inferred.

## Calibration and provenance

Schema v3 preserves old v2 rows as reference-only with the original setup archived separately. Old drive/efficiency fits are never reused. The supplied measurement has no invented configuration. Energy is calculated from the measured mass/speed using exact `1 fps = 0.3048 m/s`.

Rows require an explicit boolean confirmation, complete valid parameter snapshot, current solver version and declared measured geometry/masses/spring before training/validation eligibility. Confirmation is a user assertion, not automatic verification. Notes carry BB batch/hop/chrono/environment details. The importer validates finite values and escapes text on display; legacy schemas never silently become calibrated records.

A bounded one-parameter Cd fit minimizes mean squared residual normalized by each entered chrono uncertainty. Repeated identical physical setups share predictions, but each measurement contributes separately. Solver time/threshold settings and Cd itself do not manufacture distinct physical conditions. Fit results show training/held-out RMSE, failures, bounds and a coarse weak-constraint/profile diagnostic. Held-out shots never determine Cd. No formal confidence interval, multi-parameter identifiability or timing calibration is claimed. Dataset mutations invalidate the displayed fit; applying it requires an explicit action.

## Hardware optimizer

The optimizer is a bounded discrete search over explicitly unlocked hardware groups. Cylinder locks cover bore, stroke and cylinder residual volume; barrel locks cover length and diameter; head locks cover both passage sections and downstream storage. Other groups cover piston mass, airbrake geometry, measured/linear spring inputs and BB mass/diameter. All unlisted quantities, including weather, empirical losses, heat transfer, restitution and timing thresholds, remain fixed. A measured spring curve cannot be scaled or replaced by the optimizer; stiffness and spring mass remain fixed with that curve, and only preload can vary within its measured coverage.

Every evaluation uses a common 250 ms observation limit, independently of the ordinary display limit. This does not change the physical input snapshot. The reference's exit energy sets fixed inclusive 95–105% bounds. Eligible candidates need valid integration, exit, contact, completed discharge, finite metrics and an absolute energy residual no greater than 0.1% of initial available spring work. Missing impact is unknown, not zero. Efficiency is exit BB energy divided by initial available spring work, not by spring energy released at an arbitrary stopping time.

Four minimization objectives are first-contact piston energy, peak muzzle mass flow, exit gauge pressure and negative efficiency. First retain the Pareto frontier of tested feasible candidates; then normalize each objective to its range on that frontier and rank weighted costs. Weights (impact/flow/pressure/inefficiency) are balanced 35/20/15/30%, sound-biased 45/25/20/10%, efficiency-biased 15/10/5/70%. A zero-range objective adds no cost. These are explicit preferences, **not a physical acoustic formula**; rankings can change with the tested candidate set. The UI flags candidates that worsen any listed objective relative to the reference.

Small search spaces are enumerated exhaustively. Larger spaces test the current setup, individual changes and a deterministic sample of combinations, up to the chosen budget. Unsearched combinations may be better. Cancellation discards partial results. Frozen values, prohibited variables, energy bounds, invalid/incomplete shots, measured spring curves, determinism, cancellation, immutable snapshots and stale-result rejection have automated tests.

Applying a recommendation runs the normal full-trace solver again, checks eligibility and only then updates unlocked hardware. The sole extra UI change is the explicitly disclosed 250 ms playback observation limit. Changed hardware is marked unmeasured; old fit presentation is cleared; raw chrono data is preserved. This is a hypothetical design comparison: geometric changes may alter real seal/friction/flow coefficients even though those uncertain coefficients stay fixed in the search. No mechanical compatibility, real energy limit compliance or actual sound optimum is inferred.

## Status against the research plan

- C01–C06, C09, C11 and C16: core corrections implemented, with the stated lumped/integration limitations.
- C07–C08: implemented geometry-driven approximate flow and measured/linear spring mechanics; distributed passage/spring dynamics remain unresolved.
- C10: release, drag and clearance-dependent bypass implemented; **resolved spherical/ahead-gas model not implemented or validated**.
- C12–C14: physical/conventional events and interpretable energy/discharge indicators implemented; no causal force-isolation or acoustic validation claimed.
- C15: measurement provenance, one-parameter fitting, holdouts, exports and sensitivity checks implemented; experimental dataset, formal parameter uncertainty and internal-timing validation remain outstanding.
- C17: sound-crossing scale and explicit timing warning shown; **1D compressible-flow solver comparison remains future work**.
- C18: temperature viscosity, pressure-dependent seal friction and simple bumper/rear damping options included; detailed deformation, eccentricity, spring surge and structural acoustics need further component models and measurements.

The required next evidence is the user's actual head/pin/cylinder geometry, assembled masses, installed spring curve, repeated documented chrono shots and synchronized internal timing/pressure measurements. More numerical precision or a closer one-point chrono fit cannot substitute for that evidence.
