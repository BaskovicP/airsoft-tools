# SSG10 Pneumatic Timing Lab

A standalone, single-file interactive explainer for comparing SSG10 cylinder, barrel, piston, BB and airbrake timing.

The interface can be switched between English and Croatian. The selected language is remembered locally in the browser.

## Run locally

Open `index.html` directly in a modern browser. No build, package install, network connection or web server is required.

If the browser restricts local storage on `file://` pages, serve the folder locally instead:

```sh
python3 -m http.server 8000
```

Then open `http://127.0.0.1:8000`.

## Model boundary

The app separates direct geometry calculations, conditional physics-model outputs, heuristic comparison indices, and unknown or fitted parameters. It is not a replacement for a chronograph, pressure instrumentation, acoustic measurement or safe mechanical inspection. Calibration measurements are stored only in the browser's local storage.
