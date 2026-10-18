# graphics (native extension)

Bounded PNG decode plus the raster mechanics subset for inline images. Placement policy, rect helpers, and renderer upload validation stay in Core (`bitty-graphics` README; `src/kitty_decode.rs`, `src/kitty_raster.rs`, `src/geometry.rs`).

- Source checkout: `$BITTY_WORKSPACE/bitty-graphics` ([github.com/bitty-terminal/bitty-graphics](https://github.com/bitty-terminal/bitty-graphics))
- Crate: `bitty-graphics` (library, `src/lib.rs`)
- Maturity: the graphics host seam is merged and tested; a non-mainline packaging pilot provides packaging source and workflow, a descriptor, and pack scripts, but no built or published pilot binary is evidenced. Packaging material is not evidence of a feature-usable worker.

## Install status

> Unpublished; pilot pending — current release-readiness evidence reports no live CDN bundle or `0.0.24` release. The packaging pilot is not on the mainline branch, and no built or published pilot binary is evidenced.

Track the source checkout above. The implemented seed installer `bitty extension install bitty-graphics --version X.Y.Z` currently cannot succeed because no matching `bitty-graphics` CDN artifact is published and Core `0.0.24` is not released. The packaging source and workflow are not evidence that Core production decode/raster routing is feature-usable. Once the matching artifact and Core release are available, installation follows the standard shape:

```bash
bitty extension list   # inspect the local component inventory
# When the matching artifact and Core release are available:
# bitty extension install bitty-graphics --version X.Y.Z
```

## Lua / host surface

This crate exposes no direct `bitty.*` Lua namespace. It is Core-consumed mechanism: decode and raster math run behind Core's graphics intake, which enforces protocol, placement, and resource bounds. Lua plugins never call it directly.

## Minimal config

Native extensions take no per-extension user config file. Verify staging only:

```bash
bitty extension list
```
