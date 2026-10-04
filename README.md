# thxrul.github.io

A static personal site built with HTML, CSS, and JavaScript. No dependencies, build step, server-side code, or API keys are required.

## Local development

From the repository root:

```sh
python3 -m http.server 8000
```

The dot matrix responds to the pointer and pulls harder while pressed. Each social section animates into view on scroll. Reduced-motion preferences disable these animations by default; the on-page animation button can explicitly enable them. Touch and mouse input both interact with the dots, and a subtle ambient wave keeps the grid moving. All links and content remain available without JavaScript. The remote GitHub portrait falls back to a monogram if it cannot load.

## GitHub Pages

Commit and push the site files to `main`. In the repository's **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/ (root)**, then save. GitHub Pages serves `index.html` directly. CSS and JavaScript use relative paths, so the site also works under a project subdirectory.

Twitter and YouTube retain their original destinations and appear as plain links in their own sections. Update their `href` attributes in `index.html` if you want to point them at specific profiles.
