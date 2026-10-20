# tailwatcher.org

The project website for [TailWatcher](https://github.com/RogerUp-Labs/tailwatcher), served by GitHub Pages at <https://tailwatcher.org> (see `CNAME`).

Plain static files, no build step:

| File | What it is |
|---|---|
| `index.html` | Front page: hero, departures board, features, how it works, trips, text commands, screenshots, install, FAQ, contributing |
| `docs.html` | User guide. `assets/docs.js` renders the app's `instructions.md` (fetched from the main repo, falling back to the copy in `docs/guide.md`) with the same Markdown subset as the in-app ? Help, so section links like `docs.html#text-commands` match the app |
| `changelog.html` | "Flight log": every release from `startos/versions`, newest first |
| `404.html` | Not-found page (absolute paths, since GitHub Pages serves it at any URL) |
| `assets/site.css`, `assets/site.js` | Styles and the small animations (lock-screen alerts, split-flap board, chat demo, screenshot tabs). Everything respects `prefers-reduced-motion` |
| `assets/logo.svg`, `icon.svg` | The TW tail logo, same file as the app's `icon.svg` |
| `assets/img/` | Dashboard screenshots (rendered from the real Web UI with sample data) and the social share image `og.png` |
| `.nojekyll` | Serve files as-is (otherwise Pages would turn `docs/guide.md` into HTML) |

## Preview locally

```sh
python3 -m http.server 8000
```

then open <http://localhost:8000>.

## Keeping it current

- **New release:** add a row at the top of `changelog.html` (copy the release notes from `startos/versions/vX.Y.Z.ts`), and move the `CURRENT` status to it.
- **Guide changes:** the docs page reads `instructions.md` from the main repo's `main` branch once that repo is public. Until then, copy the latest `instructions.md` over `docs/guide.md`.
- **Screenshots:** render the app's `app/web/index.html` with sample data for `/api/state` at 1280×860 (desktop) and 390×844 (phone), 2× scale, in both themes, and save as WebP.
