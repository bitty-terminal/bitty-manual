# graphics (native extension)

Bounded PNG decode plus the raster mechanics subset for inline images. Placement policy, rect helpers, and renderer upload validation stay in Core (`bitty-graphics` README; `src/kitty_decode.rs`, `src/kitty_raster.rs`, `src/geometry.rs`).

- Source checkout: `$BITTY_WORKSPACE/bitty-graphics` ([github.com/bitty-terminal/bitty-graphics](https://github.com/bitty-terminal/bitty-graphics))
- Crate: `bitty-graphics` (library, `src/lib.rs`)
- Maturity: the graphics host seam is merged and tested; `bitty-graphics` remains a library crate with no implemented worker executable or native-component descriptor. Packaging material from a non-mainline pilot is not evidence of a feature-usable worker.

## Install status

> Not an installable native component — no worker executable, `bitty-component.toml`, `v0.0.24` tag, or CDN bundle is evidenced. The packaging pilot is not on the mainline branch, and no built or published pilot binary is evidenced.

Track the source checkout above. There is no graphics worker binary for `bitty extension add` or `bitty extension install`; the implemented installer requires a published native component artifact, and this library does not provide one. The graphics host seam and library tests are not evidence that a separately installed worker or production worker routing exists. Core retains protocol intake, placement, resource policy, and renderer upload validation.

```bash
bitty extension list   # inspect the local component inventory
```

## Lua / host surface

This crate exposes no direct `bitty.*` Lua namespace. It is Core-consumed mechanism: decode and raster math run behind Core's graphics intake, which enforces protocol, placement, and resource bounds. Lua plugins never call it directly.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
