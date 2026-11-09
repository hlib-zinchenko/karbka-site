# karbka.com

The landing page for [Karbka](https://app.karbka.com/), the offline flashcards app ([source](https://github.com/hlib-zinchenko/karbka)).

Plain static files, no build step: `index.html` (English), `ua/index.html` (Ukrainian, keep it in step with the English page), `404.html`, `styles.css`, `site.js`, self-hosted fonts in `fonts/` and the app's screenshots in `img/`. GitHub Pages serves the repository root at https://karbka.com/ (`CNAME`).

Preview locally (paths are root-absolute, so serve the folder as the root):

```bash
python3 -m http.server 5200
```

## Design

The palette, fonts (Murecho for headings, Onest for text) and the pressed-tile style come from the app's light theme (`src/app.css` in the app repo); keep them in step with it. Every colour and font is a token at the top of `styles.css`. The hero deck in `site.js` is a small working sample of the app's swipe: Know carves a notch in the tally stick, Don't know puts the card back at a random spot.

Screenshots are the app's README set (`docs/screenshots/` in the app repo, made by `npm run screenshots`), converted to WebP:

```bash
cwebp -q 82 ../flashcards-pwa/docs/screenshots/test-swipe.png -o img/test-swipe.webp
```

## SEO

Each page's `<head>` has the description, canonical and `hreflang` links (English is `x-default`), Open Graph and Twitter tags, and a JSON-LD graph: `WebSite`, `WebPage`, the app (`SoftwareApplication`), its `SoftwareSourceCode` and the author. Change the two pages together. `sitemap.xml` lists both pages with their images; bump `lastmod` (and `dateModified` in the JSON-LD) when the copy changes. `llms.txt` describes the app for AI crawlers; update it with the app's features.

The link previews `img/og-image.png` and `img/og-image-uk.png` (1200×630) are rendered from `og/card.html` with the local server running:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=3000 --screenshot="$PWD/img/og-image.png" "http://localhost:5200/og/card.html"
"$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=3000 --screenshot="$PWD/img/og-image-uk.png" "http://localhost:5200/og/card.html#uk"
```
