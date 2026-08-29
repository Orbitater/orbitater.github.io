# ORBITATER

`$TATER` on Solana.

An orbit is not hovering. It is a fall that never lands, because the ground
curves away faster than you drop. He has been falling at 7.66 kilometres a
second since he got up there and has not hit anything yet.

The site is this repository, served by GitHub Pages at
**https://orbitater.github.io/**

## Not launched

There is no token yet. There is no contract address, no presale and no
allocation. Anything claiming to be `$TATER` right now is not.

When it exists, the mint address will be published here and on the site, and it
should still be checked against the chain before it is trusted, including
because it was read here.

## What is in here

```
index.html        the markup and the copy
src/style.css     one typeface, one hue
src/main.js       four small things, no framework
assets/           the render, hashed into the build
public/og-1.jpg   the link preview, copied verbatim. The number is there because X
                  caches the image as well as the card, and a fetch it once failed
                  is never retried at the same URL
favicon.svg       drawn as vector so it stays crisp
```

## Build

Vite. `npm install`, then `npm run build`, and the result lands in `dist/`.

Do not read the build output through a pipe. `npm run build | tail` will hide a
failure behind a successful `tail`, so check the exit code.

The link preview lives in `public/` for a reason. Vite rewrites the URL in an
`<img src>` and hashes the file, but it does not touch a `<meta content>`, so an
image referenced only by Open Graph tags is never copied into the build and the
link preview silently comes back empty.

## The one number that is real

The panel in the first section reads the live position of the International
Space Station from `wheretheiss.at`, which is the one thing in low earth orbit
genuinely doing what that paragraph describes. It is labelled as what it is and
it is not him.

That API allows 350 requests every five minutes and one person runs it, so the
page only asks while the panel is on screen, and a failure slows the asking
instead of knocking harder. If it cannot be reached the panel removes itself.
A readout that guesses is worse than no readout.

## No promises

No price, no target, no roadmap, no utility. Nothing here says anything will
happen.
