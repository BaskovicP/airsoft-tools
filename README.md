# Airsoft Tools

A standalone, single-file interactive explainer for comparing cylinder, barrel, piston, BB and airbrake timing across spring-powered airsoft sniper configurations.

The interface can be switched between English and Croatian. The selected language is remembered locally in the browser.

The app opens on an Airsoft Tools menu. The pneumatic timing lab is the first available tool, and the menu is structured so additional tools can be added later without changing the lab itself. The lab includes an **All tools** control for returning to the menu.

## Rifle and configuration presets

The selector includes these starting configurations:

- SSG10 reference and a derived 20 mm short-stroke comparison;
- TAC-41P and TAC-41 Lite Sport;
- SRS A2 16-inch and 22-inch;
- VSR-10 Pro/clone and G-Spec baselines;
- a generic APS2/L96 baseline;
- Custom, selected automatically whenever a control is changed.

Published barrel and volume geometry is identified in the preset notes. Internal stroke, piston mass, airbrake state, and generic-platform values that are not established by published specifications are deliberately labeled as editable assumptions. Selecting a preset with no configured airbrake hides the airbrake event instead of presenting an invented braking time.

Selecting an SSG10 configuration also enables an SSG10 spring selector from M110 through M220. Manufacturer reference energies are shown for context, while the simulation uses their relative 0.20 g energy ratio against M150 as a heuristic drive multiplier. These values are not treated as exact output predictions, and chrono calibration records the selected spring with each measurement.

## Extended physics controls

Piston mass is continuously adjustable from 5 g to 300 g in 0.1 g increments; the quick mass buttons remain available as shortcuts. The advanced panel also models:

- spring preload and spring condition;
- piston friction, seal efficiency, cylinder-head/nozzle dead volume, and nozzle flow efficiency/pressure response;
- compression exponent and a separate chamber-to-barrel pressure response;
- actual BB diameter, hop/bucking breakaway force, moving barrel drag, and BB air-transfer efficiency;
- ambient pressure and air temperature effects on pressure and flow timing.

Every advanced input updates the shot calculation, animation, graphs, impact/blast indices, and timing metrics. A live influence panel compares the current result with the same geometry, masses, spring, and airbrake under baseline advanced assumptions. Calibration snapshots preserve all advanced inputs.

Published references: [SSG10 barrel](https://us.novritsch.com/product/ssg10-precision-inner-barrel-standard/), [SSG10 spring chart](https://us.novritsch.com/product/ssg-spring/), [TAC-41P](https://www.silverback-airsoft.com/t41p), [TAC-41 Lite Sport](https://www.silverback-airsoft.com/t41ls), [SRS A2 16-inch](https://www.silverback-airsoft.com/blt-13), [SRS 22-inch barrel](https://www.silverback-airsoft.com/ibl-a578), and [VSR-10 G-Spec](https://www.tokyo-marui.co.jp/products/aircocking/boltaction/73).

## Run the standalone app locally

Open `index.html` directly in a modern browser. No build, package install, network connection or web server is required.

If the browser restricts local storage on `file://` pages, serve the folder locally instead:

```sh
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000`.

## Cloudflare deployment

The repository includes the same Cloudflare-ready pattern as the Spiritual Progress Questionnaire project:

- `dist/` contains deployment-ready static assets;
- `wrangler.jsonc` deploys `dist/` through Cloudflare Workers Static Assets;
- `dist/_headers` applies restrictive security and privacy headers;
- `airsoft-tools-cloudflare.zip` is ready for drag-and-drop upload;
- `.openai/hosting.json` identifies `dist/` as the static output directory.

The root `index.html` remains a standalone single-file version. The build separates its inline CSS and JavaScript into `dist/styles.css` and `dist/app.js`, allowing Cloudflare to use a stricter script policy without changing the local version.

Rebuild the deployment output after changing `index.html`:

```sh
npm run build
```

Rebuild both `dist/` and the direct-upload ZIP:

```sh
npm run package:cloudflare
```

### Cloudflare Workers with Git integration

Connect the GitHub repository in **Workers & Pages → Create application → Import a repository** and use:

- Production branch: `master`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Non-production branch deploy command: `npx wrangler versions upload`
- Root directory: `/`

The Worker name in `wrangler.jsonc` is `airsoft-tools`.

### Cloudflare Pages with Git integration

Alternatively, create a Pages project connected to the repository and use:

- Production branch: `master`
- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`

### Direct upload

Upload `airsoft-tools-cloudflare.zip` through **Workers & Pages → Create application → Get started → Drag and drop your files**. The archive contains `index.html`, `styles.css`, `app.js`, `_headers`, and `.assetsignore` at its root.

To preview the generated Cloudflare build locally:

```sh
python3 -m http.server 4173 --directory dist
```

## Model boundary

The app separates direct geometry calculations, conditional physics-model outputs, heuristic comparison indices, and unknown or fitted parameters. It is not a replacement for a chronograph, pressure instrumentation, acoustic measurement or safe mechanical inspection. Calibration measurements are stored only in the browser's local storage.
