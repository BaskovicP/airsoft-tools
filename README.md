# Airsoft Tools

Standalone English/Croatian tools for exploring spring-airsoft pneumatic timing. Open `index.html` directly—no server, account, network access or runtime dependencies are required. The first screen is a tool menu; the pneumatic timing lab is its first tool.

## Physics model v3.1

The lab now solves connected cylinder and behind-BB gas volumes with mass/energy accounting, compressible reversible flow, head/airbrake restriction, spring force, signed piston/BB motion, leakage and post-exit discharge. It exposes integration/conservation diagnostics, step-refinement checks and explicit input-sensitivity scenarios.

**This is still an unvalidated lumped model, not an exact SSG10 predictor.** Numerical convergence does not establish real-world accuracy. Pressure waves, a resolved spherical BB/ahead-gas flow, detailed cup/bumper deformation and structural acoustics are not implemented. See [model equations, limitations and validation](docs/MODEL.md) and the [original physics accuracy plan](docs/PHYSICS_ACCURACY_PLAN.md).

### Geometry and mechanics

- Fixed cylinder bore; stroke changes swept volume without resizing the cylinder.
- Head receiving-bore and downstream nozzle diameters/lengths.
- Airbrake projection, shaft diameter, tip diameter and taper; dynamic overlap, clearance and pin displacement.
- Cylinder residual and downstream storage volumes (each cavity counted once).
- Any piston mass from 5–300 g; quick buttons for 58, 65, 68, 72, 76 and 82 g.
- Spring stiffness/preload or a user-entered force/compression curve. M110–M220 are identity labels only, not hidden power multipliers.
- Optional spring free/installed lengths and a cut-spring estimate; derived preload, active-coil rate adjustment and known-solid-height checks.
- Seal and nozzle leakage, BB clearance leakage, hop release/moving resistance, seal friction, approximate bumper restitution, optional spring effective mass, heat exchange, air temperature and pressure.

AMP / Tridos Ultimate is the user's identified assembly; Scorpion remains a separate identity option. AMP pin selections do not invent dimensions. The Tridos listing says nominal 71 g, while AMP lists 69 g without a brake / 72 g with its longest pin. Weigh the actual assembly. Current 4 mm head / 3.8 mm pin example dimensions are **not verified AMP specifications**.

Platform starting points include SSG10, a forward-cocked-position −20 mm short-stroke comparison, TAC-41P/Lite Sport, SRS A2 16/22-inch, VSR-10 Pro/G-Spec and APS2/L96. Internal dimensions remain editable assumptions unless measured. Short stroking with a front stop or changed spring/piston geometry requires entering the corresponding actual measurements.

### Spring length and cutting

Open **Spring length, cutting & mechanical losses** and enable **Calculate from spring lengths / simulate cutting**. Enter unloaded length, the distance between the spring seats with the piston at front contact (already including spacers), and the axial free-length reduction from cutting. Length mode replaces direct preload; it does not add a second preload. No real spring lengths are supplied as defaults.

For a hypothetical cut, also enter original and removed **active** coils. The model reduces free length while estimating the higher rate of the shorter active section; it does not assume that output energy scales with spring length. The panel shows resulting length, front/cocked compression and force, stiffness and available spring work. Live force/compression appear beneath the animation, and the new force law feeds the existing pressure, velocity, impact and discharge calculations.

The estimate assumes uniform linear active coils with unchanged wire, diameter and end support. Count changes are independent inputs, not inferred from free length. Progressive coils or modified ends need a new measured force curve. Enter the remaining spring mass separately. Optional remaining solid height allows rejecting coil-bound geometry; zero means **coil bind not checked**. Slack/unseating is not simulated. None of these checks certifies a real modification as safe or compatible.

A pre-cut measured curve cannot be reused for a hypothetical cut. For an already cut and measured spring, use its **current** free length, mass and curve with cut/removal set to zero. Hypothetical cut estimates are not eligible for chrono fitting. Spring length/cut choices join the optimizer when length mode is enabled and the spring is unlocked; solid height remains a fixed constraint, not an optimization variable. The optimizer still preserves 95–105% of starting predicted energy.

### Animation and outputs

The animation uses solver states, independent cylinder/BB pressure colors and signed arrows. Three graphs show both pressures, piston velocity and BB velocity, including negative values.

Clickable events show entry, initial deceleration, a user-defined substantial-deceleration threshold after entry, the selected share of maximum pre-exit BB energy (95% by default), BB exit, rebound and contact. A deceleration after entry is not automatically caused entirely by the airbrake. The no-pin comparison keeps piston mass fixed but changes occupied gas volume.

Missing exits and contacts remain unavailable. A timeout does not become muzzle velocity or a soft impact. The useful-energy timing goal is unavailable until an exit occurs.

Contact speed/kinetic energy and muzzle pressure/gas inventory/discharge replace arbitrary 0–100 sound indices. They are conditional model quantities—not peak impact force, perceived loudness, exact real-world Joules or dB.

### Calibration and data

- The supplied 0.46 g / 330 fps observation starts as reference-only with an unknown setup; its ≈2.327 J is derived, not an independent measurement.
- Record individual shots with setup snapshots, notes, chrono uncertainty and training/held-out/reference roles.
- Explicitly confirm the shot's setup and independently measured geometry/masses and spring data before fitting.
- Fit only one shared bounded head discharge coefficient. Repeats improve repeatability information, not the number of identifiable parameters.
- Report training and held-out errors, parameter-bound/weak-constraint warnings, and export the fit profile/residuals.
- Preserve old v2 records as unverified references and discard old fitted coefficients.
- Preserve complete v3.0 setup snapshots/roles when adding inactive length defaults; retain their original solver version and exclude them from new fits. Original snapshots remain in exports.
- JSON import/export; full setup and shot-trace export; local storage only.
- Limits: 2,000 records and 32 distinct configurations per fit. Export a backup before deleting measurements.

### Freeze parts and optimize

Use **Freeze parts & optimize** above the results. Checked groups stay fixed: cylinder, barrel, head/nozzle, piston, airbrake, spring and BB. Enter discrete values for unlocked hardware, using comma-separated numbers and decimal dots. The current value is always included. Example masses and pin lengths are hypothetical alternatives, not a catalog of compatible AMP parts.

The optimizer preserves **95–105% of the starting setup's predicted BB exit energy**. Weather, fitted flow/leakage, friction, damping and timing criteria never vary. All candidates are observed with the same 250 ms time limit; missing contact or incomplete discharge never counts as zero noise.

The shortlist balances first-contact piston energy, peak muzzle flow, exit pressure and spring-to-BB energy efficiency. It retains non-dominated tradeoffs, then uses disclosed ranking weights for balanced, sound-biased or efficiency-biased preferences. It is a **best-found model comparison**, not a claim of lowest real-world dB. Search coverage, exclusions and any worsening relative to the reference are shown.

Searches are deterministic and capped at 60/120/240 combinations, can be cancelled, and do not change the live setup. **Apply & replay** rechecks a candidate, preserves frozen hardware and environmental/loss inputs, marks changed hardware as unmeasured and extends the display's observation limit to 250 ms. Actual chrono records are untouched. Setup or search changes invalidate old results. Search snapshots, locks, metrics and ranking weights can be exported.

## Source and tests

`index.html` is generated but checked in so it opens standalone. Edit these sources, not its generated inline bundle:

- `src/page.html`: shared page shell/styles;
- `src/physics.js`: pure solver, also loadable by Node;
- `src/calibration.js`: record validation, migration and one-parameter fitting;
- `src/optimizer.js`: hardware-only search, locks, eligibility and tradeoff ranking;
- `src/app.js`: bilingual controls, canvas animation, graphs and data UI.

Run:

```sh
npm run build
npm test
npm run package:cloudflare
```

There are no npm dependencies to install. Tests cover geometry/work invariants, flow/choking/laminar limits, invalid setups, missing events, rebound and BB deceleration, leakage/heat accounting, timestep refinement, synthetic calibration, migration and standalone/build parity. Tests are numerical/source checks, not browser visual QA or experimental validation.

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

Physics methods: [Do Duc et al., internal ballistics](https://cris.technion.ac.il/en/publications/the-internal-ballistics-of-airguns/), [NASA compressible flow](https://www.grc.nasa.gov/www/k-12/airplane/mflchk.html). More references and measurement requirements are in the physics plan.
