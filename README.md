# NovaWeb

A responsive landing page for a fictional independent digital studio, built with HTML, CSS, and vanilla JavaScript.

The design uses a dark editorial cover, oversized typography, and a layered project showcase. Cobalt, lime, lavender, and apricot sections give each part of the page its own rhythm. Fonts and illustrated brand concepts are served locally.

## Getting started

Run a static server from the project directory:

```sh
python3 -m http.server 8000
```

Open port 8000 in your browser. On Windows, use `py -m http.server 8000` if needed. VS Code's Live Server also works.

The website has no build step or runtime dependencies. Fonts, illustrations, and icons are served locally.

## Project structure

```text
landing-page-project/
├── index.html
├── styles.css
├── script.js
├── favicon.svg
├── assets/
│   ├── fonts/
│   └── images/
├── tests/
│   └── smoke.test.cjs
├── package.json
└── package-lock.json
```

`index.html` contains the page structure and content. `styles.css` groups shared design tokens, component styles, and responsive adjustments. `script.js` handles the mobile navigation, active section indicator, and scroll reveals.

## Features

- Responsive layouts for mobile, tablet, and desktop.
- Header with Home, About, Services, and Contact navigation.
- Hero, three service cards, selected work, project process, two testimonials, and contact footer.
- Mobile menu with keyboard support, Escape dismissal, outside-click handling, and focus management.
- Native smooth scrolling and reduced-motion support.
- Visible focus indicators, skip link, semantic landmarks, and image descriptions.
- Content and navigation available without JavaScript.

The mobile navigation breakpoint is 760px. Update both the CSS media query and the `matchMedia` value in `script.js` when changing it.

## Development checks

Requires Node.js 22+ and Python 3. Development dependencies are pinned in `package-lock.json`.

```sh
npm ci
npx playwright install chromium
npm run check
npm test
```

`npm run check` validates HTML, JavaScript syntax, and formatting. `npm test` runs browser checks for responsive layouts, navigation, focus, reduced motion, asset loading, and automated accessibility rules. The suite starts a temporary server on port 4173 and stops it when finished.

On Linux, an existing `/usr/bin/chromium` is detected automatically. Use `BROWSER_EXECUTABLE` to specify another Chromium path and `PYTHON` to select a different Python command. The browser download can be skipped when a compatible browser is already available.

Use `npm run format` to apply the shared formatting style. Automated accessibility checks complement manual keyboard, browser, and assistive-technology testing.

## Deployment

For GitHub Pages, place `index.html` at the repository root. In **Settings → Pages**, select **Deploy from a branch**, choose `main` and **/(root)**, then save.

The same files can be served by any static host. No build command is required. Keep `assets/` alongside the HTML, CSS, and JavaScript files. Development dependencies do not need to be deployed.

## Assets and content

DM Sans and Instrument Serif are distributed under the SIL Open Font License. Their license files are included in `assets/fonts/`. The SVG illustrations and interface icons are included in the source.

NovaWeb, the sample brands, and the testimonials are fictional. The email address is a demonstration address; social links lead to platform homepages. There is no contact backend or payment service.
