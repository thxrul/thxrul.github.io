# thxrul.github.io

## Editing project descriptions on GitHub

Edit [`projects.json`](projects.json), then commit the change to `main`. The site reads this file each visit; **you do not need to run a build** when changing project text.

Each project has a `description` array. Each quoted string becomes one paragraph in its expanded dialog:

```json
"description": [
  "Your opening paragraph.",
  "Another paragraph with more details."
]
```

You can also edit `name`, `language`, `symbol`, `status` (optional), and the GitHub `url`. Keep the `id` stable. Use normal JSON syntax: double quotes, commas between entries, and no trailing comma after the final entry. Descriptions are rendered as plain text, not HTML. A multiline string with `\n\n` between paragraphs also works.

The site no longer fetches or replaces descriptions from the GitHub repositories API. If the JSON file cannot load or contains invalid data, the last bundled copy remains available. Allow GitHub Pages to finish deploying after an edit, then reload the page.

The original static project links remain available if JavaScript is disabled.

## Project dialogs

The project section adapts **Motion Primitives, Morphing Dialog Basic Two**: a compact trigger with a shared title, subtitle, and visual expands into a scrollable detail dialog using the example's spring (`stiffness: 200`, `damping: 24`). It uses React and Motion only for the project section. Escape, outside click, close button, focus trapping, focus return, reduced motion, and background inertness are supported.

Source: https://github.com/ibelick/motion-primitives/tree/main/app/docs/morphing-dialog

The upstream MIT license is in [`src/MOTION-PRIMITIVES-LICENSE`](src/MOTION-PRIMITIVES-LICENSE).

## Changing dialog code

```sh
npm ci
npm run build
```

Commit the changed source and the resulting `assets/projects.js` and license file. The rest of the site uses plain HTML, CSS and JavaScript.
