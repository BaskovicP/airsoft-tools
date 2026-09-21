# SSG10 Pneumatic Timing Lab

A standalone, single-file interactive explainer for comparing SSG10 cylinder, barrel, piston, BB and airbrake timing.

The interface can be switched between English and Croatian. The selected language is remembered locally in the browser.

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
