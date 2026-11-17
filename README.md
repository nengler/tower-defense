# tower-defense

A tower defense game built on [tse](https://github.com/nengler/tse). Started from the engine's
`menu` template (a title screen, settings and a pause menu).

## Setup

Needs Node 22.18 or newer, on Linux x64 (glibc 2.38 or newer), macOS (Intel or Apple silicon) or Windows x64: the engine ships native
binaries for each.

```sh
npm install      # the engine's packs, from its GitHub release (see package.json)
npm run check    # compile, type-check, tests, and a scripted run under Node and the Rust host
npm run dev      # play in a window with hot reload
npm run package  # dist/tower-defense/: the packaged game
```

## Updating the engine

The `@tsengine/*` dependencies point at one engine release, e.g. `.../releases/download/v0.3.0/tsengine-runtime-0.3.0.tgz`. To move to
a newer one, change the version in every `@tsengine/*` URL together (each pack depends on the others at its own version), then
`npm install && npm run check`.
