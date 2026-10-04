# thxrul.github.io

A static personal site built with HTML, CSS, and JavaScript. No dependencies, build step, server-side code, or API keys are required.

## Local development

From the repository root:

```sh
python3 -m http.server 8000
```

The dot matrix responds to the pointer and pulls harder while pressed. Each social section animates into view on scroll. Reduced-motion preferences disable these animations; all links and content remain available without JavaScript. The remote GitHub portrait falls back to a monogram if it cannot load.

## GitHub Pages

Commit and push the site files to `main`. In the repository's **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/ (root)**, then save. GitHub Pages serves `index.html` directly. CSS and JavaScript use relative paths, so the site also works under a project subdirectory.

The Twitter link opens the platform homepage, and YouTube retains its original video destination. Update their `href` attributes in `index.html` if you want to point them at specific profiles.
