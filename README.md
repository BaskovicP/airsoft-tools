# Airsoft Tools

Standalone English/Croatian airsoft tools that run entirely in the browser. Open `index.html` directly—no server, account, network access or runtime dependencies are required. The first screen is a tool menu.

## Accuracy Troubleshooter

Choose vertical spread, left/right curve, random flyers, weak range or an occasional bad shot, then follow an adaptive decision tree. Every answer updates a relative shortlist of likely causes and builds a non-invasive-first test order covering BB quality and weight, barrel cleaning, hop adjustment, magazine interaction, bucking and nub condition, nozzle timing and internal air seal. Results are diagnostic hypotheses rather than failure probabilities; the tool asks users to confirm each step with repeatable 10-shot groups before replacing parts.

## HPA Air-Efficiency Calculator

Estimate usable shots per tank from tank internal volume, fill pressure, regulator output and headroom, delivery efficiency, barrel/working volume, reference and target dwell, and measured standard-air consumption per shot. The calculator reports a measurement-uncertainty range, usable standard litres, pressure reserve, shots per 1,000 psi, barrel-charge utilization, dwell sensitivity and common-tank comparisons. Measured consumption remains the primary input; the ideal-gas tank model and barrel-charge floor are planning estimates, not permission to exceed equipment pressure ratings.

## BB Weight Advisor

Compare common 0.20–0.50 g BB weights at the same entered muzzle energy. The advisor estimates flight time and retained energy at a chosen distance, crosswind drift, hop-limited expected range and cost per magazine. A visible recommendation index supports balanced, range-and-wind, or speed-and-budget priorities, while weights above the entered reliable hop limit remain visible but cannot become the recommendation. The point-mass drag and hop-lift estimates are comparative—not promised field performance—and the cost calculation uses the package price and mass entered by the user.

## Chrono String Analyzer

Paste one or two chronograph strings in fps or m/s to calculate per-shot energy, mean velocity and energy, extreme spread, sample standard deviation, coefficient of variation and shot-order trend. Potential outliers are conservatively flagged with Tukey's 1.5×IQR rule and remain visible even when excluded from headline statistics. Head-to-head mode reports winners for consistency, spread, drift, speed and energy, plus a transparent relative index with balanced, consistency-first and higher-output priorities. Comparing different BB masses also reports the change in mean energy as a possible joule-creep indicator, with JSON and CSV export. Data remains local to the browser.

## Physics model v4.1

The lab now solves connected cylinder, behind-BB and ahead-BB gas volumes with mass/energy accounting, compressible reversible flow, profile-sliced head/airbrake restriction, spring force, signed piston/BB motion, finite bumper contact, leakage and post-exit discharge. It exposes integration/conservation diagnostics, step-refinement checks, a causal pressure-wave timing envelope and explicit input-sensitivity scenarios.

**This is still an unvalidated lumped model, not an exact SSG10 predictor.** Numerical convergence does not establish real-world accuracy. The wave envelope is a diagnostic, not a coupled 1D solution; resolved spherical BB clearance flow, detailed cup/bumper deformation and structural acoustics are not implemented. See [model equations, limitations and validation](docs/MODEL.md) and the [original physics accuracy plan](docs/PHYSICS_ACCURACY_PLAN.md).

### Geometry and mechanics

- Fixed cylinder bore; nominal stroke changes swept volume without resizing the cylinder.
- Optional annular cylinder-head bumper thickness and independent inner diameter. Enter linear stiffness or a measured nonlinear force–deflection curve; damping and usable compression produce a finite contact episode with live compression/force. Rigid restitution applies only to a bare stop or pad bottom-out. These are conditional bench-test parameters, not hardness, sound or dB.
- Head receiving-bore and downstream nozzle diameters/lengths.
- Airbrake projection, shaft diameter, tip diameter and taper; dynamic overlap, clearance and pin displacement.
- Cylinder residual, downstream storage and front/muzzle terminal volumes (each cavity counted once).
- Any piston mass from 5–300 g; quick buttons for 58, 65, 68, 72, 76 and 82 g.
- Spring stiffness/preload or a user-entered force/compression curve. M110–M220 are identity labels only, not hidden power multipliers.
- Optional spring free/installed lengths and a cut-spring estimate; derived preload, active-coil rate adjustment and known-solid-height checks.
- Seal and nozzle leakage, BB clearance leakage into the front gas, hop release/moving resistance, seal friction, optional spring effective mass, heat exchange, air temperature and pressure. Head Cd and muzzle Cd are separate unknowns; muzzle Cd controls front-gas venting before exit and compressed-gas discharge afterward, so it can affect exit speed.
- Optional silencer as a fourth conservative gas volume. Enter installed state, usable internal expansion length, chamber ID, baffle count and representative thickness, smallest baffle/core bore, end-cap bore and solid fill fraction. The app calculates free gas volume, transient chamber pressure, barrel-to-silencer transfer and final outlet flow; outlet Cd and heat conductance stay explicitly unknown/calibratable. The lumped baffle/fill loss is a disclosed heuristic—not CFD, acoustic absorption or dB attenuation.

AMP / Tridos Ultimate is the user's identified assembly; Scorpion remains a separate identity option. AMP pin selections do not invent dimensions. The Tridos listing says nominal 71 g, while AMP lists 69 g without a brake / 72 g with its longest pin. Weigh the actual assembly. The **default is a clearly labeled no-airbrake reference** (zero pin projection), not a verified model of the installed rifle. Enter measured pin geometry to enable an airbrake. The 4 mm passage and inactive 3.8 mm pin-diameter starting values are **not verified AMP specifications**.

Platform starting points include SSG10, a forward-cocked-position −20 mm short-stroke comparison, TAC-41P/Lite Sport, SRS A2 16/22-inch, VSR-10 Pro/G-Spec and APS2/L96. Internal dimensions remain editable assumptions unless measured. Short stroking with a front stop or changed spring/piston geometry requires entering the corresponding actual measurements.

### Spring length and cutting

Open **Spring length, cutting & mechanical losses** and enable **Calculate from spring lengths / simulate cutting**. Enter unloaded length, the distance between the spring seats at the rigid-head plane before an added bumper, and the axial free-length reduction from cutting. If the seat distance is measured at an installed bumper, add that bumper thickness back once; the model then moves the contact plane rearward. Length mode replaces direct preload; it does not add a second preload. No real spring lengths are supplied as defaults.

For a hypothetical cut, also enter original and removed **active** coils. The model reduces free length while estimating the higher rate of the shorter active section; it does not assume that output energy scales with spring length. The panel shows resulting length, front/cocked compression and force, stiffness and available spring work. Live force/compression appear beneath the animation, and the new force law feeds the existing pressure, velocity, impact and discharge calculations.

The estimate assumes uniform linear active coils with unchanged wire, diameter and end support. Count changes are independent inputs, not inferred from free length. Progressive coils or modified ends need a new measured force curve. Enter the remaining spring mass separately. Optional remaining solid height allows rejecting coil-bound geometry; zero means **coil bind not checked**. Slack/unseating is not simulated. None of these checks certifies a real modification as safe or compatible.

A pre-cut measured curve cannot be reused for a hypothetical cut. For an already cut and measured spring, use its **current** free length, mass and curve with cut/removal set to zero. Hypothetical cut estimates are not eligible for chrono fitting. Spring length/cut choices join the optimizer when length mode is enabled and the spring is unlocked; solid height remains a fixed constraint, not an optimization variable. The optimizer still preserves 95–105% of starting predicted energy.

### Tuning workspace

On laptop/desktop-sized viewports, settings and results have independent scroll areas. Choose **Cylinder & barrel**, **Silencer**, **Piston & BB**, **Airbrake, bumper & head**, **Spring**, **Losses & environment**, **Rifle presets**, or **Timing & solver** from the settings selector; changing categories keeps the preview in place and remembers each category's scroll position. Inputs are moved once, never duplicated or reset.

Use **Shot**, **Parts**, **Graphs**, **Results**, **Optimize**, and **Chrono** to switch views directly. The compact Shot view shows the cutaway plus predicted exit energy, volume ratio, piston-contact energy, muzzle pressure/flow and useful-energy timing. Full telemetry and playback/model notes expand on demand. Playback and scrubbing remain available in Shot, Parts, Graphs and Results. Applying an optimizer choice opens Shot, selects the relevant settings category and replays it.

### Parts and measurement atlas

**Parts / Dijelovi** is a setup-driven measurement atlas, separate from the firing animation. Its contact-state cutaway shows the piston, airbrake profile, independent bumper opening, metal head receiving bore, downstream nozzle and barrel. Axial head-stack lengths share a drawing scale so the atlas explicitly reports whether the pin tip ends inside the bumper, receiving bore or nozzle. Radial bores and tiny clearances are enlarged for legibility and are labeled as such; the numeric inputs, not the drawing, are the measurement record.

Additional diagrams identify cylinder bore, nominal stroke versus bumper-reduced contact travel, piston mass, barrel/BB diameters and clearance, spring seats, free length, cut length and compression reference planes. A dedicated sectioned silencer diagram labels internal expansion length/diameter, repeated baffle bore/count/thickness, end-cap bore, fill fraction, gross/solid/free volume and conditional equivalent outlet area. Every dimension card shows the live setup value, a suggested instrument or evidence route and the exact endpoints to measure in English and Croatian. Spring values that have not been entered remain visibly unknown rather than being inferred.

The atlas also lists non-caliper inputs—friction, restitution, leak areas, flow coefficient, hop release force, heat transfer, environment and analysis thresholds—separately as bench-test, calibration, environmental or convention values. It does not imply that these are direct part dimensions. Safety text requires an unloaded, fully decocked and disassembled setup, and cavity-volume guidance does not recommend introducing liquid into an assembled replica.

Results also contains **What changed & what to try next**. Every valid edit is compared with the immediately preceding valid setup: changed inputs are named and exit energy/velocity, piston-contact energy, muzzle flow, exit pressure and useful-energy-to-slowing margin show signed deltas. A single changed input is an A/B model comparison; simultaneous edits are explicitly labeled as a combined result that cannot be attributed to one setting. Invalid intermediate edits do not erase the last valid reference.

The action list turns timing, contact-energy, muzzle-flow and measurement-provenance states into prioritized tuning hypotheses with shortcuts to the relevant settings, optimizer or chrono panel. “Broadly similar” uses an explicit 85–110% band against the no-airbrake reference. These messages do not claim causality outside the selected model, actual sound reduction or an experimentally optimal setup; change one item at a time and verify with measurements.

The Shot view also includes a visual tuning-target bar: green = the selected share of peak BB energy, cyan = BB exit, amber = substantial slowing after pin entry. Its explicitly labeled linear event window may be shorter than the full shot; it is a static event comparison, not a playback-progress bar. Event buttons seek actual model time. Missing events have no marker, and the no-airbrake reference never invents a braking event. Coincident markers keep their true positions with separate dot lanes.

**Piston impact & muzzle blast — what do these mean?** opens the explanatory cards at the top of Results. They distinguish the mechanical strike from escaping-air discharge, with actual modeled mJ and g/s rather than an arbitrary loudness index. Impact is compared with the same model at zero airbrake projection. With a silencer installed, actual end-cap outlet flow is instead compared with the identical setup without the silencer; the card also reports inner-barrel exit pressure, free expansion volume, peak silencer pressure, barrel-transfer/outlet peaks and pulse duration. The drawn scale ends at 200%, with any larger numerical ratio shown uncapped and the cap disclosed. Missing events, invalid baselines and zero baselines stay unavailable; none is labeled quiet. These ratios are not sound reduction, dB, peak force, durability or certified suppressor performance. Unfinished discharge remains explicitly unresolved.

Graphs and Results both include a **Piston contact sequence**. Each continuous contact episode is plotted and listed with start time, incoming speed and piston kinetic energy; compliant-pad entries also show modeled peak compression, peak force and duration. Recontact is counted only after separation. Pressure-driven reversal before the head is excluded. These conditional mechanics are not proof of audible knocks, acoustic energy, durability, loudness or dB.

Short/narrow screens use normal page flow rather than a fixed-height workspace. Mobile **Settings / Preview** shortcuts jump and focus the relevant controls. Model warnings remain visible; hiding long explanations does not hide invalid inputs or missing-event notices. Open shot disclosures and selected categories/views survive parameter edits; chrono drafts remain intact.

### Animation and outputs

The animation and graphs have dedicated views next to the settings. Graphs repeats the same live firing cutaway directly above the pressure, piston-velocity, BB-velocity and piston-contact traces, synchronized to the shared playback time and graph cursor; it does not run a second simulation. They use solver states, independent cylinder/BB pressure colors and signed arrows. Cylinder stroke, bumper, pin and the bumper/head/nozzle passages share one axial drawing scale, so visible pad contact and pin entry match the calculated geometry; the barrel has its own scale. The green annular pad uses the entered inner diameter and visibly shortens/bulges from solver compression; its exact 3D shape remains illustrative. Exact pre/post rigid-impact samples prevent interpolation from showing a reverse velocity before impact.

Parameter edits update the existing panels, canvases and readouts in place. Playback pauses at the same model time (clamped to a shorter run if necessary), with a small updating indicator; it does not reset to the beginning. Presets, the no-pin option and optimizer application preserve open sections and unfinished chrono notes. Invalid inputs hide stale results without collapsing their layout. Stale optimizer tables stay visibly marked and cannot be applied or exported until another search.

The cutaway adds layered metal and spring shading, pressure glow, signed airflow marks, a directional BB trail and a flow-dependent outlet plume. When installed, the silencer is drawn at the entered relative length with its chamber, representative repeated baffles, fill cue, pressure glow and final end-cap outlet; the inner-barrel crown remains a separate location. These visual cues are schematic—not simulated molecules, resolved pressure waves or sound. The solved BB trajectory ends at the inner-barrel crown, so its later drawn travel through the silencer coasts at exit speed rather than inventing baffle-space acceleration. Their state follows model time, so scrubbing and pausing freeze every cue. Graph traces are cached; only the time cursor is redrawn during playback.

**Firing focus + faster settling** reserves most playback time for the shot and initial discharge, then shows the entire later interval faster. Uniform full-run slow motion and playback-speed controls are also available. Nothing is cut from the trajectory: the clock, scrubber, graphs, event buttons and exported data keep physical model time.

Pressure-driven reversal **before** head contact is distinguished from reverse motion **after** contact. Maximum modeled backward travel is reported in millimeters. A pre-contact retreat above 1 mm gets an explicit input/model-validation warning; that display threshold is a convention, not a physical limit. The previous tight 20 mm pin example still produces substantial pre-contact retreat with the v4.0 profile-sliced flow assumptions and is retained as a test fixture, not a normal SSG10 default. No velocity clipping or hidden damping suppresses such predictions.

Clickable events show entry, initial deceleration, a user-defined substantial-deceleration threshold after entry, the selected share of maximum pre-exit BB energy (95% by default), BB exit, rebound and contact. A deceleration after entry is not automatically caused entirely by the airbrake. The no-pin comparison keeps piston mass fixed but changes occupied gas volume.

Missing exits and contacts remain unavailable. A timeout does not become muzzle velocity or a soft impact. The useful-energy timing goal is unavailable until an exit occurs.

Contact speed/kinetic energy, conditional bumper force/compression, and muzzle pressure/gas inventory/discharge replace arbitrary 0–100 sound indices. They are conditional model quantities—not perceived loudness, exact real-world Joules or dB.

The Results and Graphs views also include a transparent **sound-source estimate**. It keeps piston-contact energy separate from an ideal isentropic expansion-energy/power term at the actual atmospheric outlet (the muzzle, or the silencer end cap when installed). Those are physically calculated source pools and relative energy-ratio changes—not acoustic energy at the listener and not a microphone waveform. Receiver/stock radiation, spring vibration, directionality, room reflections, microphone response, hearing weighting and frequency spectrum remain unknown.

Calibration can optionally store a same-meter peak sound reading and microphone distance with each confirmed measured setup. Readings are normalized to one metre with a disclosed free-field distance assumption. One or two records provide only a combined empirical scale; at least three sufficiently varied records are required before the fit can try to separate mechanical-contact and airflow contributions. The resulting dB value is therefore a setup-specific empirical estimate, never a certified SPL prediction. The UI flags extrapolation outside the measured source ranges.

### Calibration and data

- The supplied 0.46 g / 330 fps observation starts as reference-only with an unknown setup; its ≈2.327 J is derived, not an independent measurement.
- Record individual shots with setup snapshots, notes, chrono uncertainty and training/held-out/reference roles.
- Explicitly confirm the shot's setup and independently measured geometry/masses and spring data before fitting.
- Fit one to three selected bounded loss/contact parameters. Repeats improve repeatability information, not the number of identifiable parameters; the app requires at least as many distinct training setups as fitted parameters.
- Optionally record piston-contact time, peak cylinder pressure, peak silencer pressure and peak bumper force to constrain internal behavior beyond chrono speed. Silencer outlet Cd can be selected as a fit parameter, but chrono speed alone cannot identify acoustic behavior.
- Optionally record peak sound level, meter uncertainty and microphone distance. Use the same meter, placement, weighting, peak/hold mode and environment for comparable readings; the saved record keeps the solver-derived contact/gas source snapshot used by the sound fit.
- Report training and held-out errors, observation counts, parameter-bound/weak-constraint warnings, and export the fit profile/residuals.
- Preserve old v2 records as unverified references and discard old fitted coefficients.
- Preserve complete v3.0–v4.0 setup snapshots when adding only historically missing/contact-flow/silencer defaults, including a v3.2 pad's former implicit head-bore-sized opening. Old versions remain excluded from new fits and their original snapshots stay in exports.
- JSON import/export; full setup and shot-trace export; local storage only.
- Limits: 2,000 records and 32 distinct configurations per fit. Export a backup before deleting measurements.

### Freeze parts and optimize

Choose **Optimize** to open **Freeze parts & optimize**. Checked groups stay fixed: cylinder, barrel, silencer, head/nozzle, piston, airbrake, spring and BB. Enter discrete values for unlocked hardware, using comma-separated numbers and decimal dots. The current value is always included. Silencer geometry is searchable only after that silencer is installed; the optimizer cannot silently add one, change its unknown flow/thermal coefficients or claim acoustic compatibility. Example masses and pin lengths are hypothetical alternatives, not a catalog of compatible AMP parts.

The optimizer preserves **95–105% of the starting setup's predicted BB exit energy**. An unlocked head group can include alternative bumper stiffness, damping and compression limits; weather, fitted flow/leakage, other friction/damping and timing criteria remain fixed. All candidates are observed with the same 250 ms time limit; missing contact or incomplete discharge never counts as zero noise.

The shortlist balances total modeled dissipation across all piston contacts, peak flow at the actual atmospheric outlet (muzzle or silencer end cap), inner-barrel exit pressure, spring-to-BB energy efficiency and pressure-wave timing uncertainty. It retains non-dominated tradeoffs, then uses disclosed ranking weights for balanced, sound-biased or efficiency-biased preferences. It is a **best-found model comparison**, not a claim of lowest real-world dB. Search coverage, exclusions and any worsening relative to the reference are shown.

Searches are deterministic and capped at 60/120/240 combinations, can be cancelled, and do not change the live setup. **Apply & replay** rechecks a candidate, preserves frozen hardware and environmental/loss inputs, marks changed hardware as unmeasured and extends the display's observation limit to 250 ms. Actual chrono records are untouched. Setup or search changes invalidate old results. Search snapshots, locks, metrics and ranking weights can be exported.

## Source and tests

`index.html` is generated but checked in so it opens standalone. Edit these sources, not its generated inline bundle:

- `src/page.html`: shared page shell/styles;
- `src/physics.js`: pure solver, also loadable by Node;
- `src/calibration.js`: record validation, migration and bounded multi-parameter fitting;
- `src/acoustics.js`: physical contact/outlet source terms plus optional empirical same-meter sound calibration;
- `src/optimizer.js`: hardware-only search, locks, eligibility and tradeoff ranking;
- `src/playback.js`: physical-time sampling, phase-paced playback and consistent drawing geometry;
- `src/view.js`: keyed incremental DOM updates that preserve live canvases and readouts;
- `src/workspace.js`: grouped settings, view navigation, compact result organization and scroll preservation;
- `src/insights.js`: event-timing presentation and explicitly relative sound-contributor quantities/explanations;
- `src/parts.js`: bilingual dynamic cutaways, measurement references and non-caliper input inventory;
- `src/animation.js`: solver-driven cutaway rendering and schematic visual cues;
- `src/bb-advisor.js`: pure BB flight, wind, range, cost and recommendation comparison;
- `src/hpa-efficiency.js`: pure tank reserve, standard-air consumption and dwell comparison;
- `src/accuracy-troubleshooter.js`: pure symptom decision trees, cause scoring and check ordering;
- `src/app.js`: bilingual controls, playback, graphs and data UI.

Run:

```sh
npm run build
npm test
npm run package:cloudflare
```

There are no npm dependencies to install. Tests cover geometry/work invariants, flow/choking/laminar limits, invalid setups, missing events, rebound and BB deceleration, leakage/heat accounting, silencer free volume/pressure/outlet trends and conservation, timestep refinement, synthetic calibration, migration, the Parts field inventory and endpoint classification, persistent nodes/disclosures, workspace navigation/scroll/focus, and standalone/build parity. Tests are numerical/source/DOM-contract checks, not experimental acoustic validation.

For a local HTTP preview, optionally run `python3 -m http.server 8000`, then open `http://127.0.0.1:8000`.

## Cloudflare deployment

The established deployment stays unchanged:

- `dist/`: static HTML/CSS/JS plus security headers;
- `wrangler.jsonc`: Cloudflare Workers Static Assets;
- `airsoft-tools-cloudflare.zip`: direct-upload archive;
- `.openai/hosting.json`: identifies `dist` as static output.

The build generates the standalone root HTML and separates the exact same inline code into `dist/app.js` and styles into `dist/styles.css`. The hosted build uses a restrictive script policy and no external requests.

### Workers Git integration

- Repository: `BaskovicP/airsoft-tools`
- Production branch: `master`
- Build: `npm run build`
- Deploy: `npx wrangler deploy`
- Non-production deploy: `npx wrangler versions upload`
- Root: `/`

### Pages Git integration

Use production branch `master`, framework `None`, build command `npm run build`, output `dist`.

### Direct upload

Run `npm run package:cloudflare` and upload `airsoft-tools-cloudflare.zip`. The archive contains only deployment assets at its root. Pushing GitHub does not by itself prove that a connected Cloudflare deployment succeeded.

## Sources

Product identity: [Tridos AMP kit](https://tridos.design/products/ultimate-ssg10-vsr10-piston-cylinder-head-kit), [AMP manufacturer](https://amp-machine.com/shop/p/am-ultimate-vsr-piston-cylinder-head-71g-stainless-steel-one-piece-piston-with-airbrake-and-high-flow-cylinder-head-with-rubber-damper).

Physics methods: [Do Duc et al., internal ballistics](https://cris.technion.ac.il/en/publications/the-internal-ballistics-of-airguns/), [NASA compressible-flow/orifice analysis](https://ntrs.nasa.gov/api/citations/19660020229/downloads/19660020229.pdf), [single-chamber muffler early-time model](https://www.sciencedirect.com/science/article/pii/0895717788901367), and [weak-shock silencer baffle experiment/CFD](https://www.sciencedirect.com/science/article/abs/pii/S0022460X03007946). More references and measurement requirements are in the physics plan.
